import { describe, it, expect } from 'vitest'
import { mapLimit, withDeadline } from '@lib/aiConcurrency'

const tick = ms => new Promise(r => setTimeout(r, ms))

describe('mapLimit', () => {
  it('maps results index-aligned with input', async () => {
    const out = await mapLimit([1, 2, 3, 4], 2, async n => n * 10)
    expect(out).toEqual([
      { ok: true, value: 10 },
      { ok: true, value: 20 },
      { ok: true, value: 30 },
      { ok: true, value: 40 },
    ])
  })

  it('never rejects — a failing item settles to { ok:false }', async () => {
    const out = await mapLimit([1, 2, 3], 3, async n => {
      if (n === 2) throw new Error('boom')
      return n
    })
    expect(out[0]).toEqual({ ok: true, value: 1 })
    expect(out[1].ok).toBe(false)
    expect(out[2]).toEqual({ ok: true, value: 3 })
  })

  it('never runs more than `limit` at once', async () => {
    let inFlight = 0
    let peak = 0
    await mapLimit([...Array(10).keys()], 3, async () => {
      inFlight++; peak = Math.max(peak, inFlight)
      await tick(5)
      inFlight--
    })
    expect(peak).toBeLessThanOrEqual(3)
  })

  it('handles an empty list', async () => {
    expect(await mapLimit([], 4, async x => x)).toEqual([])
  })

  it('passes the index as the second arg', async () => {
    const out = await mapLimit(['a', 'b'], 2, async (v, i) => `${v}${i}`)
    expect(out.map(r => r.value)).toEqual(['a0', 'b1'])
  })
})

describe('withDeadline', () => {
  it('returns the fn result and clears the timer', async () => {
    const val = await withDeadline(1000, async () => 'done')
    expect(val).toBe('done')
  })

  it('provides an AbortSignal that fires after the deadline', async () => {
    let aborted = false
    await withDeadline(10, async signal => {
      signal.addEventListener('abort', () => { aborted = true })
      await tick(40)
    })
    expect(aborted).toBe(true)
  })

  it('does not abort when the fn finishes before the deadline', async () => {
    let aborted = false
    await withDeadline(100, async signal => {
      signal.addEventListener('abort', () => { aborted = true })
      await tick(5)
    })
    await tick(120)
    expect(aborted).toBe(false)
  })
})
