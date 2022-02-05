import { useEffect, useState } from "react";
import { clusterApiUrl, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import domToImage from "dom-to-image";
import { checkWallet } from "./utils";
import { mintNFT } from "./utils/nft";
import { Creator, data_url_to_file } from "./utils/nft/state";

const NETWORK = clusterApiUrl("devnet");
let lamportsRequiredToPlay = 0.1 * LAMPORTS_PER_SOL;
const gameWalletPublicKey = new PublicKey(
  "62AtDMhgaW1YQZCxv7hGBE7HDTU67L71vs4VQrRVBq3p"
);

const generateNFT = async () => {
  await checkWallet(true)
  const convertDOMtoBase64 = async () => {
    const node = document.getElementById("gameNFT")
    return domToImage.toPng(node)
  }
  const provider = window.solana
  const img = await convertDOMtoBase64()
  const template_image = data_url_to_file(img, "GameTemplate.png")

  const self_creator = new Creator({
    address: new PublicKey(provider.publicKey).toBase58(),
    verified: true,
    share: 100
  })
  const md = {
    name: `1`,
    symbol: "MNFT",
    creators: [self_creator],
    description: "hello nft",
    sellerFeeBasisPoints: 0,
    image: template_image.name,
    animation_url: "",
    external_url: "",
    properties: {
      files: [template_image],
      category: "image"
    }
  }
  // update progress inside mint nft
  try {
    await mintNFT(provider, {}, [template_image], md)
  }
  catch (e) {
    console.log(e)
  }
}

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
      <div className="w-1/2 px-10 py-10" id="gameNFT" >
        <div
          className="relative h-full rounded-lg text-center border-4 border-white flex justify-around flex-col py-7 nftImage"
          style={{
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            'backgroundSize': '500px 358px',
            overflow:"hidden",
          }}
        >
          <div className="absolute w-full h-full opacity-80 bg-gray-900 z-0"></div>
          <h1 className="text-white font-extrabold text-2xl" style={{    marginTop: '-55px', color:"white"}}>
            Solgames NFT
          </h1>
          <div className="relative z-10 score-Wrapper">
            <h1 className="text-white text-2xl font-normal nftTextWrapper">
              <div style={{textAlign:"right"}} className="nftLeftText" className="nftLeftText" style={{color:"white"}}>
                Played by:
              </div>
            </h1>
            <h1 className="text-white text-2xl font-normal nftTextWrapper">
              <div style={{textAlign:"right"}} className="nftLeftText" style={{color:"white"}}>
                Game score:{' '}
              </div>
            </h1>
            <h1 className="text-white text-2xl font-normal nftTextWrapper">
              <div style={{textAlign:"right"}} className="nftLeftText" style={{color:"white"}}>
                Gameplay duration:{' '}
              </div>
            </h1>
            <h1 className="text-white text-xl font-normal nftTextWrapper">
              <div style={{textAlign:"right"}} className="nftLeftText" style={{color:"white"}}>
                Game played on:{' '}
              </div>
              <div className="text-purple-300 font-bold rightText">
                {new Date().toDateString()}
              </div>
            </h1>
            <h1 className="text-white text-xl font-normal nftTextWrapper">
              <div style={{textAlign:"right"}} className="nftLeftText" style={{color:"white"}}>
                Tokens earned:{' '}
              </div>

            </h1>
          </div>
        </div>
      </div>
      <div onClick={() => {
        generateNFT()
      }}>
        Hello
      </div>
    </div>
  );
}

export default App;
