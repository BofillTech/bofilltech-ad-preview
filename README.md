# BofillTech Ad Preview Dashboard

Live Google Ads preview dashboard for clients. Shows top 50 ads by clicks
with performance metrics, pulled live from Windsor.ai via Anthropic API.

## Architecture

```
Client browser → Vercel CDN (cached) → Serverless function → Anthropic API → Windsor.ai MCP → Google Ads
```

- **Frontend**: React + Vite (static, served from Vercel CDN)
- **Backend**: Single serverless function (`/api/ads.js`) holds the API key
- **Data**: Windsor.ai MCP connector pulls live Google Ads data
- **Cost**: $0/month on Vercel Hobby plan
- **Cache**: 5-minute CDN cache on API responses

## Client URLs (White-Labeled)

Each client gets a clean, bookmarkable link with no account IDs visible:

```
reports.bofilltech.com/ads/little-sur-inn
reports.bofilltech.com/ads/14roc
reports.bofilltech.com/ads/401-home-buyer
reports.bofilltech.com/ads/abellona-inn
reports.bofilltech.com/ads/archway-fishtown
reports.bofilltech.com/ads/rhumb-line-resort
reports.bofilltech.com/ads/atlantic-oceanfront
reports.bofilltech.com/ads/briney-breezes
reports.bofilltech.com/ads/fun-hog-charters
reports.bofilltech.com/ads/gale-residences
reports.bofilltech.com/ads/montauk-manor
reports.bofilltech.com/ads/mount-nevis-hotel
reports.bofilltech.com/ads/york-harbor-inn
reports.bofilltech.com/ads/southampton-inn
reports.bofilltech.com/ads/white-bay-villas
reports.bofilltech.com/ads/village-by-the-sea
reports.bofilltech.com/ads/dave-bofill-marine
reports.bofilltech.com/ads/american-beech
reports.bofilltech.com/ads/sole-east
reports.bofilltech.com/ads/old-orchard-beach
reports.bofilltech.com/ads/palma-miami-beach
reports.bofilltech.com/ads/rose-farm-inn
reports.bofilltech.com/ads/security-solutions
reports.bofilltech.com/ads/wavecrest-on-ocean
reports.bofilltech.com/ads/moonstone-landing
reports.bofilltech.com/ads/sebastians-bvi
reports.bofilltech.com/ads/spring-house
reports.bofilltech.com/ads/atlantic-inn
reports.bofilltech.com/ads/li-regents-prep
reports.bofilltech.com/ads/inn-at-highway-1
```

Admin mode (shows account switcher dropdown):
```
reports.bofilltech.com/ads/little-sur-inn?admin=true
```

## Deploy to Vercel (5 minutes)

### Step 1: Push to GitHub

```bash
cd ad-preview-app
git init
git add .
git commit -m "Ad preview dashboard with 30 accounts"
git remote add origin https://github.com/YOUR_USERNAME/bofilltech-ad-preview.git
git push -u origin main
```

### Step 2: Connect to Vercel

1. Go to https://vercel.com → sign in (or create free account)
2. Click "Add New → Project"
3. Import your GitHub repo
4. Framework preset: **Vite** (should auto-detect)
5. Add environment variable:
   - Name: `ANTHROPIC_API_KEY`
   - Value: your `sk-ant-...` key
   - Environments: Production, Preview, Development
6. Click "Deploy"

### Step 3: Custom Domain

1. Vercel project → Settings → Domains
2. Add `reports.bofilltech.com`
3. In your DNS, add a CNAME record:
   - Name: `reports`
   - Value: `cname.vercel-dns.com`
4. Vercel auto-provisions SSL

## Local Development

```bash
npm install
npm run dev          # Frontend only (no API)
# or
npm i -g vercel
vercel dev           # Full stack with serverless functions
```

Create `.env.local` for local dev:
```
ANTHROPIC_API_KEY=sk-ant-your-key-here
```

## Security

- Anthropic API key is NEVER exposed to the browser
- Account IDs are whitelisted server-side (only your 30 accounts)
- API returns only ad preview data (no billing, no settings, no budgets)
- 5-minute CDN cache reduces API calls

## Adding New Accounts

Edit the ACCOUNTS object in two files:
1. `/api/ads.js` → `ACCOUNT_MAP` (server-side whitelist)
2. `/src/App.jsx` → `ACCOUNTS` (client-side display + slug routing)

Format: `"account-id": { name: "Display Name", slug: "url-slug" }`
