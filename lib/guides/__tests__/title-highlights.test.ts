import { describe, it, expect } from 'vitest';
import {
  buildTitleHighlightSegments,
  formatTitleHighlightWordsForInput,
  parseTitleHighlightWordsInput,
} from '@/lib/guides/title-highlights';

describe('title-highlights', () => {
  it('parseTitleHighlightWordsInput splits on commas and dedupes', () => {
    expect(parseTitleHighlightWordsInput('Berlin, Guide, Berlin')).toEqual([
      'Berlin',
      'Guide',
    ]);
  });

  it('formatTitleHighlightWordsForInput joins with comma', () => {
    expect(formatTitleHighlightWordsForInput(['Berlin', 'Guide'])).toBe(
      'Berlin, Guide'
    );
  });

  it('buildTitleHighlightSegments falls back to last word when empty', () => {
    expect(buildTitleHighlightSegments('The IRL Guide to Berlin', [])).toEqual([
      { text: 'The IRL Guide to ', highlight: false },
      { text: 'Berlin', highlight: true },
    ]);
  });

  it('buildTitleHighlightSegments highlights configured phrases', () => {
    expect(
      buildTitleHighlightSegments('The IRL Guide to Berlin', [
        'Berlin',
        'Guide',
      ])
    ).toEqual([
      { text: 'The IRL ', highlight: false },
      { text: 'Guide', highlight: true },
      { text: ' to ', highlight: false },
      { text: 'Berlin', highlight: true },
    ]);
  });

  it('buildTitleHighlightSegments supports multi-word phrases', () => {
    expect(
      buildTitleHighlightSegments('Hello New York City', ['New York'])
    ).toEqual([
      { text: 'Hello ', highlight: false },
      { text: 'New York', highlight: true },
      { text: ' City', highlight: false },
    ]);
  });
});
