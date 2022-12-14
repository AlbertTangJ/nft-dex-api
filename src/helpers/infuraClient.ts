import { ethers } from "ethers";

let infuraProvider: ethers.providers.InfuraProvider;

if (process.env.NODE_ENV === "production") {
  infuraProvider = new ethers.providers.InfuraProvider(
    "goerli",
    "6ec994a8abd8472bb95b74f1bea73875"
  );
} else {
  infuraProvider = new ethers.providers.InfuraProvider(
    "goerli",
    "bc7ea61a955c4f07b1dc8ad4dc08ba08"
  );
}

export default infuraProvider;
