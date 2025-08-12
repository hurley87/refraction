import type {
  Perk,
  PerkDiscountCode,
  UserPerkRedemption,
  Player,
} from "./types";

const json = async (res: Response) => {
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || "Request failed");
  return data;
};

// Public perks
export async function fetchAllPerks(activeOnly = true): Promise<Perk[]> {
  const res = await fetch(`/api/perks?activeOnly=${activeOnly}`);
  const data = await json(res);
  return data.perks as Perk[];
}

export async function fetchPerkById(id: string): Promise<Perk> {
  const res = await fetch(`/api/perks/${id}`);
  const data = await json(res);
  return data.perk as Perk;
}

export async function fetchAvailableCodesCount(
  perkId: string,
): Promise<number> {
  const res = await fetch(`/api/perks/${perkId}/codes`);
  const data = await json(res);
  const codes = (data.codes as PerkDiscountCode[]) || [];
  return codes.filter((c) => !c.is_claimed).length;
}

// Admin
export async function createPerk(
  perk: Omit<Perk, "id" | "created_at" | "updated_at">,
): Promise<Perk> {
  const res = await fetch(`/api/perks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(perk),
  });
  const data = await json(res);
  return data.perk as Perk;
}

export async function updatePerk(
  id: string,
  updates: Partial<Omit<Perk, "id" | "created_at">>,
): Promise<Perk> {
  const res = await fetch(`/api/perks/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });
  const data = await json(res);
  return data.perk as Perk;
}

export async function deletePerk(id: string): Promise<void> {
  const res = await fetch(`/api/perks/${id}`, { method: "DELETE" });
  await json(res);
}

export async function createDiscountCodes(
  perkId: string,
  codes: string[],
): Promise<PerkDiscountCode[]> {
  const res = await fetch(`/api/perks/${perkId}/codes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ codes }),
  });
  const data = await json(res);
  return data.codes as PerkDiscountCode[];
}

export async function getDiscountCodesByPerkId(
  perkId: string,
): Promise<PerkDiscountCode[]> {
  const res = await fetch(`/api/perks/${perkId}/codes`);
  const data = await json(res);
  return (data.codes as PerkDiscountCode[]) || [];
}

export async function deleteDiscountCode(codeId: string): Promise<void> {
  const res = await fetch(`/api/perks/codes/${codeId}`, { method: "DELETE" });
  await json(res);
}

// Redemption and user interactions
export async function redeemPerk(perkId: string, walletAddress: string) {
  const res = await fetch(`/api/perks/redeem`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ perkId, walletAddress }),
  });
  const data = await json(res);
  return data.redemption as UserPerkRedemption;
}

export async function getUserPerkRedemptions(
  walletAddress: string,
): Promise<UserPerkRedemption[]> {
  const res = await fetch(
    `/api/user/redemptions?walletAddress=${encodeURIComponent(walletAddress)}`,
  );
  const data = await json(res);
  return (data.redemptions as UserPerkRedemption[]) || [];
}

export async function getPlayerByWallet(
  walletAddress: string,
): Promise<Player | null> {
  const res = await fetch(
    `/api/player?walletAddress=${encodeURIComponent(walletAddress)}`,
  );
  if (res.status === 404) return null;
  const data = await json(res);
  return data.player as Player;
}
