import { act } from '@src/features/XIT/ACT/act-registry';
import { fixed0, fixed2 } from '@src/utils/format';
import Edit from '@src/features/XIT/ACT/material-groups/manual/Edit.vue';

act.addMaterialGroup({
  type: 'Manual',
  shortDescription: 'A fixed list of materials and quantities',
  description: data => {
    const materials = data.materials;
    if (!materials || Object.keys(materials).length == 0) {
      return '--';
    }

    return Object.keys(materials)
      .map(
        ticker =>
          `${fixed0(materials[ticker].quantity)} ${ticker} ${materials[ticker].price !== undefined ? ` @ ${fixed2(materials[ticker].price)}` : ''}`,
      )
      .join(', ');
  },
  editComponent: Edit,
  generateMaterialBill: async ({ data, log }) => {
    if (!data.materials || Object.keys(data.materials).length == 0) {
      log.error('Missing materials.');
      return undefined;
    }
    return data.materials;
  },
});
