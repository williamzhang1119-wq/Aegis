"use client";

import { FormEvent, useEffect, useRef, useState } from "react";

type Role = "user" | "assistant";
type Message = { id: string; role: Role; content: string };

const STARTERS = [
  "Help me with a math problem",
  "Why is the sky blue?",
  "I need a homework hint",
  "Give me a riddle to solve",
];

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function ChatPanel() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Hi, I'm Venture 1 — your tutor! I help you think it through (I won't spoil the answer). What are you learning today?",
    },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [demo, setDemo] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || busy) return;

    setError(null);
    setInput("");
    const userMsg: Message = { id: uid(), role: "user", content: trimmed };
    setMessages((prev) => [...prev, userMsg]);
    setBusy(true);

    try {
      const history = [...messages, userMsg]
        .filter((m) => m.id !== "welcome")
        .slice(-8)
        .map((m) => ({ role: m.role, content: m.content }));

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed, history: history.slice(0, -1) }),
      });
      const data = (await res.json()) as {
        reply?: string;
        error?: string;
        demo?: boolean;
      };
      if (!res.ok) throw new Error(data.error || "Something went wrong");
      if (data.demo) setDemo(true);
      setMessages((prev) => [
        ...prev,
        { id: uid(), role: "assistant", content: data.reply || "..." },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reach Venture 1");
    } finally {
      setBusy(false);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void send(input);
  }

  return (
    <section id="chat" className="chat-shell" aria-label="Chat with Venture 1">
      <div className="chat-top">
        <div>
          <h2 className="chat-title">Learn with Venture 1</h2>
          <p className="chat-sub">Hints & questions · never spoils the answer</p>
        </div>
        {demo ? <span className="demo-pill">Demo mode</span> : null}
      </div>

      <div className="starter-row" role="list">
        {STARTERS.map((s) => (
          <button
            key={s}
            type="button"
            className="starter"
            disabled={busy}
            onClick={() => void send(s)}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="messages" ref={listRef} role="log" aria-live="polite">
        {messages.map((m) => (
          <div key={m.id} className={`bubble ${m.role}`}>
            <span className="who">{m.role === "assistant" ? "Venture 1" : "You"}</span>
            <p>{m.content}</p>
          </div>
        ))}
        {busy ? (
          <div className="bubble assistant thinking">
            <span className="who">Venture 1</span>
            <p>
              Thinking
              <span className="dots" aria-hidden>
                <i />
                <i />
                <i />
              </span>
            </p>
          </div>
        ) : null}
      </div>

      {error ? <p className="chat-error">{error}</p> : null}

      <form className="composer" onSubmit={onSubmit}>
        <label className="sr-only" htmlFor="venture-input">
          Message Venture 1
        </label>
        <input
          id="venture-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="What are you stuck on? Venture 1 will guide you..."
          maxLength={800}
          disabled={busy}
          autoComplete="off"
        />
        <button type="submit" disabled={busy || !input.trim()}>
          Send
        </button>
      </form>
    </section>
  );
}
