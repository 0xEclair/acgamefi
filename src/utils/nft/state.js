import {
  AR_SOL_HOLDER_ID,
  EDITION,
  EDITION_MARKER_BIT_SIZE,
  METADATA_PREFIX,
  MetadataKey,
  program_ids
} from "./constant";
import { PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY, TransactionInstruction } from "@solana/web3.js";
import * as crypto from "crypto";
import { serialize } from "borsh";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { transferCustomToken } from "../transfer_token";

class CreateMetadataArgs {
  instruction = 0
  data
  isMutable
  constructor(args) {
    this.data = args.data
    this.isMutable = args.isMutable
  }
}

class UpdateMetadataArgs {
  instruction = 1
  data
  updateAuthority
  primarySaleHappened
  constructor(args) {
    this.data =
      args.data?
        args.data:
        null
    this.updateAuthority =
      args.updateAuthority?
        args.updateAuthority:
        null
    this.primarySaleHappened = args.primarySaleHappened
  }
}

class CreateMasterEditionArgs {
  instruction = 10
  maxSupply
  constructor(args) {
    this.maxSupply = args.maxSupply
  }
}

class Edition {
  key
  parent
  edition
  constructor(args) {
    this.key = MetadataKey.EditionV1
    this.parent = args.parent
    this.edition = args.edition
  }
}

export class Creator {
  address
  verified
  share
  constructor(args) {
    this.address = args.address
    this.verified = args.verified
    this.share = args.share
  }
}

export class Data {
  name
  symbol
  uri
  sellerFeeBasisPoints
  creators
  constructor(args) {
    this.name = args.name
    this.symbol = args.symbol
    this.uri = args.uri
    this.sellerFeeBasisPoints = args.sellerFeeBasisPoints
    this.creators = args.creators
  }
}

class Metadata {
  key
  updateAuthority
  mint
  data
  primarySaleHappened
  isMutable
  editionNonce
  masterEdition
  edition
  constructor(args) {
    this.key = MetadataKey.MetadataV1;
    this.updateAuthority = args.updateAuthority;
    this.mint = args.mint;
    this.data = args.data;
    this.primarySaleHappened = args.primarySaleHappened;
    this.isMutable = args.isMutable;
    this.editionNonce = args.editionNonce;
  }
  async init() {
    const edition = await getEdition(this.mint)
    this.edition = edition
    this.masterEdition = edition
  }
}

class MintPrintingTokensArgs {
  instruction9
  supply
  constructor(args) {
    this.supply = args.supply
  }
}

class MasterEditionV1 {
  key;
  supply;
  maxSupply;
  /// Can be used to mint tokens that give one-time permission to mint a single limited edition.
  printingMint;
  /// If you don't know how many printing tokens you are going to need, but you do know
  /// you are going to need some amount in the future, you can use a token from this mint.
  /// Coming back to token metadata with one of these tokens allows you to mint (one time)
  /// any number of printing tokens you want. This is used for instance by Auction Manager
  /// with participation NFTs, where we dont know how many people will bid and need participation
  /// printing tokens to redeem, so we give it ONE of these tokens to use after the auction is over,
  /// because when the auction begins we just dont know how many printing tokens we will need,
  /// but at the end we will. At the end it then burns this token with token-metadata to
  /// get the printing tokens it needs to give to bidders. Each bidder then redeems a printing token
  /// to get their limited editions.
  oneTimePrintingAuthorizationMint;

  constructor(args) {
    this.key = MetadataKey.MasterEditionV1;
    this.supply = args.supply;
    this.maxSupply = args.maxSupply;
    this.printingMint = args.printingMint;
    this.oneTimePrintingAuthorizationMint =
      args.oneTimePrintingAuthorizationMint;
  }
}

class MasterEditionV2 {
  key;
  supply;
  maxSupply;

  constructor(args) {
    this.key = MetadataKey.MasterEditionV2;
    this.supply = args.supply;
    this.maxSupply = args.maxSupply;
  }
}

class EditionMarker {
  key;
  ledger;

  constructor(args) {
    this.key = MetadataKey.EditionMarker;
    this.ledger = args.ledger;
  }

  editionTaken(edition) {
    const editionOffset = edition % EDITION_MARKER_BIT_SIZE;
    const indexOffset = Math.floor(editionOffset / 8);

    if (indexOffset > 30) {
      throw Error('bad index for edition');
    }

    const positionInBitsetFromRight = 7 - (editionOffset % 8);

    const mask = Math.pow(2, positionInBitsetFromRight);

    const appliedMask = this.ledger[indexOffset] & mask;

    return appliedMask != 0;
  }
}

