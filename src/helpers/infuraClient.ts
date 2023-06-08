import { ethers } from "ethers";

let infuraProvider: ethers.providers.JsonRpcProvider;
if (process.env.NODE_ENV === "production") {
  infuraProvider = new ethers.providers.JsonRpcProvider(
    "https://arb-goerli.g.alchemy.com/v2/I8yTFUYDb_bso5E9di3Kn_pu4UGzywGr");
} else {
  infuraProvider = new ethers.providers.JsonRpcProvider(
    "https://arb-goerli.g.alchemy.com/v2/I8yTFUYDb_bso5E9di3Kn_pu4UGzywGr");
}

export default infuraProvider;
