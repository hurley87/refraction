/**
 * WalletCon NFT (ERC-721 + USDC reward on mint)
 *
 * Base mainnet: https://basescan.org/address/0x07671bd8fc5899ca6b1de3d925880498745f02b1
 *
 * Owner calls `mint(to)`; contract mints the NFT and transfers `mintReward` USDC (6 decimals) to `to`.
 */
export const WALLETCON_NFT_ADDRESS =
  '0x07671bd8fc5899ca6b1de3d925880498745f02b1' as const;

export const WALLETCON_NFT_ABI = [
  'function mint(address to) returns (uint256)',
  'function balanceOf(address owner) view returns (uint256)',
  'function totalMinted() view returns (uint256)',
  'function maxSupply() view returns (uint256)',
  'function mintReward() view returns (uint256)',
  'function usdcBalance() view returns (uint256)',
  'function usdc() view returns (address)',
] as const;
