import type { HorseId } from './horse'
import { ROUND_DISTANCES } from '@/constants/race'

export type RoundDistance = (typeof ROUND_DISTANCES)[number]

export type RaceRound = {
  round: number
  distance: RoundDistance
  horseIds: HorseId[]
}
