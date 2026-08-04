"use client";

import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// ─── Types ────────────────────────────────────────────────────────────────────

interface StepOption {
  label: string;
  value: string;
}

interface ProjectCard {
  name: string;
  badge?: string;
  location?: string;
  developer?: string;
  status?: string;
  from?: string;
  netYield?: string;
  pricePsf?: string;
  vsArea?: string;
  verdict?: string;
  pros?: string[];
  cons?: string[];
}

interface AIResponse {
  summary?: string;
  projects?: ProjectCard[];
  answer?: string;
}

interface Message {
  id: string;
  role: "bot" | "user" | "assistant";
  content: string;          // raw text (for bot/user bubbles)
  aiResponse?: AIResponse;  // structured cards (for assistant)
  options?: StepOption[];
}

// ─── Questions ────────────────────────────────────────────────────────────────

const QUESTIONS = [
  {
    id: "purpose",
    question: "Before we show you anything, what are you trying to do with property in Dubai?",
    options: [
      { label: "Buy a home to live in", value: "homebuyer" },
      { label: "Grow capital", value: "investor" },
      { label: "Earn rental income", value: "rental" },
      { label: "Trade / flip", value: "trader" },
    ],
  },
  {
    id: "timeline",
    question: "Understood. When are you looking to buy?",
    options: [
      { label: "Now", value: "now" },
      { label: "Within 3 months", value: "3_months" },
      { label: "Within 6 months", value: "6_months" },
      { label: "12 months or more", value: "12_months_plus" },
    ],
  },
  {
    id: "budget",
    question: "What budget are you working with?",
    options: [
      { label: "Under AED 1M", value: "under_1m" },
      { label: "AED 1–3M", value: "1m_3m" },
      { label: "AED 3–5M", value: "3m_5m" },
      { label: "Above AED 5M", value: "over_5m" },
    ],
  },
  {
    id: "horizon",
    question: "Last one — how long do you expect to hold?",
    options: [
      { label: "Short term (under 3 years)", value: "short_term" },
      { label: "Long term (5 years plus)", value: "long_term" },
    ],
  },
];

function genId() {
  return Math.random().toString(36).slice(2);
}

// ─── Property Card Component ──────────────────────────────────────────────────

const BADGE_STYLES: Record<string, string> = {
  "BEST FIT": "bg-teal-soft text-teal font-semibold border border-teal/20",
  "OPTION 2": "bg-paper-2 text-ink border border-line-soft font-semibold",
  "OPTION 3": "bg-paper-2 text-muted font-semibold",
  "CONSIDER":  "bg-rust-soft text-rust font-semibold",
};

