import { nanoid } from './utils';

const FORMI_KEY = Symbol('FORMI_KEY');

export interface IFormiKey {
  readonly [FORMI_KEY]: true;
  readonly toString: () => string;
  readonly id: string;
}

export function FormiKey(): IFormiKey {
  const id = nanoid(14);
  const print = `FormiKey(${id})`;
  const key: IFormiKey = {
    [FORMI_KEY]: true,
    toString: () => print,
    id,
  };
  return key;
}
