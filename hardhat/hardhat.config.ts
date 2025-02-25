import "@nomicfoundation/hardhat-toolbox";

require("dotenv").config();

const config = {
  solidity: {
    version: "0.8.24",
  },
  networks: {
    // for mainnet
    "base-mainnet": {
      url: "https://mainnet.base.org",
      accounts: [process.env.WALLET_KEY as string],
      gasPrice: 1000000000,
    },
    // for testnet
    "base-sepolia": {
      url: "https://base-sepolia-rpc.publicnode.com",
      accounts: [process.env.WALLET_KEY as string],
      gasPrice: 1000000000,
    },
    "irl-mainnet": {
      url: "https://rpc.testnet.irl.syndicate.io",
      accounts: [process.env.WALLET_KEY as string],
      gasPrice: 1000000000,
    },
  },
  etherscan: {
    apiKey: {
      "base-sepolia": process.env.ETHERSCAN_KEY as string,
      "base-mainnet": process.env.ETHERSCAN_KEY as string,
      "irl-mainnet": "empty",
    },
    customChains: [
      {
        network: "base-mainnet",
        chainId: 8453,
        urls: {
          apiURL: "https://api.basescan.org/api",
          browserURL: "https://basescan.org",
        },
      },
      {
        network: "base-sepolia",
        chainId: 84532,
        urls: {
          apiURL: "https://api-sepolia.basescan.org/api",
          browserURL: "https://sepolia.basescan.org",
        },
      },
      {
        network: "irl-mainnet",
        chainId: 63821,
        urls: {
          apiURL: "https://explorer.testnet.irl.syndicate.io/api",
          browserURL: "https://explorer.testnet.irl.syndicate.io",
        },
      },
    ],
  },
  defaultNetwork: "hardhat",
};

export default config;
