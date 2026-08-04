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
  "BEST FIT": "bg-teal text-white",
  "OPTION 2": "bg-ink text-white",
  "OPTION 3": "bg-muted/20 text-ink",
  "CONSIDER":  "bg-rust-soft text-rust",
};

function PropertyCardComponent({ card }: { card: ProjectCard }) {
  const badgeClass = BADGE_STYLES[card.badge || ""] || "bg-paper-2 text-muted";

  return (
    <div className="border border-line rounded-xl bg-paper overflow-hidden mb-3 shadow-sm">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 flex items-start justify-between gap-3 border-b border-line-soft">
        <div>
          <div className="font-semibold text-[15px] text-ink leading-tight">{card.name}</div>
          <div className="text-[12.5px] text-muted mt-0.5">
            {[card.location, card.developer, card.status].filter(Boolean).join(" · ")}
          </div>
        </div>
        {card.badge && (
          <span className={`shrink-0 text-[10.5px] font-semibold tracking-widest uppercase px-2.5 py-1 rounded-md ${badgeClass}`}>
            {card.badge}
          </span>
        )}
      </div>

      {/* Metrics Row */}
      {(card.from || card.netYield || card.pricePsf || card.vsArea) && (
        <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-line border-b border-line">
          {[
            { label: "FROM", value: card.from },
            { label: "NET YIELD", value: card.netYield },
            { label: "PRICE/SQFT", value: card.pricePsf },
            { label: "VS AREA", value: card.vsArea },
          ]
            .filter((m) => m.value)
            .map((metric) => (
              <div key={metric.label} className="px-4 py-3">
                <div className="text-[10px] font-semibold tracking-widest text-muted uppercase mb-1">
                  {metric.label}
                </div>
                <div className="text-[15px] font-semibold text-ink font-mono">
                  {metric.value}
                </div>
              </div>
            ))}
        </div>
      )}

      {/* Verdict + Pros/Cons */}
      <div className="px-4 py-3 space-y-2">
        {card.verdict && (
          <p className="text-[13.5px] text-ink leading-relaxed">{card.verdict}</p>
        )}
        <div className="space-y-1">
          {card.pros?.map((pro, i) => (
            <div key={i} className="flex gap-2 text-[12.5px] text-teal">
              <span className="shrink-0 font-bold">+</span>
              <span>{pro}</span>
            </div>
          ))}
          {card.cons?.map((con, i) => (
            <div key={i} className="flex gap-2 text-[12.5px] text-rust">
              <span className="shrink-0 font-bold">!</span>
              <span>{con}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Loading Progress Component ──────────────────────────────────────────────

const LOADING_STEPS = [
  "🔍 Querying live market database for matching properties…",
  "📊 Filtering 49+ projects by your budget & criteria…",
  "🤖 AI analyzing yields, sqft prices & handover dates…",
  "✨ Generating grounded property recommendations…",
];

function LoadingProgress() {
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setStepIndex((prev) => (prev < LOADING_STEPS.length - 1 ? prev + 1 : prev));
    }, 1800);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="my-3 p-4 border border-line rounded-xl bg-paper-2 shadow-xs space-y-3 animate-pulse">
      {/* Progress Bar Header */}
      <div className="flex items-center justify-between text-[12px] font-medium text-muted">
        <span className="flex items-center gap-2 text-teal">
          <span className="w-2 h-2 rounded-full bg-teal animate-ping" />
          Analyzing Market Data
        </span>
        <span className="font-mono text-[11px]">Step {stepIndex + 1} of {LOADING_STEPS.length}</span>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-line-soft h-1.5 rounded-full overflow-hidden">
        <div
          className="bg-teal h-full transition-all duration-700 ease-out"
          style={{ width: `${((stepIndex + 1) / LOADING_STEPS.length) * 100}%` }}
        />
      </div>

      {/* Step Status Text */}
      <div className="text-[13.5px] text-ink font-medium transition-all duration-300">
        {LOADING_STEPS[stepIndex]}
      </div>
    </div>
  );
}

// ─── Assistant Message Renderer ───────────────────────────────────────────────

function AssistantMessage({ msg }: { msg: Message }) {
  const ai = msg.aiResponse;

  // Structured card response
  if (ai?.projects && ai.projects.length > 0) {
    return (
      <div className="max-w-full mb-2">
        {ai.summary && (
          <p className="text-[13px] text-muted mb-3 italic">{ai.summary}</p>
        )}
        {ai.projects.map((card, i) => (
          <PropertyCardComponent key={i} card={card} />
        ))}
      </div>
    );
  }

  // Short answer response
  if (ai?.answer) {
    return (
      <div className="max-w-[88%] mb-2">
        <div className="p-3.5 border border-line-soft bg-paper text-ink rounded-2xl rounded-tl-sm shadow-xs text-[14.5px] leading-relaxed">
          {ai.answer}
        </div>
      </div>
    );
  }

  // Fallback: plain markdown
  return (
    <div className="max-w-[88%] mb-2">
      <div className="p-3.5 border border-line-soft bg-paper text-ink rounded-2xl rounded-tl-sm shadow-xs">
        <div className="prose prose-sm max-w-none text-ink">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
        </div>
      </div>
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
  const [messages, setMessages] = useState<Message[]>([
    {
      id: genId(),
      role: "bot",
      content: QUESTIONS[0].question,
      options: QUESTIONS[0].options,
    },
  ]);
  const chatRef = useRef<HTMLDivElement>(null);

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
            {messages.map((item) => (
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
                {item.role === "assistant" && <AssistantMessage msg={item} />}

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
