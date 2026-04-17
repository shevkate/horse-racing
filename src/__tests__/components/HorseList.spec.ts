import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

import HorseList from '@/components/HorseList.vue'
import { useRaceStore } from '@/stores/race'
import type { Horse } from '@/types'

const horses: Horse[] = [
  { id: 1, name: 'Thunderbolt', color: 'hsl(0, 70%, 50%)', condition: 85 },
  { id: 2, name: 'Silver Wind', color: 'hsl(120, 70%, 50%)', condition: 42 },
]

describe('HorseList', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('renders empty state when horses list is empty', () => {
    const wrapper = mount(HorseList)

    expect(wrapper.text()).toContain('No horses generated yet')
    expect(wrapper.findAll('.list__item')).toHaveLength(0)
  })

  it('renders horses list', () => {
    const store = useRaceStore()
    store.$patch({ horses })

    const wrapper = mount(HorseList)
    const items = wrapper.findAll('.list__item')

    expect(items).toHaveLength(2)
    expect(wrapper.text()).toContain('Thunderbolt')
    expect(wrapper.text()).toContain('Silver Wind')
  })

  it('renders progressbar attributes and values', () => {
    const store = useRaceStore()
    store.$patch({ horses })

    const wrapper = mount(HorseList)
    const progressBars = wrapper.findAll('[role="progressbar"]')

    expect(progressBars).toHaveLength(2)
    expect(progressBars[0].attributes('aria-valuenow')).toBe('85')
    expect(progressBars[0].attributes('aria-valuemin')).toBe('0')
    expect(progressBars[0].attributes('aria-valuemax')).toBe('100')
    expect(progressBars[0].attributes('aria-label')).toBe('Thunderbolt condition')

    expect(progressBars[1].attributes('aria-valuenow')).toBe('42')
    expect(progressBars[1].attributes('aria-label')).toBe('Silver Wind condition')
  })

  it('renders condition bar width style', () => {
    const store = useRaceStore()
    store.$patch({ horses })

    const wrapper = mount(HorseList)
    const bars = wrapper.findAll('.horse__bar')

    expect(bars[0].attributes('style')).toContain('width: 85%')
    expect(bars[1].attributes('style')).toContain('width: 42%')
  })
})
