import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Split trimmed text into the prefix and last whitespace-delimited token
 * (e.g. IRL yellow highlight on hub / hero titles).
 */
export function splitTitleLastWord(text: string): {
  beforeLastWord: string;
  lastWord: string;
} {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const lastWord = words.length > 0 ? words[words.length - 1]! : '';
  const beforeLastWord = words.length > 1 ? words.slice(0, -1).join(' ') : '';
  return { beforeLastWord, lastWord };
}

export async function getIPSFData(ipfs: string) {
  const url = `https://ipfs.io/ipfs/${ipfs}`;
  const response = await fetch(url);
  const data = await response.json();
  return data;
}
