import React from "react";

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Wrap matching substrings in <mark> with yellow background. */
export function highlightText(text: string, query: string): React.ReactNode {
  if (!query || query.length < 2) return text;
  const regex = new RegExp(`(${escapeRegExp(query)})`, "gi");
  const parts = text.split(regex);
  if (parts.length === 1) return text;
  return parts.map((part, i) =>
    regex.test(part) ? (
      <mark key={i} className="bg-yellow-300/70 text-inherit rounded-sm px-px">
        {part}
      </mark>
    ) : (
      part
    ),
  );
}

/** Recursively walk React children, highlighting text nodes. */
function highlightChildren(
  children: React.ReactNode,
  query: string,
): React.ReactNode {
  return React.Children.map(children, (child) => {
    if (typeof child === "string") return highlightText(child, query);
    if (typeof child === "number") return highlightText(String(child), query);
    if (React.isValidElement(child)) {
      const props = child.props as { children?: React.ReactNode };
      if (props.children != null) {
        return React.cloneElement(
          child as React.ReactElement<{ children?: React.ReactNode }>,
          {},
          highlightChildren(props.children, query),
        );
      }
    }
    return child;
  });
}

/**
 * Create ReactMarkdown `components` override that highlights matching text
 * inside common block/inline elements.
 */
export function createHighlightComponents(
  query: string,
): Record<string, React.ComponentType<Record<string, unknown>>> {
  if (!query || query.length < 2) return {};

  const wrap = (Tag: string) => {
    const Comp = ({
      node: _node,
      children,
      ...props
    }: Record<string, unknown> & { node?: unknown; children?: React.ReactNode }) =>
      React.createElement(Tag, props, highlightChildren(children, query));
    Comp.displayName = `HL_${Tag}`;
    return Comp;
  };

  return {
    p: wrap("p"),
    li: wrap("li"),
    td: wrap("td"),
    th: wrap("th"),
    h1: wrap("h1"),
    h2: wrap("h2"),
    h3: wrap("h3"),
    h4: wrap("h4"),
    h5: wrap("h5"),
    h6: wrap("h6"),
    strong: wrap("strong"),
    em: wrap("em"),
    blockquote: wrap("blockquote"),
  };
}
