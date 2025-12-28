import autocomplete from 'autocompleter';
import { onNodeTreeMutation } from '@src/utils/on-node-tree-mutation.ts';

const suggestions = [
  {
    label: 'XIT SET',
    value: 'XIT SET',
  },
  {
    label: 'XIT SET2',
    value: 'XIT SET',
  },
  {
    label: 'XIT SET3',
    value: 'XIT SET',
  },
];

function processMutations(mutations: MutationRecord[]) {
  const addedSelectorElements = mutations.flatMap(mutation => {
    const selectorElements: HTMLElement[] = [];
    mutation.addedNodes.forEach(async node => {
      if (node instanceof HTMLElement) {
        const tileSelector = _$(node, C.Tile.selector);
        if (tileSelector) {
          selectorElements.push(tileSelector);
        }
      }
    });
    return selectorElements;
  });
  addedSelectorElements.forEach(async selector => {
    const panelSelector = await $(selector, C.PanelSelector.container);
    const input = (await $(panelSelector, C.PanelSelector.input)) as HTMLInputElement;
    const suggestionsContainer = document.createElement('div');
    suggestionsContainer.classList.add(
      C.PanelSelector.suggestionsContainer,
      C.suggestions.suggestionsContainer,
    );
    panelSelector.appendChild(suggestionsContainer);
    autocomplete({
      input: input,
      showOnFocus: true,
      fetch: (text, update) => {
        update(suggestions);
      },
      onSelect: item => {
        input.value = item.label!;
      },
      container: suggestionsContainer,
      render: item => {
        const div = document.createElement('div');
        const cmd = document.createElement('span');
        cmd.classList.add(
          C.PanelSelector.cmd,
          C.fonts.fontRegular,
          C.type.typeRegular,
          C.PanelSelector.entry,
        );
        cmd.textContent = item.label!;
        div.appendChild(cmd);
        const divider = document.createElement('span');
        divider.classList.add(
          C.PanelSelector.divider,
          C.fonts.fontRegular,
          C.type.typeRegular,
          C.PanelSelector.entry,
        );
        divider.textContent = '|';
        div.appendChild(divider);
        const params = document.createElement('span');
        params.classList.add(
          C.PanelSelector.params,
          C.fonts.fontRegular,
          C.type.typeRegular,
          C.PanelSelector.entry,
        );
        params.textContent = 'NONE';
        div.appendChild(params);
        div.appendChild(divider);
        const description = document.createElement('span');
        description.classList.add(
          C.PanelSelector.description,
          C.fonts.fontRegular,
          C.type.typeRegular,
          C.PanelSelector.entry,
        );
        description.textContent = 'NONE YET';
        div.appendChild(description);
        return div;
      },
      customize: (input, inputRect, container, maxHeight) => {
        container.style.position = 'relative';
        container.style.top = '';
        container.style.left = '';
      },
    });
  });
}

function init() {
  onNodeTreeMutation(document, processMutations);
}

features.add(import.meta.url, init, 'Adds autocomplete for XIT tiles.');
