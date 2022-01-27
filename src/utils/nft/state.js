import { AR_SOL_HOLDER_ID, EDITION, METADATA_PREFIX, MetadataKey, program_ids } from "./constant";
import { PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY, TransactionInstruction } from "@solana/web3.js";
import * as crypto from "crypto";
import { serialize } from "borsh";

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
    { pubkey: new PublicKey(updateAuthority), isSigner: true, isWritable: FALSE }
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