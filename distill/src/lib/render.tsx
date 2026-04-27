import { Fragment } from "react";

/**
 * Render a string, highlighting `[推测: xxx]` and `[guess: xxx]` segments
 * as mustard chips. Optionally append a streaming cursor at the end.
 */
export function renderWithGuesses(
  text: string,
  withCursor = false,
): React.ReactNode {
  const parts: React.ReactNode[] = [];
  const re = /\[(推测|guess): ([^\]]+)\]/g;
  let last = 0;
  for (const match of text.matchAll(re)) {
    const idx = match.index ?? 0;
    if (idx > last) parts.push(text.slice(last, idx));
    parts.push(
      <span className="guess" key={`g-${idx}`}>
        [{match[1]}: {match[2]}]
      </span>,
    );
    last = idx + match[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  if (withCursor) parts.push(<span className="stream-cursor" key="cursor" />);
  return parts.map((p, i) =>
    typeof p === "string" ? <Fragment key={i}>{p}</Fragment> : p,
  );
}