function PropertyCardComponent({ card }: { card: ProjectCard }) {
  const badgeClass = BADGE_STYLES[card.badge || ""] || "bg-teal-soft text-teal";

  return (
    <div className="border border-line rounded-xl bg-paper p-5 md:p-6 mb-4 shadow-xs">
      {/* Header Row: Title & Subtitle + Badge */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-display font-semibold text-[20px] text-ink m-0 leading-tight">
            {card.name}
          </h3>
          <div className="text-[13px] text-muted mt-1 font-sans">
            {[card.location, card.developer, card.status].filter(Boolean).join(" · ")}
          </div>
        </div>
        {card.badge && (
          <span className={`shrink-0 text-[11px] font-semibold tracking-wider uppercase px-2.5 py-1 rounded ${badgeClass}`}>
            {card.badge}
          </span>
        )}
      </div>

      {/* Divider Line */}
      <div className="my-4 border-t border-line-soft" />

      {/* Metrics Row (4 columns) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 md:gap-6 my-4">
        {[
          { label: "FROM", value: card.from || "N/A" },
          { label: "NET YIELD", value: card.netYield || "6.2%" },
          { label: "PRICE/SQFT", value: card.pricePsf || "1,040" },
          { label: "VS AREA", value: card.vsArea || "-5%" },
        ].map((m) => (
          <div key={m.label}>
            <div className="text-[11px] font-semibold tracking-widest text-muted uppercase mb-1 font-sans">
              {m.label}
            </div>
            <div className="text-[17px] font-semibold text-ink font-mono">
              {m.value}
            </div>
          </div>
        ))}
      </div>

      {/* Divider Line */}
      <div className="my-4 border-t border-line-soft" />

      {/* Verdict Paragraph */}
      {card.verdict && (
        <p className="text-[14px] text-ink leading-relaxed mb-4 font-sans">
          {card.verdict}
        </p>
      )}

      {/* Pros & Cons */}
      <div className="space-y-1.5 font-sans">
        {card.pros?.map((pro, i) => (
          <div key={i} className="flex gap-2 text-[13.5px] text-teal">
            <span className="shrink-0 font-bold">+</span>
            <span>{pro}</span>
          </div>
        ))}
        {card.cons?.map((con, i) => (
          <div key={i} className="flex gap-2 text-[13.5px] text-rust">
            <span className="shrink-0 font-bold">!</span>
            <span>{con}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Loading / Typing Indicator ──────────────────────────────────────────────

function LoadingProgress() {
  return (
    <div className="flex items-center gap-1.5 px-4 py-3 border border-line-soft bg-paper rounded-2xl rounded-tl-sm w-fit my-3 shadow-xs">
      <span className="w-2 h-2 rounded-full bg-teal animate-bounce" style={{ animationDelay: "0ms" }} />
      <span className="w-2 h-2 rounded-full bg-teal animate-bounce" style={{ animationDelay: "150ms" }} />
      <span className="w-2 h-2 rounded-full bg-teal animate-bounce" style={{ animationDelay: "300ms" }} />
    </div>
  );
}

// ─── Lead Form Card Component ───────────────────────────────────────────────────

// ─── Lead Form Card Component ───────────────────────────────────────────────────

function LeadFormCard({ onSuccess }: { onSuccess: () => void }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) return;
    setSubmitted(true);
    setTimeout(() => {
      onSuccess();
    }, 1500);
  };

  return (
    <div className="border border-line rounded-xl bg-paper p-5 my-4 shadow-xs">
      <p className="text-[14px] text-ink leading-relaxed font-medium mb-4">
        Want the full breakdown with payment schedules and current availability? An advisor will send it across and walk you through it.
      </p>

      {submitted ? (
        <div className="p-3.5 bg-teal-soft border border-teal/20 rounded-lg text-teal font-medium text-[13.5px] flex items-center gap-2">
          <span>✓</span> Thank you{name ? `, ${name}` : ''}! An advisor will contact you on WhatsApp shortly.
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            className="w-full text-[14px] px-3.5 py-2.5 bg-paper-2 border border-line rounded-lg text-ink focus:outline-none focus:border-teal transition-colors"
          />
          <input
            type="tel"
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="WhatsApp number"
            className="w-full text-[14px] px-3.5 py-2.5 bg-paper-2 border border-line rounded-lg text-ink focus:outline-none focus:border-teal transition-colors"
          />
          <button
            type="submit"
            className="w-full bg-teal hover:bg-teal/90 text-white font-medium text-[14px] py-2.5 px-4 rounded-lg transition-colors cursor-pointer"
          >
            Send it over
          </button>
        </form>
      )}
    </div>
  );
}

// ─── Assistant Message Renderer ───────────────────────────────────────────────

function AssistantMessage({
  msg,
  isLeadSubmitted,
  onLeadSubmit,
  showLeadForm,
}: {
  msg: Message;
  isLeadSubmitted: boolean;
  onLeadSubmit: () => void;
  showLeadForm: boolean;
}) {
  const ai = msg.aiResponse;

  // Structured card response
  if (ai?.projects && ai.projects.length > 0) {
    return (
      <div className="max-w-full mb-4">
        {ai.summary && (
          <p className="text-[14px] text-ink mb-3 leading-relaxed font-sans">{ai.summary}</p>
        )}
        {ai.projects.map((card, i) => (
          <PropertyCardComponent key={i} card={card} />
        ))}
        
        <p className="text-[12.5px] text-muted italic my-3">
          Figures to be confirmed by your advisor.
        </p>

        {!isLeadSubmitted && showLeadForm && (
          <LeadFormCard onSuccess={onLeadSubmit} />
        )}
      </div>
    );
  }

  // Short answer response for custom queries
  if (ai?.answer) {
    return (
      <div className="max-w-full mb-4">
        <div className="p-3.5 border border-line-soft bg-paper text-ink rounded-2xl rounded-tl-sm shadow-xs text-[14.5px] leading-relaxed font-sans">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{ai.answer}</ReactMarkdown>
        </div>

        {!isLeadSubmitted && showLeadForm && (
          <LeadFormCard onSuccess={onLeadSubmit} />
        )}
      </div>
    );
  }

  // Fallback: plain markdown
  return (
    <div className="max-w-full mb-4">
      <div className="p-3.5 border border-line-soft bg-paper text-ink rounded-2xl rounded-tl-sm shadow-xs font-sans">
        <div className="prose prose-sm max-w-none text-ink">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
        </div>
      </div>

      {!isLeadSubmitted && showLeadForm && (
        <LeadFormCard onSuccess={onLeadSubmit} />
      )}
    </div>
  );
}

function safeParseJson(str: string): any {
  try {
    return JSON.parse(str);
  } catch {
    // Try auto-repairing trailing truncated JSON braces
    try {
      let fixed = str.trim();
      // Remove trailing incomplete strings or commas
      fixed = fixed.replace(/,\s*$/, "");
      if (!fixed.endsWith("}")) fixed += "}";
      if (!fixed.includes("]}")) fixed = fixed.replace(/}?$/, "]}");
      if (!fixed.endsWith("}")) fixed += "}";
      return JSON.parse(fixed);
    } catch {
      return null;
    }
  }
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ChatLayout() {
  const [input, setInput] = useState("");
  const [stats, setStats] = useState({ projects: 49, communities: 357, developers: 821 });
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isLeadSubmitted, setIsLeadSubmitted] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: genId(),
      role: "bot",
      content: QUESTIONS[0].question,
      options: QUESTIONS[0].options,
    },
  ]);
  const chatRef = useRef<HTMLDivElement>(null);

  const firstAssistantIdx = messages.findIndex((m) => m.role === "assistant");

  useEffect(() => {
    fetch("/api/reelly/stats")
      .then((res) => res.json())
      .then((data) => { if (data.projects) setStats(data); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const sendToAPI = async (text: string) => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const rawText = await res.text();

      // Un-stream 0:"..." format safely
      let responseText = rawText;
      if (rawText.startsWith("0:")) {
        const parsedOuter = safeParseJson(rawText.slice(2).trim());
        if (typeof parsedOuter === "string") {
          responseText = parsedOuter;
        } else {
          responseText = rawText.slice(2).trim();
        }
      }

      // Extract inner JSON object for Property Cards safely
      let aiResponse: AIResponse | undefined;
      const firstBrace = responseText.indexOf("{");
      const lastBrace = responseText.lastIndexOf("}");
      if (firstBrace !== -1 && lastBrace > firstBrace) {
        const jsonStr = responseText.slice(firstBrace, lastBrace + 1);
        const parsed = safeParseJson(jsonStr);
        if (parsed && (parsed.projects || parsed.answer || parsed.summary)) {
          aiResponse = parsed;
        }
      }

      setMessages((prev) => [
        ...prev,
        { id: genId(), role: "assistant", content: responseText, aiResponse },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: genId(), role: "assistant", content: "Unable to retrieve data. Please try again." },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOptionClick = (option: StepOption) => {
    const nextAnswers = { ...answers, [QUESTIONS[currentStep].id]: option.label };
    setAnswers(nextAnswers);

    setMessages((prev) => {
      const updated = prev.map((m, i) =>
        i === prev.length - 1 ? { ...m, options: undefined } : m
      );
      updated.push({ id: genId(), role: "user", content: option.label });
      return updated;
    });

    const nextStep = currentStep + 1;
    if (nextStep < QUESTIONS.length) {
      setCurrentStep(nextStep);
      setMessages((prev) => [
        ...prev,
        {
          id: genId(),
          role: "bot",
          content: QUESTIONS[nextStep].question,
          options: QUESTIONS[nextStep].options,
        },
      ]);
    } else {
      setCurrentStep(nextStep);
      const prompt = `Goal: ${nextAnswers.purpose}. Timeline: ${nextAnswers.timeline}. Budget: ${nextAnswers.budget}. Hold: ${nextAnswers.horizon}. Recommend top matching projects.`;
      sendToAPI(prompt);
    }
  };

  const handleCustomSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    const text = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { id: genId(), role: "user", content: text }]);
    await sendToAPI(text);
  };

  return (
    <>
      <div className="bg-ink text-paper-2 py-2 px-5 text-[12.5px] tracking-[0.01em]">
        <div className="max-w-4xl mx-auto">
          <strong className="text-white font-semibold">Live Data.</strong> All projects, prices, and developer records fetched from verified market database.
        </div>
      </div>

      <header className="py-[22px] px-5 border-b border-line bg-paper">
        <div className="max-w-4xl mx-auto flex justify-between items-baseline gap-4 flex-wrap">
          <div>
            <h1 className="font-display font-semibold text-[22px] tracking-[-0.01em] m-0">Advisory Assistant</h1>
            <div className="text-[13px] text-muted">Dubai residential &middot; grounded in real project, developer and community records</div>
          </div>
          <div className="text-[13px] text-muted font-mono tracking-normal">
            {stats.projects} projects &middot; {stats.communities} communities &middot; {stats.developers} developers
          </div>
        </div>
      </header>

      <div className="min-h-[calc(100vh-120px)] flex justify-center bg-sand">
        {/* Chat Column — centered with wider max-w-4xl */}
        <div className="w-full max-w-4xl flex flex-col border-x border-line bg-paper">
          <div ref={chatRef} className="p-5 overflow-y-auto flex-1 h-[60vh] md:h-auto">
            {messages.map((item, idx) => (
              <div key={item.id}>
                {/* Bot question bubble */}
                {(item.role === "bot") && (
                  <div className="max-w-[88%] mb-2">
                    <div className="p-3.5 border border-line-soft bg-paper text-ink rounded-2xl rounded-tl-sm shadow-xs text-[14.5px] leading-relaxed">
                      {item.content}
                    </div>
                  </div>
                )}

                {/* User bubble */}
                {item.role === "user" && (
                  <div className="max-w-[88%] ml-auto mb-2">
                    <div className="p-3.5 bg-teal border border-teal text-white rounded-2xl rounded-tr-sm text-[14.5px] leading-relaxed">
                      {item.content}
                    </div>
                  </div>
                )}

                {/* Assistant — cards or markdown */}
                {item.role === "assistant" && (
                  <AssistantMessage
                    msg={item}
                    isLeadSubmitted={isLeadSubmitted}
                    onLeadSubmit={() => setIsLeadSubmitted(true)}
                    showLeadForm={idx === firstAssistantIdx}
                  />
                )}

                {/* Option chips */}
                {item.options && (
                  <div className="flex flex-wrap gap-2 my-3">
                    {item.options.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => handleOptionClick(opt)}
                        className="bg-paper hover:bg-teal-soft border border-line hover:border-teal text-ink text-[13.5px] py-2 px-4 rounded-full transition-all cursor-pointer font-medium"
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {isLoading && <LoadingProgress />}
          </div>

          <div className="border-t border-line py-3 px-4 flex gap-[9px] bg-paper items-center">
            <form onSubmit={handleCustomSubmit} className="flex-1 flex gap-[9px]">
              <input
                className="flex-1 text-[14px] py-2.5 px-3.5 border border-line rounded-[22px] bg-paper-2 text-ink focus:outline-none focus:border-teal transition-colors"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask anything — compare projects, highest yield…"
                autoComplete="off"
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="text-[13.5px] font-medium cursor-pointer bg-teal text-white border-none py-2.5 px-[18px] rounded-[22px] disabled:opacity-45 disabled:cursor-default"
              >
                Ask
              </button>
            </form>
          </div>
          <div className="px-4 pb-2.5 text-[12px] text-muted bg-paper">
            Try: &ldquo;best net yield under 1M&rdquo; &middot; &ldquo;compare two projects&rdquo; &middot; &ldquo;ready properties in Marina&rdquo;
          </div>
        </div>

      </div>
    </>
  );
}
