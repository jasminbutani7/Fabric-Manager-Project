import { describe, it, expect } from 'vitest';
import { generateEntityId, generateUUID } from '../src/utils/idGenerator';

describe('idGenerator', () => {
  it('generates unique prefixed entity IDs', () => {
    const id1 = generateEntityId('fab');
    const id2 = generateEntityId('fab');
    expect(id1).toMatch(/^fab_[a-f0-9]+$/);
    expect(id2).toMatch(/^fab_[a-f0-9]+$/);
    expect(id1).not.toBe(id2);
  });

  it('generates IDs with correct custom prefixes', () => {
    expect(generateEntityId('cut')).toMatch(/^cut_/);
    expect(generateEntityId('asgn')).toMatch(/^asgn_/);
    expect(generateEntityId('inv')).toMatch(/^inv_/);
    expect(generateEntityId('exp')).toMatch(/^exp_/);
  });

  it('generates standard RFC 4122 v4 UUIDs', () => {
    const uuid = generateUUID();
    expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  });

  it('produces 10,000 IDs without collision', () => {
    const set = new Set();
    const count = 10000;
    for (let i = 0; i < count; i++) {
      const id = generateEntityId('test');
      set.add(id);
    }
    expect(set.size).toBe(count);
  });
});
