import { describe, expect, it } from 'vitest';

import { HUBS } from './flights';
import { COUNTRY_FEATURES } from './geography';

describe('the flights’ cities', () => {
  it('name countries the way the map does, so a plane can open its destination', () => {
    const onMap = new Set(COUNTRY_FEATURES.map((feature) => feature.code));
    for (const hub of HUBS) expect(onMap, hub.code).toContain(hub.code);
  });
});
