import { createErreurStore, type TErreurStore } from "@dldc/erreur";

export type TPathKey = string | number;
export type TRawPath = ReadonlyArray<TPathKey>;

const IS_PATH = Symbol("IS_PATH");

const ALLOWED_CHARS = /[A-Za-z0-9$=_-]+/; // . or [ or ]
const SPLITTER = /(\[\d+\]|\.)/g;

export type TPathErreurData =
  | { kind: "CannotSplitEmpty" }
  | { kind: "InvalidStringPathItem"; item: string }
  | { kind: "InvalidNumberPathItem"; item: number };

const PathErreurInternal: TErreurStore<TPathErreurData> = createErreurStore<
  TPathErreurData
>();

export const PathErreur = PathErreurInternal.asReadonly;

function createCannotSplitEmpty() {
  return PathErreurInternal.setAndReturn(`Cannot split head of empty path`, {
    kind: "CannotSplitEmpty",
  });
}

function createInvalidStringPathItem(item: string) {
  return PathErreurInternal.setAndReturn(
    `String Path item cannot contain . or [ or ] (received "${item}")`,
    {
      kind: "InvalidStringPathItem",
      item,
    },
  );
}

function createInvalidNumberPathItem(item: number) {
  return PathErreurInternal.setAndReturn(
    `Number Path item must be a positive (or 0) integer (received "${item}")`,
    {
      kind: "InvalidNumberPathItem",
      item,
    },
  );
}

export type TPathLike = TRawPath | TPath;

export interface TPath {
  readonly [IS_PATH]: true;
  readonly raw: TRawPath;
  readonly length: number;
  readonly head: TPathKey | null;
  readonly serialize: () => string;
  readonly toString: () => string;
  readonly append: (...raw: ReadonlyArray<TPathKey>) => TPath;
  readonly prepend: (...raw: ReadonlyArray<TPathKey>) => TPath;
  readonly shift: () => TPath;
  readonly splitHead: () => [TPathKey | null, TPath];
  readonly splitHeadOrThrow: () => [TPathKey, TPath];
  [Symbol.iterator](): Iterator<TPathKey>;
}

export function createPath(...raw: ReadonlyArray<TPathKey>): TPath {
  let serialized: string | null = null;

  const self: TPath = {
    [IS_PATH]: true,
    raw,
    length: raw.length,
    head: raw[0] ?? null,
    serialize,
    toString: serialize,
    append,
    prepend,
    shift,
    splitHead,
    splitHeadOrThrow,
    [Symbol.iterator](): Iterator<TPathKey> {
      return this.raw[Symbol.iterator]();
    },
  };
  return self;

  function serialize(): string {
    if (serialized === null) {
      serialized = serializePath(self);
    }
    return serialized;
  }

  function shift(): TPath {
    return createPath(...self.raw.slice(1));
  }

  function append(...raw: ReadonlyArray<TPathKey>): TPath {
    return createPath(...self.raw, ...raw);
  }

  function prepend(...raw: ReadonlyArray<TPathKey>): TPath {
    return createPath(...raw, ...self.raw);
  }

  function splitHead(): [TPathKey | null, TPath] {
    if (raw.length === 0) {
      return [null, createPath()];
    }
    const [head, ...tail] = raw;
    return [head, createPath(...tail)];
  }

  function splitHeadOrThrow(): [TPathKey, TPath] {
    const [head, tail] = splitHead();
    if (head === null) {
      throw createCannotSplitEmpty();
    }
    return [head, tail];
  }
}

export function pathEqual(a: TPathLike, b: TPathLike): boolean {
  const aRaw = isPath(a) ? a.raw : a;
  const bRaw = isPath(b) ? b.raw : b;
  return aRaw.length === bRaw.length &&
    aRaw.every((key, i) => key === bRaw[i]);
}

export function isPath(path: any): path is TPath {
  return Boolean(path && path[IS_PATH] === true);
}

export function validatePathItem<V extends TPathKey>(item: V): V {
  if (typeof item === "number") {
    if (
      Number.isInteger(item) && item >= 0 && item < Number.MAX_SAFE_INTEGER
    ) {
      return item;
    }
    throw createInvalidNumberPathItem(item);
  }
  if (ALLOWED_CHARS.test(item)) {
    return item;
  }
  throw createInvalidStringPathItem(item);
}

/**
 * ["a", "b", "c"] => "a.b.c"
 * ["a", 0, "b"] => "a[0].b"
 */
export function serializePath(path: TPathLike): string {
  const raw = isPath(path) ? path.raw : path;

  let result = "";
  raw.forEach((item, index) => {
    if (typeof item === "number") {
      result += `[${item}]`;
      return;
    }
    if (index === 0) {
      result += item;
      return;
    }
    result += `.${item}`;
  });
  return result;
}

export function parsePath(str: string): TPath {
  const parts = str.split(SPLITTER).filter((part) =>
    part !== "." && part !== ""
  );
  return createPath(
    ...parts.map((part) => {
      if (part.startsWith("[")) {
        return parseInt(part.slice(1, -1), 10);
      }
      return part;
    }),
  );
}

export function pathFrom(...items: Array<TPathKey>): TPath;
export function pathFrom(path: TPathLike): TPath;
export function pathFrom(...args: [TPathLike] | Array<TPathKey>): TPath {
  if (args.length === 1) {
    const arg = args[0];
    if (isPath(arg)) {
      return arg;
    }
    if (Array.isArray(arg)) {
      return createPath(...arg);
    }
    return parsePath(arg as any);
  }
  return createPath(...(args as any));
}
