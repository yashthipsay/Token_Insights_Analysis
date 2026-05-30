import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import fs from "fs";
import * as cheerio from "cheerio";
import "dotenv/config";

// Initialize express app
const app = express();
app.use(express.json());
const PORT = 3000;

// Types for web search results
interface SearchResult {
  title: string;
  snippet: string;
  url: string;
}

interface WebSearchResponse {
  results: SearchResult[];
  rawContext: string;
  query: string;
}

// Helper: Scrape DuckDuckGo Lite search results for real-time web context
async function searchWeb(query: string, maxResults: number = 10): Promise<WebSearchResponse> {
  try {
    // Use DuckDuckGo Lite — a table-based, text-browser-friendly endpoint
    // that serves real results without CAPTCHA/bot challenges
    const encodedQuery = encodeURIComponent(query);
    const response = await fetch(`https://lite.duckduckgo.com/lite/?q=${encodedQuery}`, {
      method: "GET",
      headers: {
        // Lynx-style User-Agent to match the expected Lite client profile
        "User-Agent": "Lynx/2.8.9rel.1 libwww-FM/2.14 SSL-MM/1.4.1 OpenSSL/1.1.1",
        "Accept": "text/html",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });

    if (!response.ok) {
      console.error(`[Web Search] DuckDuckGo Lite returned status ${response.status}`);
      return { results: [], rawContext: "Web search unavailable.", query };
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    const results: SearchResult[] = [];

    // DuckDuckGo Lite uses a table layout:
    //   - Links have class 'result-link' with the title text and href containing the redirect URL
    //   - Snippets are in <td class='result-snippet'> elements
    //   - Each result has a link row followed by a snippet row in the table

    const links = $("a.result-link");
    const snippets = $("td.result-snippet");

    const count = Math.min(links.length, snippets.length, maxResults);

    for (let i = 0; i < count; i++) {
      const linkEl = $(links[i]);
      const snippetEl = $(snippets[i]);

      const title = linkEl.text().trim();
      const snippet = snippetEl.text().trim();

      // Extract the real URL from DuckDuckGo's redirect wrapper
      // Format: //duckduckgo.com/l/?uddg=https%3A%2F%2Fexample.com%2F&rut=...
      const rawHref = linkEl.attr("href") || "";
      let url = rawHref;
      try {
        const uddgMatch = rawHref.match(/uddg=([^&]+)/);
        if (uddgMatch) {
          url = decodeURIComponent(uddgMatch[1]);
        }
      } catch {
        // Keep the raw href if decoding fails
      }

      if (title && snippet) {
        results.push({ title, snippet, url });
      }
    }

    // Build formatted context string for the AI prompt
    const rawContext = results.length > 0
      ? results.map((r, i) => `${i + 1}. "${r.title}" (${r.url})\n   ${r.snippet}`).join("\n\n")
      : "No relevant search results found.";

    console.log(`[Web Search] Query: "${query}" → ${results.length} results scraped from DuckDuckGo Lite`);

    return { results, rawContext, query };
  } catch (error) {
    console.error("[Web Search] DuckDuckGo scrape error:", error);
    return { results: [], rawContext: "Web search failed.", query };
  }
}

// Helper: Search for recent token news and market sentiment
async function searchTokenNews(tokenName: string, tokenSymbol: string, vsCurrency: string = "usd"): Promise<WebSearchResponse> {
  const query = `${tokenName} ${tokenSymbol.toUpperCase()} to ${vsCurrency.toUpperCase()} crypto latest news price analysis`;
  return searchWeb(query);
}

// Helper: Get AI-powered market insight using Groq (free open-source models)
async function getAIInsight(tokenData: any, newsContext: string) {
  const baseUrl = process.env.AI_BASE_URL || "https://api.groq.com/openai/v1";
  const apiKey = process.env.AI_API_KEY;
  const model = process.env.AI_MODEL_NAME || "llama-3.3-70b-versatile";

  const prompt = `You are a crypto market analyst. Analyze this token's market data AND recent news headlines to provide an informed market insight.

Return ONLY a JSON object with this shape: {"reasoning": "...", "sentiment": "Bullish" | "Bearish" | "Neutral"}

Market Data:
${JSON.stringify(tokenData, null, 2)}

Recent News Headlines:
${newsContext}

Base your reasoning on BOTH the numerical market data and the news sentiment. Be specific about what factors drive your conclusion.`;

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model,
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" }
      })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || "AI API Error");

    const analysis = JSON.parse(data.choices[0].message.content);
    return {
      insight: {
        reasoning: analysis.reasoning || "Could not determine reasoning.",
        sentiment: analysis.sentiment || "Neutral"
      },
      model: { provider: baseUrl.includes("groq") ? "groq" : "custom", model: model }
    };
  } catch (error) {
    console.error("AI Insight Error:", error);
    return {
      insight: { reasoning: "Error connecting to AI Provider.", sentiment: "Unknown" },
      model: { provider: "error", model: model }
    };
  }
}

