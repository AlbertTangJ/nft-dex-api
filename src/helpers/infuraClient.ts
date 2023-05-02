import { ethers } from "ethers";

let infuraProvider: ethers.providers.JsonRpcProvider;

if (process.env.NODE_ENV === "production") {
  infuraProvider = new ethers.providers.JsonRpcProvider("https://arbitrum-goerli.infura.io/v3/6ec994a8abd8472bb95b74f1bea73875");
} else {
  infuraProvider = new ethers.providers.JsonRpcProvider("https://arbitrum-goerli.infura.io/v3/6ec994a8abd8472bb95b74f1bea73875");
}

export default infuraProvider;
