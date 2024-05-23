import { nanoid } from "./utils.ts";

const FORMI_KEY = Symbol("FORMI_KEY");

export interface TFormiKey {
  readonly [FORMI_KEY]: true;
  readonly toString: () => string;
  readonly id: string;
}

export function createFormiKey(): TFormiKey {
  const id = nanoid(14);
  const print = `FormiKey(${id})`;
  const key: TFormiKey = {
    [FORMI_KEY]: true,
    toString: () => print,
    id,
  };
  return key;
}
