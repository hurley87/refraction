/**
 * Stripe Commons CDMX – ERC-721 Artwork Contract
 *
 * Contract Address: 0x0F21DE66cc5dA1A49dedb80311A6e281EA9D532e
 * Network: Base Mainnet (Chain ID 8453)
 * Total Supply: 150 tokens owned by the deployer
 */

export const STRIPE_COMMONS_NFT_ADDRESS =
  '0x0F21DE66cc5dA1A49dedb80311A6e281EA9D532e' as const;

export const ERC721_TRANSFER_ABI = [
  'function transferFrom(address from, address to, uint256 tokenId)',
  'function safeTransferFrom(address from, address to, uint256 tokenId)',
  'function ownerOf(uint256 tokenId) view returns (address)',
  'function balanceOf(address owner) view returns (uint256)',
  'function tokenURI(uint256 tokenId) view returns (string)',
] as const;

export const STRIPE_COMMONS_TOTAL_SUPPLY = 150;

export const STRIPE_COMMONS_POINTS = 100;

export const STRIPE_COMMONS_ACTIVITY_TYPE =
  'stripe_commons_artwork_claim' as const;
