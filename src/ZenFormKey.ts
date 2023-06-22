import { nanoid } from './utils';

const FORMI_KEY = Symbol('FORMI_KEY');

export interface ZenFormKey {
  readonly [FORMI_KEY]: true;
  readonly toString: () => string;
  readonly id: string;
}

export const ZenFormKey = (() => {
  return create;

  function create(): ZenFormKey {
    const id = nanoid(14);
    const print = `ZenFormKey(${id})`;
    const key: ZenFormKey = {
      [FORMI_KEY]: true,
      toString: () => print,
      id,
    };
    return key;
  }
})();
