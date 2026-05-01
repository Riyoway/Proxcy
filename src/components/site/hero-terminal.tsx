"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";

/**
 * Mac-style terminal that animates running a Python proxy-rotation script
 * powered by the Proxcy raw API. Lines either type out (commands / source)
 * or appear instantly (program output). The full sequence loops.
 */

type Step =
  | { kind: "command"; text: string }
  | { kind: "code"; text: string; pyHighlight?: boolean }
  | { kind: "output"; text: string; tone?: "info" | "success" | "muted" }
  | { kind: "blank" };

const SCRIPT: Step[] = [
  { kind: "command", text: "cat rotate.py" },
  { kind: "code", text: "import requests, random", pyHighlight: true },
  { kind: "code", text: "" },
  { kind: "code", text: "API = \"https://proxcy.riyo.me/api/raw\"", pyHighlight: true },
  { kind: "code", text: "PROXIES = requests.get(", pyHighlight: true },
  { kind: "code", text: "    f\"{API}?protocol=socks5&google=true\"", pyHighlight: true },
  { kind: "code", text: ").text.splitlines()", pyHighlight: true },
  { kind: "code", text: "" },
  { kind: "code", text: "p = random.choice(PROXIES)", pyHighlight: true },
  { kind: "code", text: "r = requests.get(", pyHighlight: true },
  { kind: "code", text: "    \"https://api.ipify.org\",", pyHighlight: true },
  { kind: "code", text: "    proxies={\"https\": f\"socks5://{p}\"},", pyHighlight: true },
  { kind: "code", text: "    timeout=8,", pyHighlight: true },
  { kind: "code", text: ")", pyHighlight: true },
  { kind: "code", text: "print(r.text, \"via\", p)", pyHighlight: true },
  { kind: "blank" },
  { kind: "command", text: "python rotate.py" },
  { kind: "output", text: "→ loaded 1,247 socks5 proxies", tone: "info" },
  { kind: "output", text: "198.51.100.42 via 203.0.113.7:1080", tone: "muted" },
  { kind: "output", text: "✓ done in 0.83s", tone: "success" },
];

const TYPE_SPEED_MS = 18;
const COMMAND_PAUSE_MS = 320;
const CODE_PAUSE_MS = 60;
const OUTPUT_PAUSE_MS = 220;
const LOOP_PAUSE_MS = 4500;

const PY_KEYWORDS = new Set([
  "import",
  "from",
  "for",
  "in",
  "if",
  "else",
  "def",
  "return",
  "as",
  "and",
  "or",
  "not",
  "True",
  "False",
  "None",
]);

const PY_BUILTINS = new Set([
  "requests",
  "random",
  "print",
  "f",
]);

interface Token {
  text: string;
  cls: string;
}

function tokenizePython(line: string): Token[] {
  if (line.length === 0) return [];
  const tokens: Token[] = [];
  // Match: strings (double-quoted), numbers, identifiers, punctuation, whitespace
  const re = /(\"(?:[^\"\\]|\\.)*\")|(\b\d+\b)|(\b[A-Za-z_][A-Za-z0-9_]*\b)|([(){}\[\],:.=+\-*/])|(\s+)|(.)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(line)) !== null) {
    const [, str, num, ident, punct, space, other] = m;
    if (str !== undefined) tokens.push({ text: str, cls: "text-emerald-300" });
    else if (num !== undefined) tokens.push({ text: num, cls: "text-amber-300" });
    else if (ident !== undefined) {
      if (PY_KEYWORDS.has(ident))
        tokens.push({ text: ident, cls: "text-fuchsia-300" });
      else if (PY_BUILTINS.has(ident))
        tokens.push({ text: ident, cls: "text-sky-300" });
      else if (ident === ident.toUpperCase() && ident.length > 1)
        tokens.push({ text: ident, cls: "text-amber-200" });
      else tokens.push({ text: ident, cls: "text-zinc-200" });
    } else if (punct !== undefined)
      tokens.push({ text: punct, cls: "text-zinc-500" });
    else if (space !== undefined)
      tokens.push({ text: space, cls: "" });
    else if (other !== undefined)
      tokens.push({ text: other, cls: "text-zinc-400" });
  }
  return tokens;
}

