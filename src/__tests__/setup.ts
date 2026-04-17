import { expect } from 'vitest';

/**
 * Strip Vue's scoped-CSS `data-v-*` attributes before taking snapshots.
 * The hash changes whenever a `<style scoped>` block is touched, even if
 * the rendered markup is unchanged — without this serializer, unrelated
 * style edits would force every snapshot to update. The attributes carry
 * no behavioural signal, so dropping them keeps snapshots focused on
 * markup contracts.
 */
expect.addSnapshotSerializer({
  serialize(value, config, indentation, depth, refs, printer) {
    const stripped = (value as string).replace(/ data-v-[a-f0-9]+=""/g, '');
    return printer(stripped, config, indentation, depth, refs);
  },
  test(value) {
    return typeof value === 'string' && / data-v-[a-f0-9]+=""/.test(value);
  },
});