export const data_url_to_file = (dataurl, filename) => {
  let arr = dataurl.split(","),
      mime = arr[0].match(/:(.*?);/)[1],
      bstr = atob(arr[1]),
      n = bstr.length,
      u8arr = new Uint8Array(n)
  while(n--) {
    u8arr[n] = bstr.charCodeAt(n)
  }
  return new File([u8arr], filename, {type: mime})
}

// Only create a program derived account
export const findProgramAddress = async (seeds, programId) => {
  const result = await PublicKey.findProgramAddress(seeds, programId)
  return [result[0].toBase58(), result[1]]
}

const getEdition = async (mint) => {
  const program_address = await findProgramAddress(
    [
      Buffer.from(METADATA_PREFIX),
      new PublicKey(program_ids.metadata).toBuffer(),
      new PublicKey(mint).toBuffer(),
      Buffer.from(EDITION)
    ],
    new PublicKey(program_ids.metadata)
  )
  return program_address[0]
}

export const prepPayForFilesTxn = async (wallet, files, metadata) => {
  const memo = program_ids.memo
  const instructions = []
  const signers = []
  if(wallet.publicKey) {
    instructions.push(
      SystemProgram.transfer({
        fromPubkey: wallet.publicKey,
        toPubkey: AR_SOL_HOLDER_ID,
        lamports: 100000000
      })
    )
  }
  for(let i = 0; i<files.length; i++) {
    const hashSum = crypto.createHash("sha256")
    hashSum.update(await files[i].test())
    const hex = hashSum.digest("hex")
    instructions.push(
      new TransactionInstruction({
        keys:[],
        programId: memo,
        data: Buffer.from(hex)
      })
    )
  }
  return {
    instructions,
    signers
  }
}

const METADATA_SCHEMA = new Map([
  [
    CreateMetadataArgs,
    {
      kind: "struct",
      fields: [
        ["instruction", "u8"],
        ["data", Data],
        ["isMutable", "u8"], // bool
      ],
    },
  ],
  [
    UpdateMetadataArgs,
    {
      kind: "struct",
      fields: [
        ["instruction", "u8"],
        ["data", { kind: "option", type: Data }],
        ["updateAuthority", { kind: "option", type: "pubkeyAsString" }],
        ["primarySaleHappened", { kind: "option", type: "u8" }],
      ],
    },
  ],
  [
    CreateMasterEditionArgs,
    {
      kind: "struct",
      fields: [
        ["instruction", "u8"],
        ["maxSupply", { kind: "option", type: "u64" }],
      ],
    },
  ],
  [
    MintPrintingTokensArgs,
    {
      kind: "struct",
      fields: [
        ["instruction", "u8"],
        ["supply", "u64"],
      ],
    },
  ],
  [
    MasterEditionV1,
    {
      kind: "struct",
      fields: [
        ["key", "u8"],
        ["supply", "u64"],
        ["maxSupply", { kind: "option", type: "u64" }],
        ["printingMint", "pubkeyAsString"],
        ["oneTimePrintingAuthorizationMint", "pubkeyAsString"],
      ],
    },
  ],
  [
    MasterEditionV2,
    {
      kind: "struct",
      fields: [
        ["key", "u8"],
        ["supply", "u64"],
        ["maxSupply", { kind: "option", type: "u64" }],
      ],
    },
  ],
  [
    Edition,
    {
      kind: "struct",
      fields: [
        ["key", "u8"],
        ["parent", "pubkeyAsString"],
        ["edition", "u64"],
      ],
    },
  ],
  [
    Data,
    {
      kind: "struct",
      fields: [
        ["name", "string"],
        ["symbol", "string"],
        ["uri", "string"],
        ["sellerFeeBasisPoints", "u16"],
        ["creators", { kind: "option", type: [Creator] }],
      ],
    },
  ],
  [
    Creator,
    {
      kind: "struct",
      fields: [
        ["address", "pubkeyAsString"],
        ["verified", "u8"],
        ["share", "u8"],
      ],
    },
  ],
  [
    Metadata,
    {
      kind: "struct",
      fields: [
        ["key", "u8"],
        ["updateAuthority", "pubkeyAsString"],
        ["mint", "pubkeyAsString"],
        ["data", Data],
        ["primarySaleHappened", "u8"], // bool
        ["isMutable", "u8"], // bool
      ],
    },
  ],
  [
    EditionMarker,
    {
      kind: "struct",
      fields: [
        ["key", "u8"],
        ["ledger", [31]],
      ],
    },
  ],
]);

