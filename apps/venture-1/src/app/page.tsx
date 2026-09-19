import { ChatPanel } from "@/components/ChatPanel";

export default function Home() {
  return (
    <main className="page">
      <div className="sky" aria-hidden>
        <div className="sun" />
        <div className="cloud cloud-a" />
        <div className="cloud cloud-b" />
        <div className="cloud cloud-c" />
        <div className="hill hill-back" />
        <div className="hill hill-front" />
      </div>

      <header className="nav">
        <a className="brand-mark" href="#top">
          <span className="logo-orb" aria-hidden />
          Venture 1
        </a>
        <a className="nav-safe" href="#safety">
          Safety
        </a>
      </header>

      <section id="top" className="hero">
        <p className="brand">Venture 1</p>
        <h1>A kid tutor that guides — never spoils</h1>
        <p className="lede">
          Hints, questions, and tiny steps so children learn how to think, not just copy an answer.
        </p>
        <div className="cta-row">
          <a className="cta primary" href="#chat">
            Start tutoring
          </a>
          <a className="cta ghost" href="#safety">
            How Venture 1 teaches safely
          </a>
        </div>
      </section>

      <ChatPanel />

      <section id="safety" className="safety">
        <h2>Tutor first, safe always</h2>
        <p>
          Venture 1 asks guiding questions instead of giving answers away. It refuses scary or adult
          topics, never asks for personal details, and uses moderation when an API key is
          connected. Parents can review the chat anytime.
        </p>
      </section>

      <footer className="footer">
        <span>Venture 1</span>
        <span>A kid-safe Socratic tutor</span>
      </footer>
    </main>
  );
}
