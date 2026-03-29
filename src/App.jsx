import { useState, useEffect, useCallback } from "react";

// ─── 30 Active Accounts (from Windsor.ai, March 28 2026) ───
// Skipped: The Surf Lodge, Km Security Solutions, Clearwater Beach Club,
//          BookifyPro, 1661 Inn, Spring House Block Island (original)
const ACCOUNTS = {
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

// Reverse lookup: slug → account ID
const SLUG_TO_ACCOUNT = Object.fromEntries(
  Object.entries(ACCOUNTS).map(([id, { slug }]) => [slug, id])
);

/* ─── Helpers ─── */
function parseAdName(adName, adType) {
  if (!adName) return { headlines: [], descriptions: [] };
  const parts = adName.split(" | ").map((s) => s.trim()).filter(Boolean);
  if (adType === "RESPONSIVE_SEARCH_AD") return { headlines: parts, descriptions: [] };
  return { headlines: parts.slice(0, 3), descriptions: parts.slice(3) };
}

function typeLabel(adType, campaign) {
  if (adType?.includes("DISPLAY") || adType?.includes("IMAGE")) return "Display";
  if (adType?.includes("VIDEO")) return "Video";
  const c = (campaign || "").toLowerCase();
  if (c.includes("pmax") || c.includes("performance max")) return "PMax";
  return "Search";
}

const TYPE_COLORS = { Display: "#D4A853", Video: "#C0392B", PMax: "#8E44AD", Search: "#1A3A5C" };

/* ─── Components ─── */

function AdCard({ ad, rank, index }) {
  const { headlines } = parseAdName(ad.ad_name, ad.ad_type);
  const type = typeLabel(ad.ad_type, ad.campaign);
  const isDisplay = type === "Display";
  const ctr = parseFloat(ad.ctr) || 0;

  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 14,
        boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 6px 16px rgba(0,0,0,0.03)",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        transition: "box-shadow 0.25s ease, transform 0.25s ease",
        position: "relative",
        animation: `fadeUp 0.4s ease ${index * 0.04}s both`,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = "0 8px 30px rgba(0,0,0,0.1)";
        e.currentTarget.style.transform = "translateY(-3px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.06), 0 6px 16px rgba(0,0,0,0.03)";
        e.currentTarget.style.transform = "translateY(0)";
      }}
    >
      {/* Badges */}
      <div style={{ position: "absolute", top: 12, left: 12, zIndex: 2, display: "flex", gap: 6 }}>
        <span style={{ background: "#1A3A5C", color: "#fff", borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 700, letterSpacing: 0.5 }}>
          #{rank}
        </span>
      </div>
      <div style={{ position: "absolute", top: 12, right: 12, zIndex: 2 }}>
        <span style={{ background: TYPE_COLORS[type], color: "#fff", borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 600, letterSpacing: 0.3 }}>
          {type}
        </span>
      </div>

      {/* Ad Preview Area */}
      {isDisplay && ad.image_url ? (
        <div style={{ width: "100%", height: 180, background: "#f0ede6", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
          <img
            src={ad.image_url}
            alt="Ad creative"
            style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
            onError={(e) => { e.target.style.display = "none"; }}
          />
        </div>
      ) : (
        <div style={{ padding: "36px 16px 12px", background: "linear-gradient(145deg, #faf8f4 0%, #f0ede6 100%)", minHeight: 90 }}>
          <div style={{ fontSize: 11, color: "#202124", marginBottom: 4, opacity: 0.5 }}>Sponsored</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#1a0dab", lineHeight: 1.35, marginBottom: 3, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
            {headlines[0] || "Untitled Ad"}
          </div>
          {headlines.length > 1 && (
            <div style={{ fontSize: 12, color: "#4d5156", lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
              {headlines.slice(1, 5).join(" · ")}
            </div>
          )}
        </div>
      )}

      {/* Metrics */}
      <div style={{ padding: "12px 16px", flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ fontSize: 12, color: "#888", fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {ad.campaign}
        </div>
        <div style={{ display: "flex", gap: 20, marginTop: "auto", paddingTop: 10, borderTop: "1px solid #f0ede6" }}>
          <div>
            <div style={{ fontSize: 19, fontWeight: 700, color: "#1A3A5C", lineHeight: 1 }}>{Number(ad.clicks).toLocaleString()}</div>
            <div style={{ fontSize: 10, color: "#aaa", textTransform: "uppercase", letterSpacing: 0.6, marginTop: 2 }}>Clicks</div>
          </div>
          <div>
            <div style={{ fontSize: 19, fontWeight: 700, color: "#1A3A5C", lineHeight: 1 }}>{Number(ad.impressions).toLocaleString()}</div>
            <div style={{ fontSize: 10, color: "#aaa", textTransform: "uppercase", letterSpacing: 0.6, marginTop: 2 }}>Impressions</div>
          </div>
          <div>
            <div style={{ fontSize: 19, fontWeight: 700, lineHeight: 1, color: ctr > 3 ? "#27ae60" : ctr > 1 ? "#D4A853" : "#e74c3c" }}>
              {ctr.toFixed(1)}%
            </div>
            <div style={{ fontSize: 10, color: "#aaa", textTransform: "uppercase", letterSpacing: 0.6, marginTop: 2 }}>CTR</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FilterBar({ ads, filter, setFilter }) {
  const types = ["All", ...new Set(ads.map((a) => typeLabel(a.ad_type, a.campaign)))];
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
      {types.map((t) => (
        <button
          key={t}
          onClick={() => setFilter(t)}
          style={{
            padding: "6px 16px", borderRadius: 20,
            border: filter === t ? "2px solid #1A3A5C" : "1px solid #ddd",
            background: filter === t ? "#1A3A5C" : "#fff",
            color: filter === t ? "#fff" : "#666",
            fontWeight: 600, fontSize: 13, cursor: "pointer", transition: "all 0.2s",
          }}
        >
          {t} {t !== "All" && `(${ads.filter((a) => typeLabel(a.ad_type, a.campaign) === t).length})`}
        </button>
      ))}
    </div>
  );
}

/* ─── Main App ─── */

export default function App() {
  const [accountId, setAccountId] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("All");
  const [isAdmin, setIsAdmin] = useState(false);

  // Read account from URL — supports slug paths and query params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const admin = params.get("admin") === "true";
    setIsAdmin(admin);

    // Priority 1: Slug in path — /ads/little-sur-inn
    const pathSlug = window.location.pathname.replace(/^\/ads\//, "").replace(/^\//, "").replace(/\/$/, "");
    if (pathSlug && SLUG_TO_ACCOUNT[pathSlug]) {
      setAccountId(SLUG_TO_ACCOUNT[pathSlug]);
      return;
    }

    // Priority 2: Account ID in query param — ?account=964-534-2780
    const acct = params.get("account");
    if (acct && ACCOUNTS[acct]) {
      setAccountId(acct);
    }
  }, []);

  const fetchAds = useCallback(async (acctId) => {
    if (!acctId) return;
    setLoading(true);
    setError("");
    setData(null);
    setFilter("All");

    try {
      const response = await fetch(`/api/ads?account=${acctId}`);
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Server error: ${response.status}`);
      }
      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err.message);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    if (accountId) fetchAds(accountId);
  }, [accountId, fetchAds]);

  // Update URL when switching accounts in admin mode
  useEffect(() => {
    if (isAdmin && accountId && ACCOUNTS[accountId]) {
      const slug = ACCOUNTS[accountId].slug;
      window.history.replaceState({}, "", `/ads/${slug}?admin=true`);
    }
  }, [accountId, isAdmin]);

  const ads = data?.ads || [];
  const filteredAds = filter === "All" ? ads : ads.filter((a) => typeLabel(a.ad_type, a.campaign) === filter);

  return (
    <div style={{ minHeight: "100vh", background: "#f8f6f1" }}>
      {/* Header */}
      <header style={{ background: "#1A3A5C", padding: "18px 28px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <img src="https://bofilltech.com/wp-content/uploads/2026/02/logo-ByMoSz96.png" alt="Bofill Technologies" style={{ height: 34 }} onError={(e) => { e.target.style.display = "none"; }} />
          <div>
            <div style={{ color: "#D4A853", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.8 }}>Live Ad Preview</div>
            <div style={{ color: "#fff", fontSize: 20, fontWeight: 700, fontFamily: "'DM Serif Display', Georgia, serif", lineHeight: 1.2 }}>
              {data?.account_name || ACCOUNTS[accountId]?.name || "Your Google Ads"}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {isAdmin && (
            <select
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.08)", color: "#fff", fontSize: 13, minWidth: 220, cursor: "pointer" }}
            >
              <option value="" style={{ color: "#333" }}>Select account...</option>
              {Object.entries(ACCOUNTS)
                .sort(([, a], [, b]) => a.name.localeCompare(b.name))
                .map(([id, { name }]) => (
                  <option key={id} value={id} style={{ color: "#333" }}>{name}</option>
                ))}
            </select>
          )}
          {accountId && (
            <button onClick={() => fetchAds(accountId)} disabled={loading}
              style={{ padding: "8px 18px", borderRadius: 8, border: "none", background: "#D4A853", color: "#1A3A5C", fontWeight: 700, fontSize: 13, cursor: loading ? "wait" : "pointer", opacity: loading ? 0.6 : 1, transition: "opacity 0.2s" }}>
              {loading ? "Updating..." : "↻ Refresh"}
            </button>
          )}
        </div>
      </header>

      {/* Stats Bar */}
      {data && ads.length > 0 && (
        <div style={{ background: "#fff", borderBottom: "1px solid #e8e4dc", padding: "12px 28px", display: "flex", gap: 36, flexWrap: "wrap", alignItems: "center" }}>
          {[
            { value: ads.length, label: "ads" },
            { value: data.total_clicks?.toLocaleString(), label: "clicks (30d)" },
            { value: data.total_impressions?.toLocaleString(), label: "impressions" },
            { value: data.total_impressions > 0 ? ((data.total_clicks / data.total_impressions) * 100).toFixed(1) + "%" : "—", label: "avg CTR", color: data.total_impressions > 0 && (data.total_clicks / data.total_impressions) * 100 > 3 ? "#27ae60" : undefined },
          ].map(({ value, label, color }) => (
            <div key={label}>
              <span style={{ fontSize: 22, fontWeight: 700, color: color || "#1A3A5C" }}>{value}</span>
              <span style={{ fontSize: 12, color: "#aaa", marginLeft: 6 }}>{label}</span>
            </div>
          ))}
          {data.updated_at && (
            <div style={{ marginLeft: "auto", fontSize: 12, color: "#bbb" }}>Updated: {new Date(data.updated_at).toLocaleString()}</div>
          )}
        </div>
      )}

      {/* Body */}
      <main style={{ padding: "24px 28px", maxWidth: 1440, margin: "0 auto" }}>
        {loading && (
          <div style={{ textAlign: "center", padding: 100 }}>
            <div style={{ width: 44, height: 44, border: "3px solid #e8e4dc", borderTopColor: "#D4A853", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 20px" }} />
            <div style={{ color: "#1A3A5C", fontWeight: 600, fontSize: 16 }}>Pulling live ad data...</div>
            <div style={{ color: "#aaa", fontSize: 13, marginTop: 6 }}>This usually takes 15–30 seconds</div>
          </div>
        )}

        {error && !loading && (
          <div style={{ textAlign: "center", padding: 60, background: "#fff", borderRadius: 14, maxWidth: 500, margin: "40px auto", boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}>
            <div style={{ fontSize: 44, marginBottom: 14 }}>⚠️</div>
            <div style={{ color: "#c0392b", fontWeight: 600, marginBottom: 12 }}>{error}</div>
            <button onClick={() => fetchAds(accountId)} style={{ padding: "8px 24px", borderRadius: 8, border: "1px solid #ddd", background: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 500 }}>Try Again</button>
          </div>
        )}

        {!loading && !error && ads.length === 0 && !data && (
          <div style={{ textAlign: "center", padding: 100, color: "#aaa" }}>
            <div style={{ fontSize: 52, marginBottom: 14 }}>📊</div>
            <div style={{ fontSize: 18, fontWeight: 600, color: "#1A3A5C", marginBottom: 6 }}>{accountId ? "No ads found" : "Select an account to view ads"}</div>
            <div style={{ fontSize: 13 }}>Shows the top 50 ads by clicks from the last 30 days</div>
          </div>
        )}

        {!loading && !error && data && ads.length === 0 && (
          <div style={{ textAlign: "center", padding: 80, color: "#aaa" }}>
            <div style={{ fontSize: 48 }}>📭</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: "#1A3A5C", marginTop: 12 }}>No ads with clicks in the last 30 days</div>
            <div style={{ fontSize: 13, marginTop: 4 }}>This account may be paused or have no active campaigns.</div>
          </div>
        )}

        {filteredAds.length > 0 && (
          <>
            <FilterBar ads={ads} filter={filter} setFilter={setFilter} />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))", gap: 20 }}>
              {filteredAds.map((ad, i) => (
                <AdCard key={ad.ad_id || i} ad={ad} rank={i + 1} index={i} />
              ))}
            </div>
          </>
        )}
      </main>

      <footer style={{ textAlign: "center", padding: "28px 28px 36px", color: "#ccc", fontSize: 11 }}>
        Powered by <span style={{ color: "#1A3A5C", fontWeight: 600 }}>Bofill Technologies</span> · Data from Google Ads · Last 30 days
      </footer>
    </div>
  );
}
