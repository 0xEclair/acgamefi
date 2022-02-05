import { useEffect, useState } from "react";
import { clusterApiUrl, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";

const NETWORK = clusterApiUrl("devnet");
let lamportsRequiredToPlay = 0.1 * LAMPORTS_PER_SOL;
const gameWalletPublicKey = new PublicKey(
  "62AtDMhgaW1YQZCxv7hGBE7HDTU67L71vs4VQrRVBq3p"
);

function App() {
  const [provider, setProvider] = useState()
  const [providerPubkey, setProviderPubkey] = useState()

  useEffect(() => {
    if(provider) {
      provider.on("connect", async () => {
        console.log("wallet connected", provider.publicKey)
        setProviderPubkey(provider.publicKey)
      })
      provider.on("disconnect", () => {
        console.log("wallet disconnected")
      })
    }
  }, [provider])

  useEffect(() => {
    if("solana" in window && !provider) {
      console.log("phantom wallet present")
      setProvider(window.solana)
    }
  }, [])


  return (
    <div className="App">

    </div>
  );
}

export default App;
