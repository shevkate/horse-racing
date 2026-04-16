import type { HorseId } from './horse'
import type { RoundDistance } from './round'

export type RoundResultItem = {
  horseId: HorseId
  position: number
  score: number
}

export type RoundResult = {
  round: number
  distance: RoundDistance
  items: RoundResultItem[]
}
