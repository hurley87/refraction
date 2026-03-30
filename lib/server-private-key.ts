/**
 * Private key for server-signed Base transactions (`/api/claim-nft` mint, etc.).
 *
 * Set either variable in `.env.local` (same `0x…` hex format):
 * - `SERVER_PRIVATE_KEY` — explicit name for claim / custodial flows
 * - `SERVER_WALLET_PRIVATE_KEY` — documented in `.env.local.example` (shared name across APIs)
 */
export function getServerPrivateKey(): string | undefined {
  const a = process.env.SERVER_PRIVATE_KEY?.trim();
  const b = process.env.SERVER_WALLET_PRIVATE_KEY?.trim();
  return a || b || undefined;
}
