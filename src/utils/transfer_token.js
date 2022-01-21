import { LAMPORTS_PER_SOL, SystemProgram, Transaction } from "@solana/web3.js";

import { connection } from "./index";

const createTransferTransaction = async (
  ownerPubkey, fromTokenAccountPubkey,
  toTokenAccountPubkey,tokenToTransferLamports
) => {
  let transaction = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: fromTokenAccountPubkey,
      toPubkey: toTokenAccountPubkey,
      lamports: tokenToTransferLamports
    })
  )
  transaction.feePayer = ownerPubkey
  console.log("get recent blockhash")
  transaction.recentBlockhash = (await connection.getRecentBlockhash()).blockhash
  return transaction
}

export const transferCustomToken =
  async (
    provider, connection, tokenToTransfer,
    fromTokenAccountPubkey, toTokenAccountPubkey
  ) => {
    if(tokenToTransfer <= 0) {
      return {
        status: false,
        error: "u can't transfer, token need to transfer should be greater than 0."
      }
    }
    const token_to_transfer_lamports = tokenToTransfer * LAMPORTS_PER_SOL;
    const transaction = await createTransferTransaction(
      provider.publicKey,
      fromTokenAccountPubkey, toTokenAccountPubkey,
      token_to_transfer_lamports
    )
    if(transaction) {
      try {
        let signed = await provider.signTransaction(transaction)
        console.log("got signature, submitting transaction")

        let signature = await connection.sendRawTransaction(signed.serialize())
        await connection.confirmTransaction(signature)
        console.log("transaction " + signature + " confirmed")

        return {
          status: false,
          signature
        }
      }
      catch (e) {
        console.warn(e)
        console.log("Error: " + e.message)
        return {
          status: false,
          error: e.message
        }
      }
    }
  }