export type LeadParagraphsMarkdownPlacement = 'lead' | 'editorial-blocks';

export interface LeadParagraphsMarkdownReferenceProps {
  /** Where this panel appears — adjusts the intro copy only. */
  placement?: LeadParagraphsMarkdownPlacement;
}

/**
 * Collapsible GFM reference for the guides admin UI (lead textarea and/or editorial paragraph blocks).
 * Matches `GuideArticleMarkdown` / `CityGuideArticleDescription` + `remark-gfm` on public pages.
 */
export function LeadParagraphsMarkdownReference({
  placement = 'lead',
}: LeadParagraphsMarkdownReferenceProps) {
  const example =
    'mt-1 block whitespace-pre-wrap break-words rounded border border-neutral-200 bg-neutral-100 px-2 py-2 font-mono text-[11px] leading-snug text-neutral-900';

  return (
    <details className="mt-2 rounded-md border border-neutral-200 bg-neutral-50 text-xs text-neutral-700">
      <summary className="cursor-pointer select-none px-3 py-2.5 text-xs font-semibold text-neutral-900 hover:bg-neutral-100/90 [&::-webkit-details-marker]:mr-2">
        Markdown syntax reference (GitHub Flavored Markdown)
      </summary>
      <div className="space-y-4 border-t border-neutral-200 p-3 pt-4">
        <p className="text-neutral-800">
          {placement === 'editorial-blocks' ? (
            <>
              <span className="font-semibold">GitHub Flavored Markdown</span> is
              supported in each{' '}
              <strong className="font-semibold">Paragraph</strong> block below.
              Each block’s textarea is one Markdown document (Title3 / H1 /
              Image blocks stay plain text).
            </>
          ) : (
            <>
              <span className="font-semibold">GitHub Flavored Markdown</span> is
              supported in each paragraph below. In this textarea, use{' '}
              <strong className="font-semibold">a blank line</strong> to
              separate paragraphs (each becomes its own block on the live
              guide).
            </>
          )}
        </p>

        <ul className="list-none space-y-4 pl-0">
          <li>
            <span className="font-semibold text-neutral-900">
              Bold, italic, strikethrough
            </span>
            <pre className={example}>{`**Bold** or __bold__
*Italic* or _italic_
***Bold italic***
~~Strikethrough~~`}</pre>
          </li>
          <li>
            <span className="font-semibold text-neutral-900">
              Links and autolinks
            </span>
            <pre className={example}>{`[Visit IRL](https://irl.io)
https://irl.io
<https://irl.io>`}</pre>
          </li>
          <li>
            <span className="font-semibold text-neutral-900">
              Inline and fenced code
            </span>
            <pre className={example}>
              {'Inline: `npm run dev`\n\nFenced:\n```ts\nconst x = 1\n```'}
            </pre>
          </li>
          <li>
            <span className="font-semibold text-neutral-900">Headings</span>
            <pre className={example}>{`# Heading 1
## Heading 2
### Heading 3
#### Heading 4
##### Heading 5
###### Heading 6`}</pre>
          </li>
          <li>
            <span className="font-semibold text-neutral-900">Bullet lists</span>
            <pre className={example}>{`- Dash item
* Asterisk item
  - Nested item`}</pre>
          </li>
          <li>
            <span className="font-semibold text-neutral-900">
              Numbered lists
            </span>
            <pre className={example}>{`1. First step
2. Second step
   1. Sub-step`}</pre>
          </li>
          <li>
            <span className="font-semibold text-neutral-900">
              Task lists (checkboxes)
            </span>
            <pre className={example}>{`- [ ] Not done yet
- [x] Completed`}</pre>
          </li>
          <li>
            <span className="font-semibold text-neutral-900">Blockquote</span>
            <pre className={example}>{`> Single line quote
>
> Multiple lines
> **can use markdown inside**`}</pre>
          </li>
          <li>
            <span className="font-semibold text-neutral-900">
              Horizontal rule
            </span>
            <pre className={example}>{`Line above

---

Line below`}</pre>
          </li>
          <li>
            <span className="font-semibold text-neutral-900">Tables</span>
            <pre className={example}>{`| Column A | Column B |
| -------- | -------- |
| Left     | Right    |
| Foo      | Bar      |`}</pre>
          </li>
          <li>
            <span className="font-semibold text-neutral-900">Images</span>
            <pre className={example}>
              {'![Alt text describes the image](https://example.com/photo.jpg)'}
            </pre>
          </li>
        </ul>
      </div>
    </details>
  );
}
