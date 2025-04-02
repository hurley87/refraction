import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export async function getIPSFData(ipfs: string) {
  const url = `https://ipfs.io/ipfs/${ipfs}`;
  const response = await fetch(url);
  const data = await response.json();
  return data;
}
