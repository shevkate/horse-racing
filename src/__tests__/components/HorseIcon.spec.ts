import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';

import HorseIcon from '@/components/HorseIcon.vue';

// Snapshot coverage for the presentational icon wrapper. Locks the markup
// contract (root class, a11y attrs, v-html-injected SVG) so restyles or
// accidental sizing regressions surface as a diff instead of a silent visual
// change. Using inline snapshots keeps the expected output next to the test
// for quick review.

describe('HorseIcon — snapshots', () => {
  it('renders with color and label (a11y: role=img)', () => {
    const wrapper = mount(HorseIcon, {
      props: { color: '#ff0000', label: 'Thunderbolt' },
    });

    // Assert key attributes directly — snapshot captures the full SVG payload
    // so we verify the wrapper contract separately in a readable form.
    expect(wrapper.attributes('role')).toBe('img');
    expect(wrapper.attributes('aria-label')).toBe('Thunderbolt');
    expect(wrapper.attributes('aria-hidden')).toBeUndefined();
    expect(wrapper.attributes('style')).toContain('color: #ff0000');
    // Inner SVG is injected via v-html — sanity check it actually landed.
    expect(wrapper.html()).toContain('<svg');
    expect(wrapper.html()).toContain('currentColor');
  });

  it('is aria-hidden when rendered without a label', () => {
    const wrapper = mount(HorseIcon, { props: { color: 'blue' } });

    expect(wrapper.attributes('role')).toBeUndefined();
    expect(wrapper.attributes('aria-label')).toBeUndefined();
    expect(wrapper.attributes('aria-hidden')).toBe('true');
  });

  it('locks the full rendered markup', () => {
    const wrapper = mount(HorseIcon, {
      props: { color: '#abcdef', label: 'Test' },
    });

    // Full-markup snapshot — catches regressions in SVG payload, class name,
    // sizing attributes, or a11y wiring. Update with `vitest -u` if the SVG
    // asset or wrapper contract intentionally changes.
    expect(wrapper.html()).toMatchSnapshot();
  });
});
