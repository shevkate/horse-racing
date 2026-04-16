import { describe, expect, it, vi, afterEach } from 'vitest'

import type { Horse, RaceRound } from '@/types'
import { runRound } from '@/utils/runRound'

describe('runRound', () => {
  const horses: Horse[] = [
    { id: 1, name: 'Horse 1', color: 'red', condition: 90 },
    { id: 2, name: 'Horse 2', color: 'blue', condition: 70 },
    { id: 3, name: 'Horse 3', color: 'green', condition: 50 },
  ]

  const round: RaceRound = {
    round: 1,
    distance: 1200,
    horseIds: [1, 2, 3],
  }

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns result for the given round', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)

    const result = runRound(round, horses)

    expect(result.round).toBe(1)
    expect(result.distance).toBe(1200)
    expect(result.items).toHaveLength(3)
  })

  it('includes only horses from the round', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)

    const partialRound: RaceRound = {
      round: 2,
      distance: 1400,
      horseIds: [1, 3],
    }

    const result = runRound(partialRound, horses)

    expect(result.items.map((item) => item.horseId)).toEqual(
      expect.arrayContaining([1, 3])
    )
    expect(result.items).toHaveLength(2)
  })

  it('sorts horses by score in descending order', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)

    const result = runRound(round, horses)

    expect(result.items.map((item) => item.horseId)).toEqual([1, 2, 3])
    expect(result.items.map((item) => item.score)).toEqual([90, 70, 50])
  })

  it('assigns sequential positions starting from 1', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)

    const result = runRound(round, horses)

    expect(result.items.map((item) => item.position)).toEqual([1, 2, 3])
  })

  it('ignores horse ids that are missing from the horses list', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)

    const invalidRound: RaceRound = {
      round: 3,
      distance: 1600,
      horseIds: [1, 99],
    }

    const result = runRound(invalidRound, horses)

    expect(result.items).toHaveLength(1)
    expect(result.items[0].horseId).toBe(1)
  })
})
