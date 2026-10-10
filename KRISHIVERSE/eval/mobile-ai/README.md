# eval/mobile-ai — Rice AI mobile benchmark harness (isolated)

Benchmark-only, report-only. Never imported by the farmer runtime.
Docs: `docs/ai/mobile-benchmark.md` (overview) and `docs/ai/rice-mobile-ai-benchmark-report.md` (final report).

```bash
npm run eval:mobile-ai    # runs all benchmark suites + builds comparison/decision matrix/manifest
```

- Schemas & matrix vocabulary: `schemas.js`
- Arm registry: `registry.js` · datasets: `datasets/` · adapters: `adapters/`
- Suites: `benchmarks/*.test.js` → results in `results/*.json`
- Comparison/decision-matrix builder: `buildComparison.mjs`