function sliceTokens(tokens: Token[], chars: number): Token[] {
  if (chars >= tokensLength(tokens)) return tokens;
  const sliced: Token[] = [];
  let remaining = chars;
  for (const t of tokens) {
    if (remaining <= 0) break;
    if (t.text.length <= remaining) {
      sliced.push(t);
      remaining -= t.text.length;
    } else {
      sliced.push({ text: t.text.slice(0, remaining), cls: t.cls });
      remaining = 0;
    }
  }
  return sliced;
}

function tokensLength(tokens: Token[]): number {
  let n = 0;
  for (const t of tokens) n += t.text.length;
  return n;
}

const outputToneClass: Record<"info" | "success" | "muted", string> = {
  info: "text-sky-300",
  success: "text-emerald-300",
  muted: "text-zinc-400",
};

export const HeroTerminal: React.FC = () => {
  const [stepIndex, setStepIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const tickRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Drag state - default centered by parent flex layout, shifted right
  const [position, setPosition] = useState({ x: 120, y: 30 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const initialPositionRef = useRef({ x: 0, y: 0 });

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // Only drag from the title bar area
    const target = e.target as HTMLElement;
    if (!target.closest('[data-drag-handle]')) return;

    setIsDragging(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    initialPositionRef.current = { ...position };
  }, [position]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;

    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;

    setPosition({
      x: initialPositionRef.current.x + dx,
      y: initialPositionRef.current.y + dy,
    });
  }, [isDragging]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Global mouse events for drag
  useEffect(() => {
    if (isDragging) {
      const onMouseMove = (e: MouseEvent) => {
        const dx = e.clientX - dragStartRef.current.x;
        const dy = e.clientY - dragStartRef.current.y;
        setPosition({
          x: initialPositionRef.current.x + dx,
          y: initialPositionRef.current.y + dy,
        });
      };
      const onMouseUp = () => setIsDragging(false);

      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);

      return () => {
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
      };
    }
  }, [isDragging]);

  // Pre-tokenize python lines (memoized; pure function of SCRIPT)
  const tokenized = useMemo(
    () =>
      SCRIPT.map((step) =>
        step.kind === "code" && step.pyHighlight
          ? tokenizePython(step.text)
          : null,
      ),
    [],
  );

  useEffect(() => {
    if (tickRef.current) clearTimeout(tickRef.current);

    const step = SCRIPT[stepIndex];
    if (!step) {
      // Loop
      tickRef.current = setTimeout(() => {
        setStepIndex(0);
        setCharIndex(0);
      }, LOOP_PAUSE_MS);
      return () => {
        if (tickRef.current) clearTimeout(tickRef.current);
      };
    }

    const fullLength =
      step.kind === "blank"
        ? 0
        : step.kind === "code" && step.pyHighlight
          ? tokensLength(tokenized[stepIndex] ?? [])
          : step.text.length;

    const isTyping = step.kind === "command" || step.kind === "code";

    if (isTyping && charIndex < fullLength) {
      tickRef.current = setTimeout(() => {
        setCharIndex((c) => c + 1);
      }, TYPE_SPEED_MS);
    } else {
      const pause =
        step.kind === "command"
          ? COMMAND_PAUSE_MS
          : step.kind === "output"
            ? OUTPUT_PAUSE_MS
            : CODE_PAUSE_MS;
      tickRef.current = setTimeout(() => {
        setStepIndex((s) => s + 1);
        setCharIndex(0);
      }, pause);
    }

    return () => {
      if (tickRef.current) clearTimeout(tickRef.current);
    };
  }, [stepIndex, charIndex, tokenized]);

  // Build rendered lines up to stepIndex
  const visibleLines: React.ReactNode[] = [];
  for (let i = 0; i <= stepIndex && i < SCRIPT.length; i++) {
    const step = SCRIPT[i];
    const isCurrent = i === stepIndex;
    const slice = isCurrent ? charIndex : Number.MAX_SAFE_INTEGER;

    if (step.kind === "blank") {
      visibleLines.push(
        <div
          key={i}
          className="h-[1em]"
        />,
      );
      continue;
    }

    if (step.kind === "command") {
      const shown = step.text.slice(0, slice);
      visibleLines.push(
        <div
          key={i}
          className="flex items-baseline gap-2"
        >
          <span className="select-none text-emerald-400">$</span>
          <span className="text-zinc-100">{shown}</span>
          {isCurrent ? <Cursor /> : null}
        </div>,
      );
      continue;
    }

    if (step.kind === "code") {
      const tokens = tokenized[i];
      if (tokens) {
        const slicedTokens = isCurrent ? sliceTokens(tokens, slice) : tokens;
        visibleLines.push(
          <div
            key={i}
            className="whitespace-pre"
          >
            {slicedTokens.map((t, idx) => (
              <span
                key={idx}
                className={t.cls}
              >
                {t.text}
              </span>
            ))}
            {isCurrent && slice < tokensLength(tokens) ? <Cursor /> : null}
            {step.text.length === 0 ? "\u00A0" : null}
          </div>,
        );
      } else {
        visibleLines.push(
          <div
            key={i}
            className="whitespace-pre text-zinc-200"
          >
            {step.text.slice(0, slice)}
            {isCurrent ? <Cursor /> : null}
          </div>,
        );
      }
      continue;
    }

    if (step.kind === "output") {
      const tone = step.tone ?? "muted";
      visibleLines.push(
        <div
          key={i}
          className={`whitespace-pre ${outputToneClass[tone]}`}
        >
          {step.text}
        </div>,
      );
      continue;
    }
  }

  return (
    <div
      aria-hidden="true"
      className="ui-float-terminal absolute w-full max-w-xl"
      style={{
        left: position.x,
        top: position.y,
        cursor: isDragging ? 'grabbing' : 'default',
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div className="overflow-hidden rounded-xl border border-white/10 bg-[#0d0d11] shadow-2xl shadow-black/50 ring-1 ring-white/5">
        {/* macOS title bar - draggable handle */}
        <div
          data-drag-handle
          className="relative flex h-9 items-center border-b border-white/5 bg-linear-to-b from-[#26262b] to-[#1c1c20] px-3 cursor-grab active:cursor-grabbing hover:bg-linear-to-b hover:from-[#2d2d33] hover:to-[#232328]"
        >
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full bg-[#ff5f57] ring-1 ring-black/20" />
            <span className="h-3 w-3 rounded-full bg-[#febc2e] ring-1 ring-black/20" />
            <span className="h-3 w-3 rounded-full bg-[#28c840] ring-1 ring-black/20" />
          </div>
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-[11px] font-medium tracking-wide text-zinc-400">
            rotate.py — proxcy
          </div>
        </div>

        {/* Body */}
        <div className="h-[420px] overflow-hidden bg-[#0d0d11] px-4 py-3 font-mono text-[12.5px] leading-[1.55] text-zinc-300">
          <div className="space-y-0.5">{visibleLines}</div>
        </div>
      </div>

      {/* Soft glow - follows the terminal */}
      <div
        className="pointer-events-none absolute -inset-6 -z-10 rounded-3xl bg-primary/20 opacity-40 blur-3xl"
        aria-hidden="true"
      />
    </div>
  );
};

const Cursor: React.FC = () => (
  <span className="ml-0.5 inline-block h-[1em] w-[7px] -translate-y-px animate-pulse bg-emerald-300/90 align-middle" />
);
