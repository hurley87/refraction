import { splitTitleLastWord } from '@/lib/utils';

export type TitleHighlightSegment = {
  text: string;
  highlight: boolean;
};

/** Comma-, semicolon-, or newline-separated phrases for the admin form. */
export function parseTitleHighlightWordsInput(text: string): string[] {
  return [
    ...new Set(
      text
        .split(/[,;\n]+/)
        .map((s) => s.trim())
        .filter(Boolean)
    ),
  ];
}

export function formatTitleHighlightWordsForInput(
  words: string[] | null | undefined
): string {
  return (words ?? [])
    .map((w) => w.trim())
    .filter(Boolean)
    .join(', ');
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Split a title into plain / highlighted segments.
 * When `highlightPhrases` is empty, highlights the last word (legacy default).
 */
export function buildTitleHighlightSegments(
  text: string,
  highlightPhrases: string[] | null | undefined
): TitleHighlightSegment[] {
  const title = text.trim();
  if (!title) return [];

  const phrases = [
    ...new Set((highlightPhrases ?? []).map((p) => p.trim()).filter(Boolean)),
  ].sort((a, b) => b.length - a.length);

  if (phrases.length === 0) {
    const { beforeLastWord, lastWord } = splitTitleLastWord(title);
    const segments: TitleHighlightSegment[] = [];
    if (beforeLastWord) {
      segments.push({ text: `${beforeLastWord} `, highlight: false });
    }
    if (lastWord) {
      segments.push({ text: lastWord, highlight: true });
    }
    return segments;
  }

  type Match = { start: number; end: number };
  const matches: Match[] = [];

  for (const phrase of phrases) {
    const re = new RegExp(escapeRegExp(phrase), 'gi');
    let match: RegExpExecArray | null;
    while ((match = re.exec(title)) !== null) {
      const start = match.index;
      const end = start + match[0].length;
      const overlaps = matches.some(
        (existing) => !(end <= existing.start || start >= existing.end)
      );
      if (!overlaps) {
        matches.push({ start, end });
      }
    }
  }

  matches.sort((a, b) => a.start - b.start);

  const segments: TitleHighlightSegment[] = [];
  let cursor = 0;
  for (const match of matches) {
    if (match.start > cursor) {
      segments.push({
        text: title.slice(cursor, match.start),
        highlight: false,
      });
    }
    segments.push({
      text: title.slice(match.start, match.end),
      highlight: true,
    });
    cursor = match.end;
  }
  if (cursor < title.length) {
    segments.push({ text: title.slice(cursor), highlight: false });
  }

  return segments;
}
