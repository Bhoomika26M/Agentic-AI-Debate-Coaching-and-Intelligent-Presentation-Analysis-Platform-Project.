import type { ReactNode } from "react";

const CODE_RE = /(`[^`\n]+`)/;
const BOLDITALIC_RE = /(\*\*\*[^*\n]+?\*\*\*)/;
const BOLD_RE = /(\*\*[^*\n]+?\*\*)/;
const STAR_ITALIC_RE = /(\*[^*\n]+?\*)/;

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const out: ReactNode[] = [];
  let key = 0;
  const pushText = (t: string) => {
    if (t) out.push(<span key={`${keyPrefix}-t${key++}`}>{t}</span>);
  };
  const parts = text.split(CODE_RE);
  parts.forEach((part, i) => {
    if (i % 2 === 1) {
      out.push(<code key={`${keyPrefix}-c${key++}`}>{part.slice(1, -1)}</code>);
      return;
    }
    part.split(BOLDITALIC_RE).forEach((b1, j) => {
      if (j % 2 === 1) {
        out.push(
          <strong key={`${keyPrefix}-bi${key++}`}>
            <em>{b1.slice(3, -3)}</em>
          </strong>,
        );
        return;
      }
      b1.split(BOLD_RE).forEach((b2, k) => {
        if (k % 2 === 1) {
          out.push(<strong key={`${keyPrefix}-b${key++}`}>{b2.slice(2, -2)}</strong>);
          return;
        }
        b2.split(STAR_ITALIC_RE).forEach((b3, m) => {
          if (m % 2 === 1) {
            out.push(<em key={`${keyPrefix}-i${key++}`}>{b3.slice(1, -1)}</em>);
            return;
          }
          const underRe = /(^|\W)(_[^_\n]+?)($|\W)/g;
          let last = 0;
          let mtch: RegExpExecArray | null;
          while ((mtch = underRe.exec(b3)) !== null) {
            if (mtch[0].length === 0) break;
            const at = mtch.index;
            pushText(b3.slice(last, at + mtch[1].length));
            out.push(<em key={`${keyPrefix}-u${key++}`}>{mtch[2].slice(1, -1)}</em>);
            last = at + mtch[0].length - mtch[3].length;
            underRe.lastIndex = last;
          }
          pushText(b3.slice(last));
        });
      });
    });
  });
  return out;
}

function renderLinesWithBreaks(text: string, keyPrefix: string): ReactNode[] {
  const lines = text.split("\n");
  const out: ReactNode[] = [];
  lines.forEach((line, i) => {
    out.push(...renderInline(line, `${keyPrefix}-l${i}`));
    if (i < lines.length - 1) out.push(<br key={`${keyPrefix}-br${i}`} />);
  });
  return out;
}

export function MarkdownText({ text, compact }: { text: string; compact?: boolean }) {
  const blocks = text.split(/\n{2,}/);
  return (
    <>
      {blocks.map((block, i) => {
        const lines = block.split("\n").filter((l) => l.trim());
        if (lines.length > 0 && lines.every((l) => /^\s*[-*]\s+\S/.test(l))) {
          return (
            <ul key={i}>
              {lines.map((l, j) => (
                <li key={j}>{renderInline(l.replace(/^\s*[-*]\s+/, ""), `b${i}-${j}`)}</li>
              ))}
            </ul>
          );
        }
        if (lines.length > 0 && lines.every((l) => /^\s*\d+[.)]\s+\S/.test(l))) {
          return (
            <ol key={i}>
              {lines.map((l, j) => (
                <li key={j}>{renderInline(l.replace(/^\s*\d+[.)]\s+/, ""), `b${i}-${j}`)}</li>
              ))}
            </ol>
          );
        }
        return compact ? (
          <span key={i}>{renderLinesWithBreaks(block, `b${i}`)}</span>
        ) : (
          <p key={i}>{renderLinesWithBreaks(block, `b${i}`)}</p>
        );
      })}
    </>
  );
}
