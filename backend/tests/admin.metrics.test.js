import { expect } from 'chai'
import {
  percentile, summarizeLatency, ratio, percent, confusionMatrix, classificationMetrics,
  recallAtK, mrr, rankMetrics, tally,
} from '../src/admin/metrics/math.js'

describe('Admin metric math', () => {
  it('percentile interpolates and handles degenerate input', () => {
    expect(percentile([1, 2, 3, 4, 5], 50)).to.equal(3)
    expect(percentile([10], 95)).to.equal(10)
    expect(percentile([], 95)).to.equal(null)
    expect(percentile([1, 2, 3], 100)).to.equal(3)
  })

  it('summarizeLatency returns null-safe percentiles', () => {
    const summary = summarizeLatency([10, 20, 30, 40, 50])
    expect(summary.count).to.equal(5)
    expect(summary.p50).to.equal(30)
    expect(summary.p95).to.be.a('number')
    expect(summary.max).to.equal(50)

    const empty = summarizeLatency([])
    expect(empty).to.deep.equal({ count: 0, avg: null, p50: null, p95: null, p99: null, max: null })
    expect(summarizeLatency([NaN, undefined, 5]).count).to.equal(1)
  })

  it('ratio and percent never return Infinity or NaN', () => {
    expect(ratio(1, 0)).to.equal(null)
    expect(percent(1, 0)).to.equal(null)
    expect(ratio(1, 4)).to.equal(0.25)
    expect(percent(1, 4)).to.equal(25)
  })

  it('builds a confusion matrix from row data', () => {
    const matrix = confusionMatrix([
      { actual: 'blast', predicted: 'blast' },
      { actual: 'blast', predicted: 'blight' },
      { actual: 'blight', predicted: 'blight' },
      { actual: 'blight', predicted: 'blight' },
      { actual: 'healthy', predicted: 'blast' },
    ])
    expect(matrix.labels).to.deep.equal(['blast', 'blight', 'healthy'])
    expect(matrix.matrix.blast.blast).to.equal(1)
    expect(matrix.matrix.blast.blight).to.equal(1)
    expect(matrix.support.healthy).to.equal(1)
    expect(matrix.predictedTotals.healthy).to.equal(0)
    expect(matrix.accuracy).to.equal(0.6)
  })

  it('derives per-class precision / recall / F1 and macro averages', () => {
    const metrics = classificationMetrics(confusionMatrix([
      { actual: 'blast', predicted: 'blast' },
      { actual: 'blast', predicted: 'blast' },
      { actual: 'blast', predicted: 'blight' },
      { actual: 'blight', predicted: 'blight' },
      { actual: 'blight', predicted: 'blight' },
      { actual: 'blight', predicted: 'blast' },
    ]))
    expect(metrics.accuracy).to.equal(0.6667)
    expect(metrics.perClass.blast.precision).to.equal(0.6667)
    expect(metrics.perClass.blast.recall).to.equal(0.6667)
    expect(metrics.perClass.blast.f1).to.equal(0.6667)
    expect(metrics.macro.f1).to.be.a('number')
    expect(metrics.weighted.f1).to.be.a('number')
  })

  it('returns null metrics instead of dividing by zero', () => {
    const metrics = classificationMetrics(confusionMatrix([]))
    expect(metrics.accuracy).to.equal(null)
    expect(metrics.macro.f1).to.equal(null)
    expect(metrics.weighted.f1).to.equal(null)
  })

  it('computes Recall@K over ranked results', () => {
    const rows = [
      { expected: 'a', retrieved: ['a', 'b'] },
      { expected: 'b', retrieved: ['x', 'y'] },
      { expected: ['c', 'd'], retrieved: ['z', 'c'] },
      { expected: 'e', retrieved: [] },
    ]
    expect(recallAtK(rows, 1).hits).to.equal(1)
    expect(recallAtK(rows, 3).hits).to.equal(2)
    expect(recallAtK(rows, 3).recallAtK).to.equal(0.6667)
    expect(recallAtK([], 5).recallAtK).to.equal(null)
  })

  it('computes MRR from the first relevant hit', () => {
    const rows = [
      { expected: 'a', retrieved: ['a'] },
      { expected: 'b', retrieved: ['x', 'b'] },
      { expected: 'c', retrieved: ['x', 'y'] },
    ]
    expect(mrr(rows).mrr).to.equal(0.5)
    expect(mrr([]).mrr).to.equal(null)
  })

  it('derives Recall@K and MRR from raw ranks', () => {
    const metrics = rankMetrics([1, 1, 3, 7, null, 2])
    expect(metrics.n).to.equal(5)
    expect(metrics.recallAt1).to.equal(0.4)
    expect(metrics.recallAt3).to.equal(0.8)
    expect(metrics.recallAt5).to.equal(0.8)
    expect(metrics.mrr).to.equal(0.5952)
    expect(rankMetrics([]).mrr).to.equal(null)
  })

  it('tallies values and sorts by count', () => {
    expect(tally(['a', 'b', 'a', 'a', 'c'])).to.deep.equal({ a: 3, b: 1, c: 1 })
    expect(tally([undefined, null, 'x'])).to.deep.equal({ x: 1 })
  })
})
