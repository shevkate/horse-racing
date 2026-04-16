import { describe, expect, it } from 'vitest'
import { HORSE_NAMES, TOTAL_HORSES } from '@/constants/race'
import { generateHorses } from '@/utils/generateHorses'

describe('generateHorses', () => {
  it('generates the expected number of horses', () => {
    const horses = generateHorses()

    expect(horses).toHaveLength(TOTAL_HORSES)
  })

  it('generates horses with sequential ids starting from 1', () => {
    const horses = generateHorses()

    expect(horses.map((horse) => horse.id)).toEqual(
      Array.from({ length: TOTAL_HORSES }, (_, index) => index + 1)
    )
  })

  it('assigns names from HORSE_NAMES', () => {
    const horses = generateHorses()

    expect(horses.map((horse) => horse.name)).toEqual(HORSE_NAMES)
  })

  it('generates unique colors for all horses', () => {
    const horses = generateHorses()
    const colors = horses.map((horse) => horse.color)

    expect(new Set(colors).size).toBe(TOTAL_HORSES)
  })

  it('generates condition values in range from 1 to 100', () => {
    const horses = generateHorses()

    horses.forEach((horse) => {
      expect(horse.condition).toBeGreaterThanOrEqual(1)
      expect(horse.condition).toBeLessThanOrEqual(100)
    })
  })
})
