"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";

type ModalKind = "readme" | "contributing" | null;

export default function Home() {
  const [open, setOpen] = useState<ModalKind>(null);

  const markdown = useMemo(() => {
    const readme = `# flux-embeds

flux-embeds is a dedicated host for small, embeddable UI surfaces used across Flux.

Each embed is a standalone route intended to be:
- framed in iframes
- embedded in other products
- deployed without relying on surrounding layout or global styles

## What lives here
- Download buttons
- Widgets and tools
- Visual or interactive previews
- Utility surfaces that don’t warrant a full app

## How it works
- Each embed lives under \`app/(embed)/<name>/page.tsx\`
- Embeds are intentionally simple and self-contained
- The landing page and Dev Mode act as indexes, not navigation apps

## Design constraints
- Responsive in narrow iframes
- Predictable height and scroll behavior
- No global CSS or layout assumptions
- No brittle DOM timing or lifecycle hacks
`;

    const contributing = `# Contributing

flux-embeds prioritizes correctness, isolation, and predictability over abstraction.

## Core principles
- One embed, one responsibility
- Assume the host environment is hostile or unknown
- Avoid shared state, globals, and side effects
- Prefer clarity over cleverness

## Workflow
1. Scaffold a new embed under \`app/(embed)/<name>\`
2. Implement the route in \`page.tsx\`
3. Verify behavior in Dev Mode
4. Ensure iframe safety (scrolling, sizing, focus)
5. Optionally append links via \`scripts/gen-feature.mjs\`

## Before merging
- Test inside an iframe
- Test at small widths
- Remove debug logs
- Confirm no global CSS or window assumptions
`;

    return { readme, contributing };
  }, []);

  const title = open === "readme" ? "README" : open === "contributing" ? "Contributing" : "";
  const body = open === "readme" ? markdown.readme : open === "contributing" ? markdown.contributing : "";

  return (
    <div className="min-h-dvh bg-zinc-50 font-sans text-zinc-950 dark:bg-black dark:text-zinc-50">
      {/* subtle background */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute -top-40 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-zinc-200/60 blur-3xl dark:bg-zinc-800/60" />
        <div className="absolute -bottom-40 left-1/3 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-zinc-200/50 blur-3xl dark:bg-zinc-800/50" />
      </div>

      <main className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-5 py-10 sm:px-8 sm:py-14">
        {/* Header */}
        <header className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Image
              src="/wordmark.webp"
              alt="Morrison Developers"
              width={180}
              height={40}
              priority
              className="h-10 w-auto"
            />
            <div className="flex flex-col">
              <div className="text-sm font-semibold tracking-wide text-zinc-700 dark:text-zinc-300">
                Morrison Developers
              </div>
              <div className="text-lg font-bold tracking-tight">flux-embeds</div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setOpen("readme")}
              className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-900 shadow-sm transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50 dark:hover:bg-zinc-900"
            >
              View README
            </button>
            <button
              type="button"
              onClick={() => setOpen("contributing")}
              className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-900 shadow-sm transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50 dark:hover:bg-zinc-900"
            >
              Contributions
            </button>
          </div>
        </header>

        {/* Hero */}
        <section className="rounded-3xl border border-zinc-200 bg-white/90 p-6 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/70 sm:p-10">
          <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
            <div className="flex flex-col gap-5">
              <h1 className="text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
                A focused workspace for building and shipping Flux embeds.
              </h1>
              <p className="max-w-2xl text-base leading-7 text-zinc-600 dark:text-zinc-300 sm:text-lg">
                flux-embeds is a lightweight host for small, iframe-safe UI surfaces used
                across Flux and related products. Each route is a self-contained embed designed
                to be copied, framed, and deployed without side effects.
              </p>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <a
                  href="/dev"
                  className="inline-flex shrink-0 whitespace-nowrap items-center justify-center rounded-xl bg-zinc-950 px-5 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-zinc-900 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
                >
                  Enter Dev Mode
                </a>

                <div className="text-sm text-zinc-600 dark:text-zinc-300">
                  Dev Mode is the canonical index for embeds: preview behavior, verify iframe
                  constraints, and copy production-ready URLs.
                </div>
              </div>
            </div>

            <div className="grid gap-3">
              <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-200">
                <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  Built so far
                </div>

                <div className="grid gap-2">
                  <a
                    href="/download-btn"
                    className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-900 shadow-sm transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50 dark:hover:bg-zinc-900"
                  >
                    <span>Download Button embed</span>
                    <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                      /download-btn
                    </span>
                  </a>

                  <a
                    href="/contact"
                    className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-900 shadow-sm transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50 dark:hover:bg-zinc-900"
                  >
                    <span>Contact embed</span>
                    <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                      /contact
                    </span>
                  </a>

                  <a
                    href="/mor-dev-particles"
                    className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-900 shadow-sm transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50 dark:hover:bg-zinc-900"
                  >
                    <span>Morrison Dev Particles</span>
                    <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                      /mor-dev-particles
                    </span>
                  </a>
                
                  <a
                    href="/superb-owl?board=default"
                    className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-900 shadow-sm transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50 dark:hover:bg-zinc-900"
                  >
                    <span>Superb Owl embed</span>
                    <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                      /superb-owl?board=default
                    </span>
                  </a>
</div>

                <div className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
                  Add embeds under <span className="font-mono">app/(embed)/&lt;name&gt;/page.tsx</span>. Use{" "}
                  <span className="font-mono">scripts/gen-feature.mjs</span> to scaffold routes and optionally append the link
                  to this list and <span className="font-mono">/dev</span>. Keep embeds iframe-safe: responsive, predictable
                  height/scroll, no global CSS, no brittle DOM timing.
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="flex flex-col gap-2 text-sm text-zinc-500 dark:text-zinc-400 sm:flex-row sm:items-center sm:justify-between">
          <div>© {new Date().getFullYear()} Morrison Developers</div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setOpen("readme")}
              className="underline decoration-zinc-300 underline-offset-4 hover:text-zinc-800 dark:decoration-zinc-700 dark:hover:text-zinc-200"
            >
              README
            </button>
            <button
              type="button"
              onClick={() => setOpen("contributing")}
              className="underline decoration-zinc-300 underline-offset-4 hover:text-zinc-800 dark:decoration-zinc-700 dark:hover:text-zinc-200"
            >
              Contributing
            </button>
          </div>
        </footer>
      </main>

      <MdModal open={open !== null} title={title} markdown={body} onClose={() => setOpen(null)} />
    </div>
  );
}

