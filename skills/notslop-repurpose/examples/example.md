# Example: Repurposing an X thread for LinkedIn

A walkthrough of `notslop-repurpose` taking a tight X thread and adapting it to a longer-form LinkedIn post. The point is to keep the core insight but layer in fresh context so the LinkedIn version doesn't read as a recycled tweet.

## Prompt

> User: "Repurpose https://x.com/karpathy/status/123 for LinkedIn"

## Step 1 — Read the source

Claude fetches the X thread. Karpathy's quick benchmark: Claude 4.5 lands roughly 18% better on multi-step coding tasks but takes ~30% longer per call. Three tweets, no hedging.

## Step 2 — Identify the core insight

Strip the platform framing. The one thing the thread is saying: **"4.5 is better at code but slower."** That insight survives any platform. Everything else is X-native (the quick punchy register, the "lol" at the end of tweet 2, the screenshot-of-benchmark format).

## Step 3 — Pull fresh context

```bash
npx notslop@latest digest "Claude 4.5 benchmark" --since 7d --format json --top 5
```

The digest returns five recent items. The two most useful for layering:

- **[reddit · r/LocalLLaMA]** — a thread reproducing Karpathy's result on a 6-file refactor task, posted three days after the original
- **[hn · Comments]** — a YC engineer reporting the same latency pattern in a production agent workload

These add credibility without copying Karpathy's exact framing.

## Step 4 — Write the LinkedIn version

```
Claude 4.5 is better at code but noticeably slower. That's the trade-off Karpathy flagged on X last week, and the follow-up data is starting to confirm it.

Three data points from the last 7 days:
- Karpathy's bench: ~18% improvement on multi-step coding tasks, ~30% latency increase
- An r/LocalLLaMA thread reproducing the result on a 6-file refactor
- An HN comment from a YC engineer reporting the same pattern in production

The pricing change on Sonnet pushed people to test 4.5 in workloads where they previously used Haiku. Latency lands differently when the work is interactive vs batch. Worth measuring on your own stack before committing.
```

~1100 chars. Professional register. Karpathy is credited but no longer the whole post. The Reddit reproduction and the HN comment are fresh signal that wasn't in the original thread — they make the LinkedIn version feel like its own piece, not a screenshot of someone else's tweet.

## What was added vs the source

| From source | Added from digest |
|-------------|-------------------|
| The 18% / 30% numbers | r/LocalLLaMA reproduction |
| Karpathy's framing | HN production report |
| —                   | The pricing-change context tying it back to Haiku migration |

Highlight these to the user before they ship — it's the part that earns this version the right to exist instead of being a copy-paste.
