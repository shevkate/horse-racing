import { describe, expect, it } from 'vitest'
import { getRandomInt, shuffle, takeRandom } from '@/utils/random'

describe('random utils', () => {
  describe('getRandomInt', () => {
    it('returns a number within the inclusive range', () => {
      for (let i = 0; i < 100; i += 1) {
        const result = getRandomInt(1, 10)

        expect(result).toBeGreaterThanOrEqual(1)
        expect(result).toBeLessThanOrEqual(10)
      }
    })

    it('returns the same number when min and max are equal', () => {
      expect(getRandomInt(5, 5)).toBe(5)
    })
  })

  describe('shuffle', () => {
    it('returns array with the same length', () => {
      const input = [1, 2, 3, 4, 5]
      const result = shuffle(input)

      expect(result).toHaveLength(input.length)
    })

    it('returns array with the same items', () => {
      const input = [1, 2, 3, 4, 5]
      const result = shuffle(input)

      expect([...result].sort()).toEqual([...input].sort())
    })

    it('does not mutate the original array', () => {
      const input = [1, 2, 3, 4, 5]
      const copy = [...input]

      shuffle(input)

      expect(input).toEqual(copy)
    })
  })

  describe('takeRandom', () => {
    it('returns requested number of items', () => {
      const input = [1, 2, 3, 4, 5]
      const result = takeRandom(input, 3)

      expect(result).toHaveLength(3)
    })

    it('returns only items from the source array', () => {
      const input = [1, 2, 3, 4, 5]
      const result = takeRandom(input, 3)

      result.forEach((item) => {
        expect(input).toContain(item)
      })
    })

    it('returns unique items when source items are unique', () => {
      const input = [1, 2, 3, 4, 5]
      const result = takeRandom(input, 3)

      expect(new Set(result).size).toBe(result.length)
    })

    it('does not mutate the original array', () => {
      const input = [1, 2, 3, 4, 5]
      const copy = [...input]

      takeRandom(input, 3)

      expect(input).toEqual(copy)
    })

    it('returns all available horse ids when count equals source size', () => {
      const input = [1, 2, 3]
      const result = takeRandom(input, 3)

      expect(result).toHaveLength(3)
      expect([...result].sort()).toEqual([1, 2, 3])
    })
  })
})
