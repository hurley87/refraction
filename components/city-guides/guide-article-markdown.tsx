import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { cn } from '@/lib/utils';

/** Shared GFM mapping for guide/editorial article UI (`remark-gfm`). */
export const GUIDE_ARTICLE_MARKDOWN_COMPONENTS: Components = {
  h1: ({ children }) => (
    <h1 className="title3 mb-3 mt-4 font-bold text-[#171717] first:mt-0">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="title4 mb-2 mt-4 font-bold text-[#171717] first:mt-0">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="mb-2 mt-3 text-lg font-bold leading-snug text-[#171717] first:mt-0">
      {children}
    </h3>
  ),
  h4: ({ children }) => (
    <h4 className="mb-2 mt-3 text-base font-bold leading-snug text-[#171717] first:mt-0">
      {children}
    </h4>
  ),
  h5: ({ children }) => (
    <h5 className="mb-1.5 mt-2 text-sm font-bold uppercase tracking-wide text-[#171717] first:mt-0">
      {children}
    </h5>
  ),
  h6: ({ children }) => (
    <h6 className="mb-1.5 mt-2 text-xs font-bold uppercase tracking-wide text-[#171717]/90 first:mt-0">
      {children}
    </h6>
  ),
  p: ({ children }) => <p className="mb-3 first:mt-0 last:mb-0">{children}</p>,
  strong: ({ children }) => <strong className="font-bold">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  del: ({ children }) => (
    <del className="opacity-80 line-through">{children}</del>
  ),
  a: ({ href, children }) => (
    <a
      href={href}
      className="font-semibold underline decoration-[#171717]/35 underline-offset-2 hover:opacity-80"
      target="_blank"
      rel="noopener noreferrer"
    >
      {children}
    </a>
  ),
  hr: () => (
    <hr className="my-4 border-0 border-t border-solid border-[#171717]/20" />
  ),
  ul: ({ children }) => (
    <ul className="my-3 list-disc space-y-1 pl-5 first:mt-0 last:mb-0">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="my-3 list-decimal space-y-1 pl-5 first:mt-0 last:mb-0">
      {children}
    </ol>
  ),
  li: ({ children, className }) => (
    <li className={cn('leading-[22px]', className)}>{children}</li>
  ),
  input: (props) =>
    props.type === 'checkbox' ? (
      <input
        {...props}
        type="checkbox"
        checked={Boolean(props.checked)}
        disabled={props.disabled ?? true}
        readOnly
        className={cn('mr-2 align-middle', props.className)}
      />
    ) : (
      <input {...props} />
    ),
  blockquote: ({ children }) => (
    <blockquote className="my-3 border-l-2 border-[#171717]/25 pl-3 italic">
      {children}
    </blockquote>
  ),
  pre: ({ children }) => (
    <pre className="my-3 overflow-x-auto rounded-lg bg-[#171717]/[0.08] p-3 text-[13px] leading-relaxed text-[#171717] [&_code]:bg-transparent [&_code]:p-0">
      {children}
    </pre>
  ),
  code: ({ className, children, ...props }) => {
    const isBlock =
      typeof className === 'string' && /\blanguage-[\w-]+\b/.test(className);
    if (isBlock) {
      return (
        <code className={cn(className, 'font-mono')} {...props}>
          {children}
        </code>
      );
    }
    return (
      <code
        className="rounded bg-[#171717]/[0.06] px-1 py-0.5 font-mono text-[0.9em]"
        {...props}
      >
        {children}
      </code>
    );
  },
  table: ({ children }) => (
    <div className="my-3 w-full overflow-x-auto">
      <table className="w-full border-collapse border border-[#171717]/20 text-left text-[13px]">
        {children}
      </table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="bg-[#171717]/[0.06]">{children}</thead>
  ),
  tbody: ({ children }) => <tbody>{children}</tbody>,
  tr: ({ children }) => <tr>{children}</tr>,
  th: ({ children }) => (
    <th className="border border-[#171717]/15 px-2 py-1.5 font-semibold">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="border border-[#171717]/15 px-2 py-1.5">{children}</td>
  ),
  img: ({ src, alt }) => (
    // Markdown image URLs are arbitrary; Next/Image domains are not configured for CMS URLs.
    // eslint-disable-next-line @next/next/no-img-element -- see comment above
    <img
      src={typeof src === 'string' ? src : ''}
      alt={alt ?? ''}
      className="my-3 h-auto max-w-full rounded-md"
      loading="lazy"
    />
  ),
};

export interface GuideArticleMarkdownProps {
  markdown: string;
  className?: string;
}

/** Renders one Markdown document with guide typography (`remark-gfm`). */
export function GuideArticleMarkdown({
  markdown,
  className,
}: GuideArticleMarkdownProps) {
  return (
    <div className={cn('body-medium text-[#171717]', className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={GUIDE_ARTICLE_MARKDOWN_COMPONENTS}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  );
}
