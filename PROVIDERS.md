# Providers

notslop is **BYOK** — bring your own keys, the gateway stores nothing. This file
tells you for each scraping source and rerank/embed provider: what you need, where
to get the key, what it costs, and how to set it.

## TL;DR — what you actually need

| If you want to use… | You need | Cost |
|---|---|---|
| Reddit, HN, blogs (default) | nothing | free |
| X (Twitter) | a Bright Data account + the X dataset | ~$0.001 per post |
| Rerank + embed (recommended) | a ZeroEntropy account | free tier covers most |

If you don't care about X scraping, the only key you need is ZeroEntropy. That's
the minimum to ship.

---

## Reddit

**No key needed.** Reads the public JSON endpoint.

- Add subreddits to your config via `notslop init` or
  `notslop list add <name> --kind subreddits --items ClaudeAI,LocalLLaMA`.
- Hard rate limit is ~60 req/min/IP. For higher volume, set `SCRAPE_PROXIES` to a
  comma-separated list of HTTP proxy URLs (residential preferred).

## Hacker News

**No key needed.** Reads the Algolia HN search API.

- Always-on, included in every digest by default.

## Blogs (RSS)

**No key needed.** RSS auto-discovery + cheerio HTML fallback.

- Add blog URLs to your config via `notslop init` or
  `notslop list add <name> --kind blogs --items <url1>,<url2>`.
- Works with any feed (RSS, Atom). For sites without a feed, the scraper falls back
  to scraping article links from the landing page.

## X (Twitter) — via Bright Data

**Requires a Bright Data account + the X Posts dataset.**

### Step-by-step setup

1. Sign up at https://brightdata.com (free signup, payment method required to
   activate API access).
2. Add credits to your account — minimum top-up is typically ~$10. X scraping
   costs roughly **$0.001 per post** at the default plan. A daily scrape of
   50 handles × 10 posts = $0.50/day = ~$15/month.
3. Go to **Datasets** in the left nav, click **Browse Datasets**, find
   **X (Twitter) — Posts by URL** (or "by array of profiles" — same data).
4. Click **Subscribe** (free, you only pay per record scraped).
5. From the dataset page, copy the **Dataset ID** — format `gd_xxxxxxxxxxxxxx`.
6. Go to **Settings → API** in Bright Data dashboard, copy your **API key**
   (long alphanumeric string, sometimes with hyphens).
7. Set both:
   ```bash
   export BRIGHTDATA_API_KEY=your_key_here
   export BRIGHTDATA_DATASET_ID=gd_xxxxxxxxxxxxxx
   ```
   Or put them in `~/.notslop/config.json` via `notslop init`.

### Verify it works

```bash
notslop sources --check x
# expected: ✔ X scrape live-tested via @karpathy (2-3 minutes due to async API)
```

### Why Bright Data and not the official X API?

The official X API costs $200/month minimum (Basic tier) and has heavy rate
limits. Bright Data's Datasets API is async (30s–5min per call) but charges
per record and handles the bot-detection bypass on their side.

### Alternatives (not yet wired, v0.7+ roadmap)

- **Apify** — `apify/twitter-scraper` actor, similar pricing.
- **Custom Playwright + camoufox + residential proxies** — DIY, much cheaper at
  scale but a maintenance burden.

## ZeroEntropy (rerank + embed)

**Requires a ZeroEntropy account.**

The CLI uses ZE for rerank (`zerank-2`) and embed (`zembed-1`). The hosted
notslop-api gateway NEVER receives your ZE key — it stays on your machine.

### Setup

1. Sign up at https://dashboard.zeroentropy.dev (free, GitHub login).
2. Generate an API key from the dashboard.
3. Set it:
   ```bash
   export ZEROENTROPY_API_KEY=ze_xxxxxxxxxxxx
   ```
   Or set it via `notslop init`.

### Cost

Free tier covers a few thousand rerank + embed calls per month. Beyond that:
~$0.0005 per rerank, ~$0.0002 per embed. See
https://zeroentropy.dev/pricing for current rates.

### Verify it works

```bash
notslop digest "test" --since 6h --top 3
# Should show "Reranking via ZeroEntropy…" and return reranked results.
```

### Alternatives (not yet wired, v0.7+ roadmap)

- **Cohere rerank-v3** — drop-in replacement.
- **Voyage AI rerank-2** — drop-in replacement.

---

## Proxies (optional, for high-volume Reddit/blog scraping)

Set `SCRAPE_PROXIES` to a comma-separated list of HTTP proxy URLs to rotate per
request. Format: `http://user:pass@host:port,http://user:pass@host:port`.

Useful when you hit Reddit rate limits or when your IP gets flagged.

Recommended providers (BYOK, not affiliated):

- **Bright Data** (residential proxies) — most reliable, expensive
- **Smartproxy** — cheaper residential
- **IPRoyal** — pay-as-you-go option

The hosted `notslop-api` rotates through `SCRAPE_PROXIES` automatically when set
as a Fly secret.

---

## Setting keys per environment

| Where | How |
|---|---|
| Local dev (CLI) | `notslop init` (writes to `~/.notslop/config.json`) or env vars |
| Self-hosted notslop-api (Fly) | `fly secrets set BRIGHTDATA_API_KEY=...` |
| Self-hosted notslop-api (other) | `.env` file or your platform's secret manager |
| Hosted notslop-api (via the CLI's `--api` flag) | The CLI forwards keys from your local config inside each `POST /v1/scrape` body. The server never persists them. |

---

## Cost summary

For a typical content-creation workflow (50 handles, 10 posts each, 1 scrape/day):

| Component | Provider | Monthly cost |
|---|---|---|
| Reddit / HN / blogs | free | $0 |
| X scraping | Bright Data | ~$15 |
| Rerank (~1000 calls/mo) | ZeroEntropy | likely free tier |
| Embed (cached forever, ~10k unique posts/mo) | ZeroEntropy | likely free tier |
| **Total** | | **~$15/mo** |

You can run notslop fully free if you skip X. Reddit + HN + blogs cover ~95%
of the AI/dev signal anyway.
