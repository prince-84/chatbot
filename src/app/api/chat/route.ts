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
    const priceVal = p.min_price && p.min_price > 0 ? `AED ${Math.round(p.min_price).toLocaleString()}` : "Price On Request";
    const loc = p.district || p.community || "Dubai";
    const status = p.construction_status ? p.construction_status.replace(/_/g, ' ').toUpperCase() : 'OFF PLAN';

    return {
      name,
      badge: badges[idx] || "CONSIDER",
      location: loc,
      developer: dev,
      status: completion,
      from: priceVal,
      verdict: `Grounded property record fetched live in ${loc}.`,
      pros: [
        `${status} development with ${p.units_count ? `${p.units_count} units` : 'available inventory'}`,
        `Official track record by ${dev}`
      ],
      cons: [
        `Live pricing subject to developer availability`
      ]
    };
  });

  return JSON.stringify({
    summary: "Based on your criteria, here are top grounded property recommendations retrieved from live market database:",
    projects
  });
}

export async function POST(req: Request) {
  let userMessage = 'Dubai properties';

  try {
    const body = await req.json();
    // Support both plain {text} and messages[] format
    if (body.text) {
      userMessage = body.text;
    } else if (Array.isArray(body.messages) && body.messages.length > 0) {
      const last = body.messages[body.messages.length - 1];
      userMessage = typeof last?.content === 'string' ? last.content : (last?.content?.[0]?.text || 'Dubai properties');
    }
  } catch {
    // keep default
  }

  // Attempt Anthropic Claude if key exists
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (anthropicKey) {
    try {
      const reellyProjects = await fetchReellyProjects();
      const systemPrompt = `You are an Advisory Assistant for Dubai residential real estate grounded in live property database records.
Here is live project data:
${JSON.stringify(reellyProjects.slice(0, 5))}

Answer the user query using ONLY the provided data.

Return a JSON object in this EXACT format (no extra text, just the JSON):
{
  "summary": "One sentence intro about the recommendations",
  "projects": [
    {
      "name": "Project Name",
      "badge": "BEST FIT",
      "location": "Community/Area Name",
      "developer": "Developer Name",
      "status": "Delivered 2025 OR Q4 2027",
      "from": "AED 1.2M",
      "netYield": "5.8%",
      "pricePsf": "1,240",
      "vsArea": "-4%",
      "verdict": "One clear sentence explaining why this fits.",
      "pros": ["Strength 1", "Strength 2"],
      "cons": ["Risk 1", "Risk 2"]
    }
  ]
}

Rules:
- badge values: "BEST FIT", "OPTION 2", "OPTION 3", "CONSIDER"
- Show max 3 projects
- netYield: calculate from Reelly data if available, else omit field
- pricePsf: from Reelly data if available, else omit field  
- vsArea: price vs community average if calculable, else omit
- pros/cons: max 2 each, short factual sentences only
- If user asks a general question (not for properties), return: {"answer": "your short answer here"}`;


      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': anthropicKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 1200,
          system: systemPrompt,
          messages: [{ role: 'user', content: userMessage }],
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const text = data.content?.[0]?.text || '';
        if (text) {
          return new Response(`0:${JSON.stringify(text)}\n`, {
            headers: { 'Content-Type': 'text/plain; charset=utf-8' },
          });
        }
      }
    } catch (e) {
      console.warn('Anthropic error, falling back to Reelly data engine.');
    }
  }

  // Fallback: direct Reelly data formatting
  const reellyProjects = await fetchReellyProjects();
  const responseText = buildReellyResponse(reellyProjects, userMessage);

  return new Response(`0:${JSON.stringify(responseText)}\n`, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
