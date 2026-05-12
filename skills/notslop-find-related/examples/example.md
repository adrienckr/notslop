# Example: Find related to a Karpathy tweet

User: "Find recent posts related to this thread: https://x.com/karpathy/status/123 — I want to repurpose it for LinkedIn."

Agent steps:

1. Bash: `notslop find-related "https://x.com/karpathy/status/123" --since 14d --top 10 --format json`

2. Parsed result (abbreviated):

   ```json
   {
     "input": "Ran Claude 4.5 on my eval suite...",
     "related": [
       { "rank": 1, "similarity": 0.91, "post": { "source": "reddit", "title": "Claude 4.5 benchmark results", "url": "https://reddit.com/...", "author": "dev_curious" } },
       { "rank": 2, "similarity": 0.88, "post": { "source": "hn", "title": "Sonnet 4.5 vs o3 comparison", "url": "https://news.ycombinator.com/..." } },
       { "rank": 3, "similarity": 0.84, "post": { "source": "blogs", "title": "Claude 4.5 release notes", "url": "https://anthropic.com/..." } }
     ]
   }
   ```

3. Agent presents:

   > Found 10 related posts in the last 14 days. The top 3:
   >
   > 1. r/ClaudeCode benchmark thread (sim 0.91) — agrees with Karpathy's findings on the speed regression.
   > 2. HN comparison with o3 (sim 0.88) — broader context.
   > 3. Anthropic's own release notes (sim 0.84) — official framing to potentially counter.
   >
   > For your LinkedIn repurpose: I'd ground the post in Karpathy's specific eval results + reference the HN comparison to position the trade-off. Want me to draft it now using notslop-write-linkedin-post?
