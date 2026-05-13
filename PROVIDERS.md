# Providers

notslop is **BYOK** — bring your own keys, the gateway stores nothing. This file
tells you for each scraping source and rerank/embed provider: what you need, where
to get the key, what it costs, and how to set it.

## TL;DR — what you actually need

| If you want to use… | You need | Cost |
|---|---|---|
| Reddit, HN, blogs (default) | nothing | free |
| X (Twitter) | an Orthogonal account | $10 free → ~$0.02/scrape |
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

## X (Twitter) — via Orthogonal

**Requires an Orthogonal account.**

Orthogonal is a unified API gateway. You sign up once, get one key, and it proxies
to ScrapeCreators (which handles X scraping, plus Reddit/LinkedIn/TikTok/etc. for
future skills).

### Step-by-step setup

1. Sign up at https://orthogonal.com/sign-up (GitHub login). $10 free credits.
2. Copy your API key from the dashboard (format: `orth_live_xxxxxxxxxxxx`).
3. Set it:
   ```bash
   export ORTHOGONAL_API_KEY=orth_live_xxxxxxxxxxxx
   ```
   Or put it in `~/.notslop/config.json` via `notslop init`.

### Cost

- ~$0.02 per handle scrape (10 tweets returned per call).
- $10 free credits at signup ≈ 500 handle scrapes.
- Pay-as-you-go after the free tier.

### Verify

```bash
notslop sources --check x
# expected: ✔ X scrape via Orthogonal ScrapeCreators (priceCents: 2)
```

### Why Orthogonal and not the official X API?

X API is $200/month minimum. Bright Data is functional but asks you to manage
a dataset_id and a separate billing flow. Orthogonal collapses 20+ social
scraping providers into a single key — easier onboarding, same data quality.

### Alternatives (v0.8+ roadmap)

When notslop adds Reddit / LinkedIn / TikTok scraping via Orthogonal (instead
of just X), the same Orthogonal key will cover all of them.

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
| Self-hosted notslop-api (Fly) | `fly secrets set ORTHOGONAL_API_KEY=...` |
| Self-hosted notslop-api (other) | `.env` file or your platform's secret manager |
| Hosted notslop-api (via the CLI's `--api` flag) | The CLI forwards keys from your local config inside each `POST /v1/scrape` body. The server never persists them. |

---

## Cost summary

For a typical content-creation workflow (50 handles, 10 posts each, 1 scrape/day):

| Component | Provider | Monthly cost |
|---|---|---|
| Reddit / HN / blogs | free | $0 |
| X scraping (50 handles × daily) | Orthogonal | ~$30 (after $10 free credits) |
| Rerank (~1000 calls/mo) | ZeroEntropy | likely free tier |
| Embed (cached forever, ~10k unique posts/mo) | ZeroEntropy | likely free tier |
| **Total** | | **~$30/mo** |

The first ~500 X handle scrapes are free (the signup credit). You can run notslop
fully free if you skip X — Reddit + HN + blogs cover ~95% of the AI/dev signal
anyway.
