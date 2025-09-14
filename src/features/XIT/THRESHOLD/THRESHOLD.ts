import { sitesStore } from '@src/infrastructure/prun-api/data/sites';
import { getEntityNameFromAddress } from '@src/infrastructure/prun-api/data/addresses';
import THRESHOLD from '@src/features/XIT/THRESHOLD/THRESHOLD.vue';

xit.add({
  command: 'THRESHOLD',
  name: parameters => {
    if (parameters[0] && !parameters[1]) {
      const site = sitesStore.getByPlanetNaturalIdOrName(parameters[0]);
      if (site) {
        const name = getEntityNameFromAddress(site.address);
        return `THRESHOLD - ${name}`;
      }
    }

    return 'THRESHOLD';
  },
  description: 'Allows to set a threshold for a certain material.',
  optionalParameters: 'Planet Identifier(s)',
  component: () => THRESHOLD,
});
