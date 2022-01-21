import { useEffect, useState } from "react";

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