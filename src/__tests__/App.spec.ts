import { describe, expect, it } from 'vitest'

import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'

import App from '@/App.vue'

describe('App', () => {
  it('renders the game title', () => {
    const wrapper = mount(App, {
      global: {
        plugins: [createPinia()],
      },
    })

    expect(wrapper.text()).toContain('Horse Racing')
  })

  it('renders all main sections', () => {
    const wrapper = mount(App, {
      global: {
        plugins: [createPinia()],
      },
    })

    expect(wrapper.find('.page__header').exists()).toBe(true)
    expect(wrapper.find('.page__grid').exists()).toBe(true)
  })
})
