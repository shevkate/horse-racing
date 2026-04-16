import { defineStore } from 'pinia'
import { ref } from 'vue'

import type { Horse, RaceRound, RaceStatus, RoundResult } from '@/types'
import { generateHorses, generateSchedule } from '@/utils'
import { runRound } from '@/utils/runRound'

export const useRaceStore = defineStore('race', () => {
  const horses = ref<Horse[]>([])
  const schedule = ref<RaceRound[]>([])
  const results = ref<RoundResult[]>([])
  const currentRound = ref(0)
  const status = ref<RaceStatus>('idle')

  const init = (): void => {
    horses.value = generateHorses()
    schedule.value = []
    results.value = []
    currentRound.value = 0
    status.value = 'idle'
  }

  const createSchedule = (): void => {
    if (horses.value.length === 0) {
      horses.value = generateHorses()
    }

    schedule.value = generateSchedule(horses.value)
    results.value = []
    currentRound.value = 0
    status.value = 'scheduled'
  }

  const runNextRound = (): RoundResult | null => {
    if (currentRound.value >= schedule.value.length) {
      status.value = 'finished'
      return null
    }

    const round = schedule.value[currentRound.value]
    if (!round) return null

    const result = runRound(round, horses.value)

    results.value.push(result)
    currentRound.value += 1
    status.value = currentRound.value === schedule.value.length ? 'finished' : 'running'

    return result
  }

  const startRace = (): void => {
    if (schedule.value.length === 0 || status.value !== 'scheduled') return
    status.value = 'running'
  }

  const resetRace = (): void => {
    schedule.value = []
    results.value = []
    currentRound.value = 0
    status.value = 'idle'
  }

  return {
    horses,
    schedule,
    results,
    currentRound,
    status,
    init,
    createSchedule,
    runNextRound,
    startRace,
    resetRace,
  }
})