export const createMetadata = async (data, updateAuthority, mintKey, mintAuthority, instructions, payer) => {
  const metadataProgramId = program_ids.metadata
  const metadataAccount = (
    await findProgramAddress(
      [
        Buffer.from("metadata"),
        new PublicKey(metadataProgramId).toBuffer(),
        new PublicKey(mintKey).toBuffer()
      ],
      new PublicKey(metadataProgramId)
    )
  )[0]
  const value = new CreateMetadataArgs({
    data,
    isMutable: true
  })
  let txnData = Buffer.from(serialize(METADATA_SCHEMA, value))
  const keys = [
    { pubkey: new PublicKey(metadataAccount), isSigner: false, isWritable: true },
    { pubkey: new PublicKey(mintKey), isSigner: false, isWritable: false },
    { pubkey: new PublicKey(mintAuthority), isSigner: true, isWritable: false },
    { pubkey: new PublicKey(payer), isSigner: true, isWritable: false },
    { pubkey: new PublicKey(updateAuthority), isSigner: false, isWritable: false },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false }
  ]
  instructions.push(new TransactionInstruction({
    keys,
    programId: new PublicKey(metadataProgramId),
    data: txnData
  }))
  return metadataAccount
}

export const updateMetadata = async (data, newUpdateAuthority, primarySaleHappened, mintKey, updateAuthority, instructions, metadataAccount) => {
  const metadataProgramId = program_ids.metadata
  metadataAccount = metadataAccount || (
    await findProgramAddress(
      [
        Buffer.from("metadata"),
        new PublicKey(metadataProgramId).toBuffer(),
        new PublicKey(mintKey).toBuffer()
      ],
      new PublicKey(metadataProgramId)
    )
  )[0]
  const value = new UpdateMetadataArgs({
    data,
    updateAuthority: !newUpdateAuthority? undefined: newUpdateAuthority,
    primarySaleHappened: primarySaleHappened === null || primarySaleHappened === undefined?
      null:
      primarySaleHappened
  })
  const txn_data = Buffer.from(serialize(METADATA_SCHEMA, value))
  const keys = [
    { pubkey: new PublicKey(metadataAccount), isSigner: false, isWritable: true },
    { pubkey: new PublicKey(updateAuthority), isSigner: true, isWritable: false }
  ]
  instructions.push(
    new TransactionInstruction({
      keys,
      programId: new PublicKey(metadataProgramId),
      data: txn_data
    })
  )
  return metadataAccount
}

export const createMasterEdition = async (maxSupply, mintKey, updateAuthorityKey, mintAuthorityKey, payer, instructions) => {
  const metadataProgramId = program_ids.metadata
  const metadataAccount = (
    await findProgramAddress(
      [
        Buffer.from(METADATA_PREFIX),
        new PublicKey(metadataProgramId).toBuffer(),
        new PublicKey(mintKey).toBuffer()
      ],
      new PublicKey(metadataProgramId)
    )
  )[0]
  const editionAccoount = (
    await findProgramAddress(
      [
        Buffer.from(METADATA_PREFIX),
        new PublicKey(metadataProgramId).toBuffer(),
        new PublicKey(mintKey).toBuffer(),
        Buffer.from(EDITION)
      ],
      new PublicKey(metadataProgramId)
    )
  )[0]
  const pk = (str) => new PublicKey(str)
  const value = new CreateMasterEditionArgs({
    maxSupply: maxSupply || null
  })
  const data = Buffer.from(serialize(METADATA_SCHEMA, value))
  const keys = [
    { pubkey: new PublicKey(editionAccoount), isSigner: false, isWritable: true },
    { pubkey: new PublicKey(mintKey), isSigner: false, isWritable: true },
    { pubkey: new PublicKey(updateAuthorityKey), isSigner: true, isWritable: false },
    { pubkey: new PublicKey(mintAuthorityKey), isSigner: true, isWritable: false },
    { pubkey: pk(payer), isSigner: true, isWritable: false },
    { pubkey: pk(metadataAccount), isSigner: false, isWritable: false },
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false }
  ]
  instructions.push(new TransactionInstruction({
    keys,
    programId: pk(metadataProgramId),
    data
  }))
}