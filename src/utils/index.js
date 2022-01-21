import { clusterApiUrl, Connection } from "@solana/web3.js";

const NETWORK = clusterApiUrl("devnet")
export const connection = new Connection(NETWORK, "confirmed")

export const checkWallet = (connect_to_wallet) => {
  if("solana" in window) {
    const provider = window.solana
    if(connect_to_wallet && !window.solana.isConnected) {
      window.solana.connect()
    }
    if(provider.isPhantom) {
      return provider
    }
  }
  else if(connect_to_wallet) {
    alert("please install phantom wallet")
  }
}