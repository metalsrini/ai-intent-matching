// Tavily web search client. Returns numbered sources for citation-grounded chat.
//
// Tavily was chosen because:
//   - Free tier returns extracted page content (no fetcher/parser needed on
//     our Render free instance)
//   - 1K queries/month free, plenty for the POC
//   - Clean JSON contract, low latency (~1–2s typical)
//
// Docs: https://docs.tavily.com/docs/rest-api/api-reference

const TAVILY_ENDPOINT = "https://api.tavily.com/search";

export interface SearchSource {
  url: string;
  title: string;
  snippet: string;
  domain: string;
}

interface TavilyResult {
  title?: string;
  url: string;
  content?: string;
  score?: number;
}

function domainOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

export async function searchWeb(
  query: string,
  maxResults = 5
): Promise<SearchSource[]> {
  const key = process.env.TAVILY_API_KEY;
  if (!key) return [];

  const trimmed = query.trim();
  if (!trimmed) return [];

  try {
    const res = await fetch(TAVILY_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: key,
        query: trimmed.slice(0, 400),
        search_depth: "basic",
        max_results: maxResults,
        include_answer: false,
        include_raw_content: false,
        include_images: false,
      }),
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      console.error("[tavily] non-ok status:", res.status, await res.text());
      return [];
    }

    const data = (await res.json()) as { results?: TavilyResult[] };
    if (!Array.isArray(data.results)) return [];

    return data.results.slice(0, maxResults).map((r) => ({
      url: r.url,
      title: r.title || domainOf(r.url) || r.url,
      snippet: (r.content || "").slice(0, 800),
      domain: domainOf(r.url),
    }));
  } catch (err) {
    console.error("[tavily] request failed:", err);
    return [];
  }
}

// Build the numbered-sources block we inject into the LLM prompt.
// The LLM uses these [n] indices when citing.
export function formatSourcesForPrompt(sources: SearchSource[]): string {
  if (sources.length === 0) return "";
  return sources
    .map((s, i) => `[${i + 1}] ${s.title} — ${s.url}\n${s.snippet}`)
    .join("\n\n");
}

// We persist sources alongside the assistant message content using a tagged
// HTML comment. Markdown renderers ignore HTML comments, so this is invisible
// to the user, and we can strip it on read.
const SOURCES_MARKER_PREFIX = "<!-- __INTENT_SOURCES__ ";
const SOURCES_MARKER_SUFFIX = " __INTENT_SOURCES__ -->";

export function attachSourcesToContent(
  content: string,
  sources: SearchSource[]
): string {
  if (sources.length === 0) return content;
  return `${content}\n\n${SOURCES_MARKER_PREFIX}${JSON.stringify(sources)}${SOURCES_MARKER_SUFFIX}`;
}

export function extractSourcesFromContent(stored: string): {
  content: string;
  sources: SearchSource[];
} {
  const start = stored.lastIndexOf(SOURCES_MARKER_PREFIX);
  if (start === -1) return { content: stored, sources: [] };

  const after = stored.slice(start + SOURCES_MARKER_PREFIX.length);
  const end = after.indexOf(SOURCES_MARKER_SUFFIX);
  if (end === -1) return { content: stored, sources: [] };

  const json = after.slice(0, end);
  try {
    const sources = JSON.parse(json) as SearchSource[];
    const cleaned = stored.slice(0, start).trimEnd();
    return { content: cleaned, sources };
  } catch {
    return { content: stored, sources: [] };
  }
}
