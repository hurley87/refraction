/** DICE GraphQL does not expose a direct event permalink; search by name instead. */
export function getDiceEventTicketsUrl(eventName: string): string {
  return `https://dice.fm/search?q=${encodeURIComponent(eventName)}`;
}
