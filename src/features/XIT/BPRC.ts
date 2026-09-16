import BPRC from '@src/features/XIT/BPRC.vue';

xit.add({
  command: ['BPRC'],
  name: 'BLUEPRINT REPAIR CALCULATOR',
  description: 'Blueprint repair calculator.',
  optionalParameters: 'Blueprint and damage',
  contextItems: () => [{ cmd: 'BLU' }],
  component: () => BPRC,
});
