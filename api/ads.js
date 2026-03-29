// /api/ads.js — Serverless function for Vercel
// Proxies Windsor.ai ad data requests through the Anthropic API.
// API key lives in Vercel env vars — clients never see it.

// 30 Active Accounts (March 28, 2026)
const ACCOUNT_MAP = {
  "964-534-2780": "Little Sur Inn",
  "680-105-2107": "14Roc",
  "961-690-9550": "401 Home Buyer",
  "283-962-5954": "Abellona Inn",
  "227-730-5058": "Archway Fishtown",
  "853-028-8686": "Rhumb Line Resort",
  "521-503-9488": "Atlantic Oceanfront Motel",
  "926-966-6149": "Briney Breezes",
  "719-323-7864": "Fun Hog Charters",
  "819-926-8411": "Gale Residences",
  "330-257-8909": "Montauk Manor",
  "819-902-2143": "Mount Nevis Hotel",
  "853-398-5478": "York Harbor Inn",
  "930-857-6974": "Southampton Inn",
  "393-097-4019": "White Bay Villas",
  "633-453-9437": "Village by the Sea",
  "296-269-7055": "Dave Bofill Marine",
  "389-084-7031": "American Beech",
  "380-749-5300": "Sole East",
  "538-605-0288": "Old Orchard Beach Lodging",
  "791-225-0197": "Palma Miami Beach",
  "902-355-7862": "Rose Farm Inn",
  "255-126-9645": "Security Solutions",
  "851-435-8799": "Wavecrest on Ocean",
  "722-412-2550": "Moonstone Landing",
  "972-388-5194": "Sebastians BVI II",
  "504-795-2188": "Spring House Block Island II",
  "627-116-9168": "Atlantic Inn",
  "348-456-6827": "Long Island Regents Prep",
  "375-037-4147": "Inn At Highway 1",
};

const VALID_ACCOUNTS = new Set(Object.keys(ACCOUNT_MAP));

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const { account } = req.query;

  if (!account || !VALID_ACCOUNTS.has(account)) {
    return res.status(400).json({
      error: "Invalid or missing account ID",
      valid_accounts: ACCOUNT_MAP,
    });
  }

  const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
  if (!ANTHROPIC_KEY) {
    return res.status(500).json({ error: "Server misconfigured: missing API key" });
  }

  try {
    // Query 1: Ad performance data
    const perfResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        system: `You are a data extraction assistant. You will use Windsor.ai to pull Google Ads data. After receiving the data, respond ONLY with a valid JSON array of ad objects. No preamble, no markdown fences, no explanation. Each object must have these exact keys: ad_name, ad_type, ad_id, campaign, clicks, impressions. Sort by clicks descending. Limit to 50 results. CRITICAL: Always use filters [["clicks", "gte", 3]] in the get_data call to limit response size. If no data is returned, respond with: []`,
        messages: [
          {
            role: "user",
            content: `Use the Windsor.ai get_data tool to pull ad performance for Google Ads account ${account} for the last 30 days. Use these fields: ad_name, ad_type, ad_id, campaign, clicks, impressions. Use filters [["clicks", "gte", 3]] to only get ads with 3+ clicks. After getting the data, return ONLY the JSON array sorted by clicks descending, max 50 ads.`,
          },
        ],
        mcp_servers: [
          { type: "url", url: "https://mcp.windsor.ai", name: "windsor" },
        ],
      }),
    });

    if (!perfResponse.ok) {
      const errText = await perfResponse.text();
      console.error("Anthropic API error (perf):", perfResponse.status, errText);
      return res.status(502).json({ error: "Failed to fetch ad data", detail: errText });
    }

    const perfData = await perfResponse.json();
    let ads = extractAdsFromResponse(perfData);

    if (ads.length === 0) {
      return res.json({
        account,
        account_name: ACCOUNT_MAP[account],
        ads: [],
        message: "No ad data found for this account in the last 30 days",
      });
    }

    ads.sort((a, b) => (Number(b.clicks) || 0) - (Number(a.clicks) || 0));
    ads = ads.slice(0, 50);

    ads = ads.map((ad) => ({
      ...ad,
      clicks: Number(ad.clicks) || 0,
      impressions: Number(ad.impressions) || 0,
      ctr: Number(ad.impressions) > 0
        ? ((Number(ad.clicks) / Number(ad.impressions)) * 100).toFixed(1)
        : "0.0",
    }));

    // Query 2: Image URLs (separate due to field restrictions)
    try {
      const imgResponse = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": ANTHROPIC_KEY,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 2048,
          system: `You are a data extraction assistant. Respond ONLY with a valid JSON array. Each object must have: ad_id, image_url. No preamble, no markdown fences.`,
          messages: [
            {
              role: "user",
              content: `Use Windsor.ai get_data to pull ad image URLs for Google Ads account ${account}, last 30 days. Fields: ad_id, image_url. Return ONLY the JSON array.`,
            },
          ],
          mcp_servers: [
            { type: "url", url: "https://mcp.windsor.ai", name: "windsor" },
          ],
        }),
      });

      if (imgResponse.ok) {
        const imgData = await imgResponse.json();
        const imgMap = extractImageMap(imgData);
        ads = ads.map((ad) => ({ ...ad, image_url: imgMap[ad.ad_id] || null }));
      }
    } catch (imgErr) {
      console.error("Image query failed (non-fatal):", imgErr.message);
    }

    return res.json({
      account,
      account_name: ACCOUNT_MAP[account],
      updated_at: new Date().toISOString(),
      total_ads: ads.length,
      total_clicks: ads.reduce((s, a) => s + a.clicks, 0),
      total_impressions: ads.reduce((s, a) => s + a.impressions, 0),
      ads,
    });
  } catch (err) {
    console.error("Handler error:", err);
    return res.status(500).json({ error: "Internal server error", detail: err.message });
  }
}

function extractAdsFromResponse(data) {
  if (!data?.content) return [];

  let textContent = "";
  for (const block of data.content) {
    if (block.type === "text") textContent += block.text;
  }

  if (textContent) {
    try {
      const cleaned = textContent.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(cleaned);
      if (Array.isArray(parsed)) return parsed;
    } catch {}

    const match = textContent.match(/\[[\s\S]*\]/);
    if (match) {
      try {
        const parsed = JSON.parse(match[0]);
        if (Array.isArray(parsed)) return parsed;
      } catch {}
    }
  }

  for (const block of data.content) {
    if (block.type === "mcp_tool_result" && block.content?.[0]?.text) {
      try {
        const parsed = JSON.parse(block.content[0].text);
        if (Array.isArray(parsed)) return parsed;
      } catch {}
    }
  }

  return [];
}

function extractImageMap(data) {
  const map = {};
  if (!data?.content) return map;

  let textContent = "";
  for (const block of data.content) {
    if (block.type === "text") textContent += block.text;
  }

  if (textContent) {
    try {
      const cleaned = textContent.replace(/```json|```/g, "").trim();
      const arrMatch = cleaned.match(/\[[\s\S]*\]/);
      const arr = JSON.parse(arrMatch ? arrMatch[0] : cleaned);
      arr.forEach((item) => { if (item.image_url) map[item.ad_id] = item.image_url; });
      return map;
    } catch {}
  }

  for (const block of data.content) {
    if (block.type === "mcp_tool_result" && block.content?.[0]?.text) {
      try {
        const arr = JSON.parse(block.content[0].text);
        arr.forEach((item) => { if (item.image_url) map[item.ad_id] = item.image_url; });
      } catch {}
    }
  }

  return map;
}
