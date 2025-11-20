/**
 * Reward1155 Contract ABI
 *
 * Contract Address: 0xf2894fEd9CAa5E6422bF45D9fE1B38b06D9c46b8
 * Network: Base Mainnet
 * Verified: https://basescan.org/address/0xf2894fed9caa5e6422bf45d9fe1b38b06d9c46b8
 */

export const REWARD1155_ADDRESS = "0xf2894fEd9CAa5E6422bF45D9fE1B38b06D9c46b8" as const;

export const REWARD1155_ABI = [
  // Minting functions
  "function mint() external",
  "function mintTo(address recipient) external",

  // View functions - Mint status
  "function canMint(address account) external view returns (bool)",
  "function hasMinted(address account) external view returns (bool)",
  "function totalMinted() external view returns (uint256)",

  // View functions - Balances
  "function balanceOf(address account, uint256 id) external view returns (uint256)",
  "function getRewardTokenBalance() external view returns (uint256)",

  // View functions - Configuration
  "function rewardToken() external view returns (address)",
  "function rewardAmount() external view returns (uint256)",
  "function name() external view returns (string)",
  "function symbol() external view returns (string)",

  // Admin functions - Funding
  "function depositRewards(uint256 amount) external",
  "function withdrawTokens(address token, address to, uint256 amount) external",

  // Admin functions - Configuration
  "function setURI(string memory newURI) external",
  "function setRewardToken(address newToken) external",
  "function setRewardAmount(uint256 newAmount) external",

  // Constants
  "function TOKEN_ID() external view returns (uint256)",
  "function MAX_SUPPLY() external view returns (uint256)",
] as const;

export const ERC20_ABI = [
  "function balanceOf(address account) external view returns (uint256)",
  "function transfer(address to, uint256 amount) external returns (bool)",
  "function transferFrom(address from, address to, uint256 amount) external returns (bool)",
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function decimals() external view returns (uint8)",
  "function name() external view returns (string)",
  "function symbol() external view returns (string)",
  "function totalSupply() external view returns (uint256)",
] as const;

// Contract configuration
export const REWARD1155_CONFIG = {
  address: REWARD1155_ADDRESS,
  chainId: 8453, // Base Mainnet
  tokenId: 1,
  maxSupply: 100,
  rewardPerMint: 100, // WCT tokens per mint
  name: "SYMMETRY VISUAL SYSTEM",
  symbol: "SVS",
  wctTokenAddress: "0xeF4461891DfB3AC8572cCf7C794664A8DD927945", // WCT Token (previously called SVS)
  metadataUri: "https://cyan-genuine-pheasant-886.mypinata.cloud/ipfs/bafkreifn3alhdejcnaly3uglcf2yc7pwtxbpft4xd7ucb2tua6niu4kquu",
} as const;
