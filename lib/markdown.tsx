import { Fragment, ReactNode } from "react";

/* The dossier arrives as Markdown, from Gemini or from the deterministic
   template. It is the one page the owner actually reads, so it gets rendered
   rather than printed with its asterisks showing. Headings, emphasis, code,
   quotes, lists and rules — the subset the writer actually emits. */

const inline = (text: string, keyPrefix: string): ReactNode[] => {
  const out: ReactNode[] = [];
  const pattern = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let i = 0;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > last) out.push(text.slice(last, match.index));
    const token = match[0];
    const key = `${keyPrefix}-${i++}`;
    if (token.startsWith("**")) out.push(<strong key={key}>{token.slice(2, -2)}</strong>);
    else if (token.startsWith("`")) out.push(<code key={key}>{token.slice(1, -1)}</code>);
    else out.push(<em key={key}>{token.slice(1, -1)}</em>);
    last = match.index + token.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
};

export function renderMarkdown(source: string): ReactNode[] {
  const lines = source.split("\n");
  const blocks: ReactNode[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;
  let paragraph: string[] = [];
  let quote: string[] = [];
  let blankRun = false;

  /* A hard line break inside a paragraph is intentional here — the dossier
     writes "For: / Date: / Prepared by:" as three lines, not one sentence. */
  const flushParagraph = () => {
    if (!paragraph.length) return;
    const key = `p-${blocks.length}`;
    blocks.push(
      <p key={key}>
        {paragraph.map((line, i) => (
          <Fragment key={`${key}-${i}`}>
            {i > 0 && <br />}
            {inline(line, `${key}-${i}`)}
          </Fragment>
        ))}
      </p>
    );
    paragraph = [];
  };

  const flushQuote = () => {
    if (!quote.length) return;
    const key = `q-${blocks.length}`;
    blocks.push(
      <blockquote key={key}>
        <span className="md-quote-lead">{inline(quote[0], `${key}-0`)}</span>
        {quote.slice(1).map((line, i) => (
          <span key={`${key}-${i + 1}`} className="md-quote-note">
            {inline(line, `${key}-${i + 1}`)}
          </span>
        ))}
      </blockquote>
    );
    quote = [];
  };

  const flushList = () => {
    if (!list) return;
    const key = `l-${blocks.length}`;
    const items = list.items.map((item, i) => <li key={`${key}-${i}`}>{inline(item, `${key}-${i}`)}</li>);
    blocks.push(list.ordered ? <ol key={key}>{items}</ol> : <ul key={key}>{items}</ul>);
    list = null;
  };

  const flushAll = () => {
    flushParagraph();
    flushList();
    flushQuote();
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    const trimmed = line.trim();

    if (!trimmed) {
      /* A blank line between two items is a loose list, not the end of one.
         Flushing here split "1. / 2. / 3." into three lists of one item each,
         and every step came out numbered 1. */
      flushParagraph();
      flushQuote();
      blankRun = true;
      continue;
    }

    if (/^-{3,}$/.test(trimmed) || /^_{3,}$/.test(trimmed)) {
      flushAll();
      blocks.push(<hr key={`hr-${blocks.length}`} />);
      continue;
    }

    const heading = /^(#{1,6})\s+(.*)$/.exec(trimmed);
    if (heading) {
      flushAll();
      const level = Math.min(heading[1].length + 1, 4);
      const Tag = `h${level}` as "h2" | "h3" | "h4";
      const key = `h-${blocks.length}`;
      blocks.push(<Tag key={key}>{inline(heading[2], key)}</Tag>);
      continue;
    }

    const quoted = /^>\s?(.*)$/.exec(trimmed);
    if (quoted) {
      flushParagraph();
      flushList();
      const body = quoted[1].replace(/^#+\s*/, "").trim();
      if (body) quote.push(body);
      continue;
    }
    flushQuote();

    const ordered = /^(\d+)\.\s+(.*)$/.exec(trimmed);
    const bullet = /^[-*]\s+(.*)$/.exec(trimmed);
    if (ordered || bullet) {
      flushParagraph();
      blankRun = false;
      const isOrdered = Boolean(ordered);
      const item = (ordered ? ordered[2] : bullet![1]).trim();
      if (list && list.ordered !== isOrdered) flushList();
      if (!list) list = { ordered: isOrdered, items: [] };
      list.items.push(item);
      continue;
    }

    // a wrapped continuation of the list item above, indented by the writer
    if (list && !blankRun && /^\s/.test(raw)) {
      list.items[list.items.length - 1] += ` ${trimmed}`;
      continue;
    }

    flushList();
    blankRun = false;
    paragraph.push(trimmed);
  }

  flushAll();
  return blocks.map((block, i) => <Fragment key={i}>{block}</Fragment>);
}
