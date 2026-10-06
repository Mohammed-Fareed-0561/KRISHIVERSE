# Joint RAG Benchmark

## Purpose

Benchmark that runs the same cases through both RAG stacks:
- **Stack A**: Frontend IndexedDB/offline RAG (KRISHIVERSE/src/services/ai/)
- **Stack B**: Python FastAPI RAG (backend/rag_service/)

## Metrics

For each case:
- Recall@1, Recall@3, Recall@5
- MRR (Mean Reciprocal Rank)
- Latency (ms)
- Language
- Topic
- Source class

## Case Sources

1. Existing 44 cases from `KRISHIVERSE/eval/cases.retrieval.js`
2. Additional cases only when expected evidence is defensible

## Expected Evidence

- No fabricated expected evidence
- Expected KB IDs must be manually verified against actual KB records
- Cases without defensible expected evidence are excluded

## Results Summary

| Category | Count |
|----------|-------|
| Both A and B succeed | TBD |
| A only succeeds | TBD |
| B only succeeds | TBD |
| Both fail | TBD |

## Status

Benchmark infrastructure defined. Execution pending test run.
