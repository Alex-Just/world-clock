import { expect, it } from 'vitest';
import { createDefaultSettings } from './defaults';
import { addZone, moveZone, removeZone, renameZone, setHomeZone } from './mutations';

const base = createDefaultSettings('Europe/Madrid');

it('does not add duplicates', () => {
  expect(addZone(base, { timeZone: 'Europe/Madrid', label: 'X' })).toEqual(base);
});

it('removes a zone but not the home zone', () => {
  expect(removeZone(base, 'Europe/Madrid')).toEqual(base);
  expect(removeZone(base, 'Asia/Kolkata').zones.map((z) => z.timeZone)).not.toContain(
    'Asia/Kolkata',
  );
});

it('renames and trims labels', () => {
  expect(
    renameZone(base, 'America/Denver', '  Denver HQ  ').zones.find(
      (z) => z.timeZone === 'America/Denver',
    )?.label,
  ).toBe('Denver HQ');
  expect(renameZone(base, 'America/Denver', '   ')).toEqual(base);
});

it('moves a zone within bounds', () => {
  expect(moveZone(base, 'America/Denver', -1).zones[0]?.timeZone).toBe('America/Denver');
  expect(moveZone(base, 'America/Los_Angeles', -1)).toEqual(base);
});

it('changes home without removing the old home row', () => {
  const next = setHomeZone(base, 'America/New_York');
  expect(next.homeZone).toBe('America/New_York');
  expect(next.zones.map((z) => z.timeZone)).toContain('Europe/Madrid');
});
