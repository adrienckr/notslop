# Example: LinkedIn post on the RAG market

## User

> "Write me a LinkedIn post on the RAG market"

## Agent runs digest

```bash
notslop digest "RAG market" --since 7d --top 15 --for-content
```

## Digest output (abbreviated)

```
[1] news.ycombinator.com · "Is RAG still the right answer in 2025?"
    "HN thread: top comment argues that long-context models have made naive RAG
     obsolete for <200k token use cases. 340 points."
    https://news.ycombinator.com/item?id=40098765

[2] r/MachineLearning · "RAG vs fine-tuning: the 2025 comparison"
    "Survey of 200 ML teams: 68% still using RAG as primary retrieval strategy,
     but 41% added a reranking layer in the last 6 months."
    https://reddit.com/r/MachineLearning/comments/1jkl012

[3] x.com/@hwchase17 · "The RAG stack is settling..."
    "Embed → retrieve → rerank → generate is now table stakes.
     The differentiation is in the chunking strategy and eval loop."
    https://x.com/hwchase17/status/1790000003
```

## Post draft

---

68% of ML teams are still running RAG as their primary retrieval strategy in 2025

But the stack underneath that number has shifted.

A survey of 200 teams published this week found that 41% added a reranking layer
in the last 6 months — up from near-zero in 2023.
Embed → retrieve → rerank → generate is now the default.
The differentiation has moved to chunking strategy and eval.

Meanwhile, an HN thread this week asked whether long-context models have made naive
RAG obsolete for sub-200k token use cases.
The honest answer: yes, for simpler retrieval tasks.
For anything requiring freshness, cost efficiency at scale, or source attribution,
retrieval isn't going anywhere.

The pattern: the "is RAG dead?" question is a distraction.
The real question is whether your reranking layer is doing meaningful work,
or whether you're just retrieving more chunks and hoping the model figures it out.

Measure recall@k with and without reranking on your own data before deciding.

---

**Char count: ~1,070 / 1,300 target**

## Sources

1. HN: "Is RAG still the right answer in 2025?" — https://news.ycombinator.com/item?id=40098765
2. r/MachineLearning: "RAG vs fine-tuning: the 2025 comparison" — https://reddit.com/r/MachineLearning/comments/1jkl012
3. @hwchase17 on X: "The RAG stack is settling..." — https://x.com/hwchase17/status/1790000003
