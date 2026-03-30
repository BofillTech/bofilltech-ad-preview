// /api/ads.js â Serverless function for Vercel
// Calls Windsor.ai REST API directly for Google Ads data.
// No LLM intermediary â deterministic queries with hardcoded filters.
//
// Required Vercel env var: WINDSOR_API_KEY
// Windsor REST endpoint: https://connectors.windsor.ai/google_ads

// 30 Active Accounts (March 28, 2026)
const ACCOUNT_MAP = {
  "964-534-2780": { name: "Little Sur Inn", slug: "little-sur-inn" },
  "680-105-2107": { name: "14Roc", slug: "14roc" },
  "961-690-9550": { name: "401 Home Buyer", slug: "401-home-buyer" },
  "283-962-5954": { name: "Abellona Inn", slug: "abellona-inn" },
  "227-730-5058": { name: "Archway Fishtown", slug: "archway-fishtown" },
  "853-028-8686": { name: "Rhumb Line Resort", slug: "rhumb-line-resort" },
  "521-503-9488": { name: "Atlantic Oceanfront Motel", slug: "atlantic-oceanfront" },
  "926-966-6149": { name: "Briney Breezes", slug: "briney-breezes" },
  "719-323-7864": { name: "Fun Hog Charters", slug: "fun-hog-charters" },
  "819-926-8411": { name: "Gale Residences", slug: "gale-residences" },
  "330-257-8909": { name: "Montauk Manor", slug: "montauk-manor" },
  "819-902-2143": { name: "Mount Nevis Hotel", slug: "mount-nevis-hotel" },
  "853-398-5478": { name: "York Harbor Inn", slug: "york-harbor-inn" },
  "930-857-6974": { name: "Southampton Inn", slug: "southampton-inn" },
  "393-097-4019": { name: "White Bay Villas", slug: "white-bay-villas" },
  "633-453-9437": { name: "Village by the Sea", slug: "village-by-the-sea" },
  "296-269-7055": { name: "Dave Bofill Marine", slug: "dave-bofill-marine" },
  "389-084-7031": { name: "American Beech", slug: "american-beech" },
  "380-749-5300": { name: "Sole East", slug: "sole-east" },
  "538-605-0288": { name: "Old Orchard Beach Lodging", slug: "old-orchard-beach" },
  "791-225-0197": { name: "Palma Miami Beach", slug: "palma-miami-beach" },
  "902-355-7862": { name: "Rose Farm Inn", slug: "rose-farm-inn" },
  "255-126-9645": { name: "Security Solutions", slug: "security-solutions" },
  "851-435-8799": { name: "Wavecrest on Ocean", slug: "wavecrest-on-ocean" },
  "722-412-2550": { name: "Moonstone Landing", slug: "moonstone-landing" },
  "972-388-5194": { name: "Sebastians BVI II", slug: "sebastians-bvi" },
  "504-795-2188": { name: "Spring House Block Island II", slug: "spring-house" },
  "627-116-9168": { name: "Atlantic Inn", slug: "atlantic-inn" },
  "348-456-6827": { name: "Long Island Regents Prep", slug: "li-regents-prep" },
  "375-037-4147": { name: "Inn At Highway 1", slug: "inn-at-highway-1" },
};

const VALID_ACCOUNTS = new Set(Object.keys(ACCOUNT_MAP));

const WINDSOR_BASE = "https://connectors.windsor.ai/google_ads";