function MdModal({
  open,
  title,
  markdown,
  onClose,
}: {
  open: boolean;
  title: string;
  markdown: string;
  onClose: () => void;
}) {
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    document.addEventListener("keydown", onKeyDown);

    // focus the panel for accessibility
    setTimeout(() => {
      panelRef.current?.focus();
    }, 0);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4 backdrop-blur-sm"
      onMouseDown={(e) => {
        // close only when clicking the overlay, not the panel
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        className="w-full max-w-3xl overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xl outline-none dark:border-zinc-800 dark:bg-zinc-950"
      >
        <div className="flex items-center justify-between gap-3 border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
          <div className="text-base font-semibold">{title}</div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm font-medium text-zinc-900 transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50 dark:hover:bg-zinc-900"
          >
            Close
          </button>
        </div>

        <div className="max-h-[70vh] overflow-auto px-5 py-4">
          <div className="rounded-xl border border-zinc-200 bg-white p-4 text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50">
            <MarkdownPreview markdown={markdown} />
          </div>
        </div>
      </div>
    </div>
  );
}

function MarkdownPreview({ markdown }: { markdown: string }) {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");

  const blocks: Array<
    | { type: "h"; level: 1 | 2 | 3; text: string; key: string }
    | { type: "p"; text: string; key: string }
    | { type: "ul"; items: string[]; key: string }
    | { type: "ol"; items: string[]; key: string }
    | { type: "code"; lang: string; text: string; key: string }
    | { type: "spacer"; key: string }
  > = [];

  let i = 0;
  let blockId = 0;

  const nextKey = () => `b_${blockId++}`;

  const flushSpacer = () => {
    const prev = blocks[blocks.length - 1];
    if (prev?.type !== "spacer") blocks.push({ type: "spacer", key: nextKey() });
  };

  while (i < lines.length) {
    const line = lines[i];

    // code fence
    const fenceMatch = line.match(/^```(\w+)?\s*$/);
    if (fenceMatch) {
      const lang = fenceMatch[1] ?? "";
      i += 1;
      const buf: string[] = [];
      while (i < lines.length && !lines[i].match(/^```\s*$/)) {
        buf.push(lines[i]);
        i += 1;
      }
      // consume closing fence if present
      if (i < lines.length && lines[i].match(/^```\s*$/)) i += 1;

      blocks.push({ type: "code", lang, text: buf.join("\n"), key: nextKey() });
      flushSpacer();
      continue;
    }

    // headings
    const hMatch = line.match(/^(#{1,3})\s+(.*)$/);
    if (hMatch) {
      const level = Math.min(3, hMatch[1].length) as 1 | 2 | 3;
      const text = hMatch[2].trim();
      blocks.push({ type: "h", level, text, key: nextKey() });
      flushSpacer();
      i += 1;
      continue;
    }

    // unordered list
    if (line.startsWith("- ")) {
      const items: string[] = [];
      while (i < lines.length && lines[i].startsWith("- ")) {
        items.push(lines[i].slice(2));
        i += 1;
      }
      blocks.push({ type: "ul", items, key: nextKey() });
      flushSpacer();
      continue;
    }

    // ordered list
    const olMatch = line.match(/^\d+\.\s+/);
    if (olMatch) {
      const items: string[] = [];
      while (i < lines.length && lines[i].match(/^\d+\.\s+/)) {
        items.push(lines[i].replace(/^\d+\.\s+/, ""));
        i += 1;
      }
      blocks.push({ type: "ol", items, key: nextKey() });
      flushSpacer();
      continue;
    }

    // blank line
    if (line.trim() === "") {
      i += 1;
      continue;
    }

    // paragraph (merge consecutive non-blank lines until a special block starts)
    const pBuf: string[] = [line.trim()];
    i += 1;
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !lines[i].match(/^```(\w+)?\s*$/) &&
      !lines[i].match(/^(#{1,3})\s+/) &&
      !lines[i].startsWith("- ") &&
      !lines[i].match(/^\d+\.\s+/)
    ) {
      pBuf.push(lines[i].trim());
      i += 1;
    }
    blocks.push({ type: "p", text: pBuf.join(" "), key: nextKey() });
    flushSpacer();
  }

  // drop trailing spacer
  if (blocks.length && blocks[blocks.length - 1].type === "spacer") {
    blocks.pop();
  }

  return (
    <div className="text-sm leading-6">
      {blocks.map((b) => {
        if (b.type === "spacer") return <div key={b.key} className="h-3" />;

        if (b.type === "h") {
          const cls =
            b.level === 1
              ? "text-xl font-semibold tracking-tight"
              : b.level === 2
              ? "text-base font-semibold tracking-tight"
              : "text-sm font-semibold tracking-tight";
          const pad = b.level === 1 ? "mt-1" : "mt-2";
          return (
            <div key={b.key} className={`${pad} ${cls}`}>
              <InlineCode text={b.text} />
            </div>
          );
        }

        if (b.type === "p") {
          return (
            <p key={b.key} className="text-zinc-700 dark:text-zinc-200">
              <InlineCode text={b.text} />
            </p>
          );
        }

        if (b.type === "ul") {
          return (
            <ul key={b.key} className="ml-5 list-disc text-zinc-700 dark:text-zinc-200">
              {b.items.map((it, idx) => (
                <li key={`${b.key}_${idx}`}>
                  <InlineCode text={it} />
                </li>
              ))}
            </ul>
          );
        }

        if (b.type === "ol") {
          return (
            <ol key={b.key} className="ml-5 list-decimal text-zinc-700 dark:text-zinc-200">
              {b.items.map((it, idx) => (
                <li key={`${b.key}_${idx}`}>
                  <InlineCode text={it} />
                </li>
              ))}
            </ol>
          );
        }

        // code block
        return (
          <div key={b.key} className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900/40">
            <pre className="overflow-auto text-xs leading-5 text-zinc-900 dark:text-zinc-50">
              <code>{b.text}</code>
            </pre>
          </div>
        );
      })}
    </div>
  );
}

function InlineCode({ text }: { text: string }) {
  // Split on inline code fences: `code`
  const parts = text.split(/(`[^`]+`)/g);

  return (
    <>
      {parts.map((p, idx) => {
        const isCode = p.startsWith("`") && p.endsWith("`") && p.length >= 2;
        if (!isCode) return <span key={idx}>{p}</span>;

        const code = p.slice(1, -1);
        return (
          <code
            key={idx}
            className="rounded-md border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 font-mono text-[12px] text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-50"
          >
            {code}
          </code>
        );
      })}
    </>
  );
}
