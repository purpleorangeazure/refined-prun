import { isValidUrl } from '@src/utils/is-valid-url';

const scripts = document.head.getElementsByTagName('script');
for (let i = 0; i < scripts.length; i++) {
  const script = scripts[i];
  if (script.textContent && isValidUrl(script.textContent)) {
    const clone = document.createElement('script');
    clone.src = script.textContent;
    clone.defer = script.defer;
    clone.async = script.async;
    clone.type = script.type;
    document.head.appendChild(clone);
    script.remove();
  }
}
const origMap = Array.prototype.map;

const proxyMap = function <T, U>(
  this: T[],
  callbackfn: (value: T, index: number, array: T[]) => U,
  thisArg?: unknown,
): U[] {
  try {
    if (this.length > 0 && this.some(x => x && typeof x === 'object' && 'panelDefinition' in x)) {
      // Array.prototype.map = origMap;
      // this.map = proxyMap;
      console.log('ACMPL Found commands list:', this);
      const mapped = origMap.call(this, callbackfn, thisArg) as U[];
      const sample = mapped[0] as object;
      if (!('cmd' in sample) || !('hidden' in sample) || !('parameters' in sample)) {
        return mapped;
      }
      const mySuggestion = Object.create(Object.getPrototypeOf(sample));

      Object.assign(mySuggestion, sample, {
        _cmd: 'XIT',
        _hidden: false,
        _parameters: [],
      });
      const injected = [...mapped, mySuggestion];
      console.log('ACMPL Mapped commands list:', mapped);
      console.log('ACMPL My suggestion:', mySuggestion);
      console.log('ACMPL Injected commands list:', injected);
      return injected;
    }
    return origMap.call(this, callbackfn, thisArg) as U[];
  } catch (e) {
    console.error('ACMPL Error:', e);
    return origMap.call(this, callbackfn, thisArg) as U[];
  }
};

Array.prototype.map = proxyMap;
