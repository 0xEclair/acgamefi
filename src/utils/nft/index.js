import {
  Keypair,
  PublicKey,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  Transaction,
  TransactionInstruction
} from "@solana/web3.js";
import { AccountLayout, MintLayout, Token, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { BinaryReader, BinaryWriter } from "borsh";
import base58 from "bs58"
import BN from "bn.js"

import { Data, findProgramAddress, prepPayForFilesTxn } from "./state";
import { connection } from "../index";
import { program_ids, RESERVED_TXN_MANIFEST } from "./constant";

export const extendBorsh = () => {
  BinaryReader.prototype.readPubkey = function () {
    const reader = this
    const array = reader.readFixedArray(32)
    return new PublicKey(array)
  }
  BinaryWriter.prototype.writePubkey = function (value) {
    const writer = this
    writer.writeFixedArray(value.toBuffer())
  }
  BinaryReader.prototype.readPubkeyAsString = function () {
    const reader = this
    const array = reader.readFixedArray(32)
    return base58.encode(array)
  }
  BinaryWriter.prototype.writePubkeyAsString = function (value) {
    const writer = this
    writer.writeFixedArray(base58.decode(value))
  }
}
extendBorsh()

const createAccount = (instructions, payer, amount, signers) => {
  const account = Keypair.generate()
  instructions.push(
    SystemProgram.createAccount({
      fromPubkey: payer,
      newAccountPubkey: account.publicKey,
      lamports: amount,
      space: AccountLayout.span,
      programId: TOKEN_PROGRAM_ID
    })
  )
  signers.push(account)
  return account.publicKey
}

const createMintAccount = (instructions, payer, amount, signers) => {
  const account = Keypair.generate()
  instructions.push(
    SystemProgram.createAccount({
      fromPubkey: payer,
      newAccountPubkey: account.publicKey,
      lamports: amount,
      space: MintLayout.span,
      programId: TOKEN_PROGRAM_ID
    })
  )
  signers.push(account)
  return account.publicKey
}

const createMint =
  (instructions, payer, mintRentExempt,
   decimals, owner, freezeAuthority, signers) => {
  const account = createMintAccount(
    instructions, payer, mintRentExempt, signers
  )
  instructions.push(
    Token.createInitMintInstruction(
      TOKEN_PROGRAM_ID,
      account,
      decimals,
      owner,
      freezeAuthority
    )
  )
  return account
}

export const mintNFT = async (provider,env,files,metadata) => {
  const wallet = provider
  const metadataContent = {
    name: metadata.name,
    symbol: metadata.symbol,
    description: metadata.description,
    sellerFeeBasisPoints: metadata.sellerFeeBasisPoints,
    image: metadata.image,
    animation_url: metadata.animation_url,
    external_url: metadata.external_url,
    properties: {
      ...metadata.properties,
      creators: metadata.creators.map((creator) => {
        return {
          address: creator.address,
          share: creator.share
        }
      })
    }
  }
  const realFiles = [
    ...files,
    new File([JSON.stringify(metadataContent)], "metadata.json")
  ]
  const {
    instructions:pushInstructions,
    signers: pushSigners
  } = await prepPayForFilesTxn(wallet, realFiles, metadata)

  const mintRent = await connection.getMinimumBalanceForRentExemption(MintLayout.span)
  const payerPublicKey = wallet.publicKey.toBase58()
  const instructions = [...pushInstructions]
  const signers = [...pushSigners]
  const mintKey = createMint(
    instructions,
    wallet.publicKey,
    mintRent,
    0,
    new PublicKey(payerPublicKey),
    new PublicKey(payerPublicKey),
    signers
  ).toBase58()
  const recipientKey =
    (await findProgramAddress(
      [
        wallet.publicKey.toBuffer(),
        program_ids.token.toBuffer(),
        new PublicKey(mintKey).toBuffer()
      ],
      program_ids.associated
    ))[0]
  createAssociatedTokenAccountInstruction(
    instructions, new PublicKey(recipientKey),
    wallet.publicKey, wallet.publicKey,
    new PublicKey(mintKey)
  )
  const class_data = new Data({
    symbol: metadata.symbol,
    name: metadata.name,
    uri: " ".repeat(64),
    sellerFeeBasisPoints: metadata.sellerFeeBasisPoints,
    creators: metadata.creators
  })
  const metadata_account = await createMetadata(
    class_data, payerPublicKey, mintKey, payerPublicKey, instructions, wallet.publicKey.toBase58()
  )
  const { txid } = await sendTransactionWithRetry(wallet, instructions, signers)
  try {
    // return
    await connection.confirmTransaction(txid, "max")
  }
  catch {
    // ignore
  }
  await connection.getParsedConfirmedTransaction(txid, "confirmed")
  const data = new FormData()

  const tags = realFiles.reduce((acc, f) => {
    acc[f.name] = [{name: "mint", value: mintKey}]
    return acc
  }, {})
  data.append("tags", JSON.stringify(tags))
  data.append("transaction", txid)
  realFiles.map((f) => data.append("file[]", f))

  const result = await (
    await fetch(
      "https://us-central1-principal-lane-200702.cloudfunctions.net/uploadFile2",
      {method: "POST", body: data}
    )
  ).json()

  const metadata_file = result.message?.find((m) => m.filename === RESERVED_TXN_MANIFEST)
  let arweave_link = ""
  if(metadata_file?.transactionId) {
    const update_instructions = []
    const update_signers = []
    arweave_link = `https://arweave.net/${metadata_file.transactionId}`
    await updateMetadata(
      new Data({
        name: metadata.name,
        symbol: metadata.symbol,
        uri: arweave_link,
        creators: metadata.creators,
        sellerFeeBasisPoints: metadata.sellerFeeBasisPoints
      }),
      undefined, undefined,
      mintKey, payerPublicKey,
      update_instructions, metadata_account
    )
    update_instructions.push(
      Token.createMintToInstruction(
        TOKEN_PROGRAM_ID,
        new PublicKey(mintKey),
        new PublicKey(recipientKey),
        new PublicKey(payerPublicKey),
        [],
        1
      )
    )
    await createMasterEdition(
      new BN(1),
      mintKey,
      payerPublicKey,
      payerPublicKey,
      payerPublicKey,
      update_instructions
    )
    await sendTransactionWithRetry(
      wallet, update_instructions, update_signers
    )
  }
  return {
    metadataAccount: metadata_account,
    arweaveLink: arweave_link,
    mintKey,
    account: recipientKey
  }
}

const createAssociatedTokenAccountInstruction =
  (instructions, associatedTokenAddress,
   payer, walletAddress,
   tokenMintAddress
  ) => {
    const keys = [
      { pubkey: payer, isSigner: true, isWritable: true },
      { pubkey: associatedTokenAddress, isSigner: false, isWritable: true },
      { pubkey: walletAddress, isSigner: false, isWritable: false },
      { pubkey: tokenMintAddress, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false }
    ]
    instructions.push(
      new TransactionInstruction({
        keys,
        programId: program_ids.associated,
        data: Buffer.from([])
      })
    )
  }

const sendTransactionWithRetry = async (wallet, instructions, signers, commitment = "singleGossip", includesFeePayer = false, block, beforeSend) => {
  let transaction = new Transaction()
  instructions.forEach((ins) => transaction.add(ins))
  transaction.recentBlockhash =
    (block || (await connection.getRecentBlockhash(commitment))).blockhash
  if(includesFeePayer) {
    transaction.setSigners(...signers.map((s) => s.publicKey))
  }
  else {
    transaction.setSigners(wallet.publicKey, ...signers.map((s) => s.publicKey))
  }
  if(signers.length > 0) {
    transaction.partialSign(...signers)
  }
  if(!includesFeePayer) {
    transaction = await wallet.signTransaction(transaction)
  }
  if(beforeSend) {
    beforeSend()
  }
  const { txid, slot } = await sendSignedTransaction({
    connection,
    signedTransaction: transaction
  })
  return { txid, slot }
}

const awaitTransactionSignatureConfirmation = () => {

}