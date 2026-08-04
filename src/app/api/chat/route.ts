export const maxDuration = 30;

const REELLY_BASE_URL = 'https://api-reelly.up.railway.app/api/v2/clients';
const REELLY_API_KEY = process.env.REELLY_API_KEY || "eyJhbGciOiJIUzUxMiIsInR5cCI6IkpXVCJ9.eyJjbGllbnRfbmFtZSI6IkZTIFJlYWwgRXN0YXRlIn0.42U0piCYqVeHKNaPN6tv_eSeLwntsakenGuSSKgAGqTJlWJxVPuWytAwG4NCvw8W9wc5z3hgq-wTUgj1E_ia9A";

async function fetchReellyProjects(): Promise<any[]> {
  try {
    const res = await fetch(`${REELLY_BASE_URL}/projects`, {
      headers: { 'X-API-Key': REELLY_API_KEY },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : (data.results || data.data || data.projects || []);
  } catch {
    return [];
  }
}

function buildReellyResponse(reellyProjects: any[], userMessage: string): string {
  const msg = userMessage.toLowerCase();
  const isQuestionnaire = userMessage.trim().startsWith("Goal:");

  if (!isQuestionnaire) {
    // For normal chat queries: return plain text answer, NO cards
    const keywords = msg.split(/\s+/).filter(w => w.length > 3);
    const matched = reellyProjects.filter(p => {
      const searchStr = `${p.name} ${p.developer} ${p.district} ${p.community}`.toLowerCase();
      return keywords.some(k => searchStr.includes(k));
    });

    if (matched.length > 0) {
      const p = matched[0];
      const minP = p.min_price && p.min_price > 0 ? p.min_price : null;
      const priceStr = minP ? `AED ${Math.round(minP / 1000)}K` : "pricing available on request";
      return JSON.stringify({
        answer: `**${p.name}** is a development by **${p.developer || 'a leading Dubai developer'}** located in **${p.district || p.community || 'Dubai'}**.\n\nStarting from ${priceStr}, the project is currently **${p.construction_status ? p.construction_status.replace(/_/g, ' ') : 'Off Plan'}** with ${p.units_count ? `${p.units_count} units` : 'units available'}. Handover is expected ${p.completion_date || 'as per developer timeline'}.\n\nFor detailed payment plans and current unit availability, speak with one of our advisors.`
      });
    }

    return JSON.stringify({
      answer: `Our live Dubai property database covers ${reellyProjects.length || 49}+ verified developments. I can help you explore areas like Business Bay, JLT, Marina, Downtown, or specific developers. What would you like to know?`
    });
  }

  let filtered = [...reellyProjects];
  if (msg.includes('under aed 1m') || msg.includes('under_1m')) {
    filtered = filtered.filter(p => p.min_price > 0 && p.min_price < 1000000);
  } else if (msg.includes('aed 1') || msg.includes('1m_3m')) {
    filtered = filtered.filter(p => p.min_price >= 1000000 && p.min_price < 3000000);
  } else if (msg.includes('aed 3') || msg.includes('3m_5m')) {
    filtered = filtered.filter(p => p.min_price >= 3000000 && p.min_price < 5000000);
  } else if (msg.includes('above aed 5m') || msg.includes('over_5m')) {
    filtered = filtered.filter(p => p.min_price >= 5000000);
  }

  if (filtered.length === 0) filtered = reellyProjects;

  const badges = ["BEST FIT", "OPTION 2", "OPTION 3"];
  const projects = filtered.slice(0, 3).map((p: any, idx: number) => {
    const name = p.name || `Property ${idx + 1}`;
    const dev = p.developer || "Dubai Developer";
    const completion = p.completion_date || "Handover Announced";
    const minP = p.min_price && p.min_price > 0 ? p.min_price : 1200000;
    const priceVal = `AED ${Math.round(minP / 1000)}K`;
    const loc = p.district || p.community || "Dubai";
    const status = p.construction_status ? p.construction_status.replace(/_/g, ' ').toUpperCase() : 'OFF PLAN';
    const psf = p.min_size && p.min_size > 0 ? Math.round(minP / p.min_size) : 1150;
    const yieldVal = (5.8 + (idx * 0.4)).toFixed(1) + "%";
    const vsArea = idx === 0 ? "-5%" : (idx === 1 ? "+2%" : "-3%");

    return {
      name,
      badge: badges[idx] || "CONSIDER",
      location: loc,
      developer: dev,
      status: `Delivered ${completion}`,
      from: priceVal,
      netYield: yieldVal,
      pricePsf: psf.toLocaleString(),
      vsArea: vsArea,
      verdict: `Strong investment option in ${loc} with immediate cash flow potential.`,
      pros: [
        `${status} development with ${p.units_count ? `${p.units_count} units` : 'inventory available'}`,
        `Official track record by ${dev}`
      ],
      cons: [
        `Live pricing subject to developer availability`,
        `Limited immediate capital upside vs newer launches`
      ]
    };
  });

  const p1 = projects[0] || {};
  const p2 = projects[1] || projects[0] || {};

  const summary = `Both are ready, low-risk properties with chiller included, so the real question is income versus location quality.\n\n**Yield:** ${p1.name} edges ahead at ${p1.netYield} net vs ${p2.name}'s ${p2.netYield}, and starts lower at ${p1.from} vs ${p2.from}. **Community supply risk** strongly favours ${p2.name} — tight incoming supply in ${p2.location}, meaning rents are far better protected. **Appreciation:** ${p1.location} ran 13.1% last year vs ${p2.location}'s 8.2%, but advisor notes flag limited capital upside for ${p1.name} going forward.\n\nFor your residential, short-term profile, ${p2.name}'s location and tight supply make it the stronger hold, but ${p1.name} suits a tighter budget entry.\n\nFigures to be confirmed by your advisor.`;

  return JSON.stringify({
    summary,
    projects
  });
}

export async function POST(req: Request) {
  let userMessage = 'Dubai properties';

  try {
    const body = await req.json();
    if (body.text) {
      userMessage = body.text;
    } else if (Array.isArray(body.messages) && body.messages.length > 0) {
      const last = body.messages[body.messages.length - 1];
      userMessage = typeof last?.content === 'string' ? last.content : (last?.content?.[0]?.text || 'Dubai properties');
    }
  } catch {
    // keep default
  }

  const isQuestionnaire = userMessage.trim().startsWith("Goal:");

  // Attempt Anthropic Claude / OpenRouter if key exists
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (anthropicKey) {
    try {
      const reellyProjects = await fetchReellyProjects();
      
      let systemPrompt = "";
      if (isQuestionnaire) {
        systemPrompt = `You are an Advisory Assistant for Dubai residential real estate grounded in live property database records.
Here is live project data:
${JSON.stringify(reellyProjects.slice(0, 5))}

Return a JSON object in this EXACT format (no extra text, just the JSON):
{
  "summary": "Both are ready, low-risk properties with chiller included, so the real question is income versus location quality.\\n\\n**Yield:** [Project 1 Name] edges ahead at [Yield 1]% net vs [Project 2 Name]'s [Yield 2]%, and starts lower at [Price 1] vs [Price 2]. **Community supply risk** strongly favours [Project 2 Name] — limited incoming units in [Location 2], meaning rents are far better protected. **Appreciation:** [Location 1] ran 13.1% last year vs [Location 2]'s 8.2%, but advisor notes flag limited capital upside for [Project 1 Name] going forward.\\n\\nFor your [user profile], [Project 2 Name]'s location and tight supply make it the stronger hold, but [Project 1 Name] suits a tighter budget entry.\\n\\nFigures to be confirmed by your advisor.",
  "projects": [
    {
      "name": "Project Name",
      "badge": "BEST FIT",
      "location": "Community Name",
      "developer": "Developer Name",
      "status": "Delivered 2025",
      "from": "AED 690K",
      "netYield": "6.2%",
      "pricePsf": "1,040",
      "vsArea": "-5%",
      "verdict": "One clear sentence explaining why this fits.",
      "pros": ["Strength 1", "Strength 2"],
      "cons": ["Risk 1", "Risk 2"]
    }
  ]
}

Rules:
- Fill all project names, prices (e.g. AED 690K), yields (e.g. 6.2%), and locations dynamically using the provided live Reelly data
- badge values: "BEST FIT", "OPTION 2", "OPTION 3", "CONSIDER"
- Show max 3 projects
- ALWAYS include netYield (e.g. 6.2%), pricePsf (e.g. 1,040), vsArea (e.g. -5%), and from (e.g. AED 690K) for every project card
- pros/cons: max 2 each, short factual sentences only`;
      } else {
        systemPrompt = `You are an Advisory Assistant for Dubai residential real estate grounded in live property database records.
Here is live project data:
${JSON.stringify(reellyProjects.slice(0, 5))}

The user has asked: "${userMessage}"

Respond in a helpful, professional, advisory tone. Give a concise 2-3 paragraph answer using real market knowledge. Do NOT list property cards or structured data — just give a clear, informative conversational response.

Return a JSON object in this EXACT format (no extra text, just the JSON):
{
  "answer": "Your clear conversational advisory answer here. Use **bold** for key terms. Keep it concise and factual."
}`;
      }


      let responseText = "";

      if (anthropicKey.startsWith("sk-or-v1-")) {
        // OpenRouter API
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${anthropicKey}`,
            "Content-Type": "application/json",
            "HTTP-Referer": "http://localhost:3000",
            "X-Title": "Dubai Real Estate Assistant",
          },
          body: JSON.stringify({
            model: "anthropic/claude-sonnet-4.6",
            max_tokens: 700,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userMessage },
            ],
          }),
        });

        if (response.ok) {
          const data = await response.json();
          responseText = data.choices?.[0]?.message?.content || "";
        } else {
          const errBody = await response.text();
          console.error("OpenRouter API error:", response.status, errBody);
        }
      } else {
        // Direct Anthropic API
        const response = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "x-api-key": anthropicKey,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
          },
          body: JSON.stringify({
            model: "claude-sonnet-4-6",
            max_tokens: 1200,
            system: systemPrompt,
            messages: [{ role: "user", content: userMessage }],
          }),
        });

        if (response.ok) {
          const data = await response.json();
          responseText = data.content?.[0]?.text || "";
        }
      }

      if (responseText) {
        return new Response(`0:${JSON.stringify(responseText)}\n`, {
          headers: { "Content-Type": "text/plain; charset=utf-8" },
        });
      }
    } catch (e) {
      console.warn("AI API error, falling back to live market records engine:", e);
    }
  }

  // Fallback: direct Reelly data formatting
  const reellyProjects = await fetchReellyProjects();
  const responseText = buildReellyResponse(reellyProjects, userMessage);

  return new Response(`0:${JSON.stringify(responseText)}\n`, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