// 1. Token Insight API (with web search)
app.post("/api/token/:id/insight", async (req, res) => {
  try {
    const { id } = req.params;
    const { vs_currency = "btc", history_days = 30 } = req.body;

    // Step 1: Fetch Token Data from CoinGecko
    const cgResponse = await fetch(`https://api.coingecko.com/api/v3/coins/${id}?localization=false&tickers=false&community_data=false&developer_data=false`);
    if (!cgResponse.ok) return res.status(cgResponse.status).json({ error: "Failed to fetch CoinGecko data" });
    const cgData = await cgResponse.json();

    // Step 1.5: Fetch Historical Price Trend
    let historicalPrices = [];
    if (history_days > 0) {
      const historyResponse = await fetch(`https://api.coingecko.com/api/v3/coins/${id}/market_chart?vs_currency=${vs_currency}&days=${history_days}`);
      if (historyResponse.ok) {
        const historyData = await historyResponse.json();
        const prices = historyData.prices || [];
        // Sample about 10 data points to keep the AI prompt concise while showing the trend
        const step = Math.max(1, Math.floor(prices.length / 10));
        historicalPrices = prices.filter((_: any, i: number) => i % step === 0).map((p: any) => ({
          date: new Date(p[0]).toISOString().split('T')[0],
          price: Number(p[1].toFixed(4))
        }));
      }
    }

    const tokenPayload = {
      id: cgData.id,
      symbol: cgData.symbol,
      name: cgData.name,
      currency: vs_currency.toUpperCase(),
      history_days: history_days,
      market_data: {
        current_price: cgData.market_data?.current_price?.[vs_currency],
        market_cap: cgData.market_data?.market_cap?.[vs_currency],
        total_volume: cgData.market_data?.total_volume?.[vs_currency],
        price_change_percentage_24h: cgData.market_data?.price_change_percentage_24h
      },
      historical_price_trend: historicalPrices
    };

    // Step 2: Search the web for recent news about this token
    const newsResult = await searchTokenNews(cgData.name, cgData.symbol, vs_currency);

    // Step 3: Get AI insight using market data + news context
    const aiResult = await getAIInsight(tokenPayload, newsResult.rawContext);

    res.json({
      source: "coingecko",
      token: tokenPayload,
      web_context: {
        search_query: newsResult.query,
        results: newsResult.results,
        source: "duckduckgo_scrape"
      },
      insight: aiResult.insight,
      model: aiResult.model
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 2. HyperLiquid Wallet Daily PnL API
app.get("/api/hyperliquid/:wallet/pnl", async (req, res) => {
  try {
    const { wallet } = req.params;
    const { start, end } = req.query;

    if (!start || !end) return res.status(400).json({ error: "start and end dates are required (YYYY-MM-DD)" });

    const startDate = new Date(start as string).getTime();
    const endDate = new Date(end as string).setUTCHours(23, 59, 59, 999);

    // Fetch User Fills (Trades & Realized PnL)
    const fillsRes = await fetch("https://api.hyperliquid.xyz/info", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "userFills", user: wallet })
    });

    // Fetch User Funding (Funding payments)
    const fundingRes = await fetch("https://api.hyperliquid.xyz/info", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "userFunding", user: wallet })
    });

    if (!fillsRes.ok || !fundingRes.ok) return res.status(500).json({ error: "Failed to fetch HyperLiquid data" });

    const fills = await fillsRes.json();
    const fundings = await fundingRes.json();

    // Grouping by Date
    const dailyMap: Record<string, any> = {};

    // Process closed trades (realized pnl & fees)
    if (Array.isArray(fills)) {
      for (const fill of fills) {
        if (fill.time >= startDate && fill.time <= endDate) {
          const dateStr = new Date(fill.time).toISOString().split("T")[0];
          if (!dailyMap[dateStr]) dailyMap[dateStr] = { realized_pnl_usd: 0, unrealized_pnl_usd: 0, fees_usd: 0, funding_usd: 0 };

          dailyMap[dateStr].realized_pnl_usd += parseFloat(fill.closedPnl || "0");
          dailyMap[dateStr].fees_usd += parseFloat(fill.fee || "0");
        }
      }
    }

    // Process funding
    if (Array.isArray(fundings)) {
      for (const fund of fundings) {
        if (fund.time >= startDate && fund.time <= endDate) {
          const dateStr = new Date(fund.time).toISOString().split("T")[0];
          if (!dailyMap[dateStr]) dailyMap[dateStr] = { realized_pnl_usd: 0, unrealized_pnl_usd: 0, fees_usd: 0, funding_usd: 0 };

          dailyMap[dateStr].funding_usd += parseFloat(fund.usdc || "0");
        }
      }
    }

    // Aggregate
    const daily = [];
    let equityTracker = 10000; // Simulated starting equity for demonstration as true historical equity requires full history
    const summary = { total_realized_usd: 0, total_unrealized_usd: 0, total_fees_usd: 0, total_funding_usd: 0, net_pnl_usd: 0 };

    for (const [date, data] of Object.entries(dailyMap).sort((a, b) => a[0].localeCompare(b[0]))) {
      // NOTE: Unrealized PnL historical marking requires full daily klines array per token, we approximate/leave at 0 here
      const net_pnl = data.realized_pnl_usd + data.unrealized_pnl_usd - data.fees_usd + data.funding_usd;
      equityTracker += net_pnl;

      daily.push({
        date,
        realized_pnl_usd: Number(data.realized_pnl_usd.toFixed(4)),
        unrealized_pnl_usd: Number(data.unrealized_pnl_usd.toFixed(4)),
        fees_usd: Number(data.fees_usd.toFixed(4)),
        funding_usd: Number(data.funding_usd.toFixed(4)),
        net_pnl_usd: Number(net_pnl.toFixed(4)),
        equity_usd: Number(equityTracker.toFixed(4))
      });

      summary.total_realized_usd += data.realized_pnl_usd;
      summary.total_fees_usd += data.fees_usd;
      summary.total_funding_usd += data.funding_usd;
      // summary.total_unrealized_usd += data.unrealized_pnl_usd; 
    }
    summary.net_pnl_usd = summary.total_realized_usd + summary.total_unrealized_usd - summary.total_fees_usd + summary.total_funding_usd;

    res.json({
      wallet,
      start,
      end,
      daily,
      summary: {
        total_realized_usd: Number(summary.total_realized_usd.toFixed(4)),
        total_unrealized_usd: Number(summary.total_unrealized_usd.toFixed(4)),
        total_fees_usd: Number(summary.total_fees_usd.toFixed(4)),
        total_funding_usd: Number(summary.total_funding_usd.toFixed(4)),
        net_pnl_usd: Number(summary.net_pnl_usd.toFixed(4))
      },
      diagnostics: {
        data_source: "hyperliquid_api",
        last_api_call: new Date().toISOString(),
        notes: "Historical unrealized PnL is simplified here. Full marking to daily close requires indexer data."
      }
    });

  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});


// Vite middleware for development & Static file serving for production
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
