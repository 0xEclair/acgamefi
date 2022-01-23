import { PublicKey } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";

const SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID =
  new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL",)
const METADATA_PROGRAM_ID =
  "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
const MEMO_ID =
  new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr",);
export const program_ids = {
  token: TOKEN_PROGRAM_ID,
  associated: SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID,
  metadata: METADATA_PROGRAM_ID,
  memo: MEMO_ID
}

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))

export const AR_SOL_HOLDER_ID =
  new PublicKey("HvwC9QSAzvGXhhVrgPmauVwFWcYZhne3hVot9EbHuFTm")
export const METADATA_PREFIX = "metadata"
export const EDITION = "edition"
export const EDITION_MARKER_BIT_SIZE = 248
export const DEFAULT_TIMEOUT = 15000
export const RESERVED_TXN_MANIFEST = "manifest.json"
export const MetadataKey = {
  Uninitialized: 0,
  MetadataV1: 4,
  EditionV1: 1,
  MasterEditionV1: 2,
  MasterEditionV2: 6,
  EditionMarker: 7
}