// ---------------------------------------------------------------------------
// Windsor.ai REST helper
// Builds a query URL and fetches JSON results.
// ---------------------------------------------------------------------------
async function windsorQuery(apiKey, params) {
  const url = new URL(WINDSOR_BASE);
  url.searchParams.set("api_key", apiKey);

  // Fields â comma-separated, no spaces
  if (params.fields) {
    url.searchParams.set("fields", params.fields.join(","));
  }

  // Date preset
  if (params.date_preset) {
    url.searchParams.set("date_preset", params.date_preset);
  }

  // Account â single account per query (required for ad-level data)
  if (params.accounts) {
    url.searchParams.set("accounts", params.accounts);
  }

  // Filters â JSON-encoded array, e.g. [["clicks","gte",3]]
  if (params.filter) {
    url.searchParams.set("filter", JSON.stringify(params.filter));
  }

  // Explicitly request JSON output
  url.searchParams.set("_renderer", "json");

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Windsor API ${response.status}: ${errText}`);
  }

  const data = await response.json();

  // Windsor returns { data: [...] } or a plain array depending on endpoint
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.data)) return data.data;

  return [];
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------
export default async function handler(req, res) {
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET")
    return res.status(405).json({ error: "Method not allowed" });

  const { account } = req.query;

  if (!account || !VALID_ACCOUNTS.has(account)) {
    return res.status(400).json({
      error: "Invalid or missing account ID",
      valid_accounts: Object.fromEntries(
        Object.entries(ACCOUNT_MAP).map(([id, v]) => [id, v.name])
      ),
    });
  }

  const WINDSOR_KEY = process.env.WINDSOR_API_KEY;
  if (!WINDSOR_KEY) {
    return res
      .status(500)
      .json({ error: "Server misconfigured: missing WINDSOR_API_KEY" });
  }

  try {
    // ------------------------------------------------------------------
    // Query 1 â Ad performance (with clicks >= 3 filter to stay under
    //           Windsor's response-size limit for accounts with 400+ ads)
    // ------------------------------------------------------------------
    let perfRows = [];
    try {
      perfRows = await windsorQuery(WINDSOR_KEY, {
        fields: [
          "account_id",
          "ad_name",
          "ad_type",
          "ad_id",
          "campaign",
          "clicks",
          "impressions",
        ],
        date_preset: "last_30d",
        accounts: account,
        filter: [["clicks", "gte", 3]],
      });
    } catch (perfErr) {
      console.error("Windsor perf query failed:", perfErr.message);
      return res.status(502).json({
        error: "Failed to fetch ad data from Windsor.ai",
        detail: perfErr.message,
      });
    }

    // Windsor REST API ignores the accounts param, so filter server-side
    perfRows = perfRows.filter((row) => row.account_id === account);

    if (!perfRows || perfRows.length === 0) {
      return res.json({
        account,
        account_name: ACCOUNT_MAP[account].name,
        updated_at: new Date().toISOString(),
        total_ads: 0,
        total_clicks: 0,
        total_impressions: 0,
        ads: [],
        message: "No ad data found for this account in the last 30 days",
      });
    }

    // ------------------------------------------------------------------
    // Query 2 â Image URLs (separate query; image_url cannot be combined
    //           with performance fields per Windsor.ai constraints)
    // ------------------------------------------------------------------
    let imgMap = {};
    try {
      const imgRows = await windsorQuery(WINDSOR_KEY, {
        fields: ["account_id", "ad_id", "image_url"],
        date_preset: "last_30d",
        accounts: account,
      });

      for (const row of imgRows) {
        if (row.image_url && row.account_id === account) {
          imgMap[String(row.ad_id)] = row.image_url;
        }
      }
    } catch (imgErr) {
      // Non-fatal â we still return perf data without images
      console.error("Windsor image query failed (non-fatal):", imgErr.message);
    }

    // ------------------------------------------------------------------
    // Transform, sort, and cap at 50 ads
    // ------------------------------------------------------------------
    let ads = perfRows.map((row) => {
      const clicks = Number(row.clicks) || 0;
      const impressions = Number(row.impressions) || 0;
      const adId = String(row.ad_id || "");
      return {
        ad_name: row.ad_name || "",
        ad_type: row.ad_type || "",
        ad_id: adId,
        campaign: row.campaign || "",
        clicks,
        impressions,
        ctr:
          impressions > 0
            ? ((clicks / impressions) * 100).toFixed(1)
            : "0.0",
        image_url: imgMap[adId] || null,
      };
    });

    // Sort by clicks descending, take top 50
    ads.sort((a, b) => b.clicks - a.clicks);
    ads = ads.slice(0, 50);

    return res.json({
      account,
      account_name: ACCOUNT_MAP[account].name,
      updated_at: new Date().toISOString(),
      total_ads: ads.length,
      total_clicks: ads.reduce((sum, a) => sum + a.clicks, 0),
      total_impressions: ads.reduce((sum, a) => sum + a.impressions, 0),
      ads,
    });
  } catch (err) {
    console.error("Handler error:", err);
    return res
      .status(500)
      .json({ error: "Internal server error", detail: err.message });
  }
}
