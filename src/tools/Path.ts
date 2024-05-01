import { createErreurStore } from '@dldc/erreur';

export type TPathKey = string | number;
export type TRawPath = ReadonlyArray<TPathKey>;

const IS_PATH = Symbol('IS_PATH');

const ALLOWED_CHARS = /[A-Za-z0-9$=_-]+/; // . or [ or ]
const SPLITTER = /(\[\d+\]|\.)/g;

export type TPathErreurData =
  | { kind: 'CannotSplitEmpty' }
  | { kind: 'InvalidStringPathItem'; item: string }
  | { kind: 'InvalidNumberPathItem'; item: number };

const PathErreurInternal = createErreurStore<TPathErreurData>();

export const PathErreur = PathErreurInternal.asReadonly;

function createCannotSplitEmpty() {
  return PathErreurInternal.setAndReturn(`Cannot split head of empty path`, {
    kind: 'CannotSplitEmpty',
  });
}

function createInvalidStringPathItem(item: string) {
  return PathErreurInternal.setAndReturn(`String Path item cannot contain . or [ or ] (received "${item}")`, {
    kind: 'InvalidStringPathItem',
    item,
  });
}

function createInvalidNumberPathItem(item: number) {
  return PathErreurInternal.setAndReturn(`Number Path item must be a positive (or 0) integer (received "${item}")`, {
    kind: 'InvalidNumberPathItem',
    item,
  });
}

export type TPathLike = TRawPath | Path;

export interface Path {
  readonly [IS_PATH]: true;
  readonly raw: TRawPath;
  readonly length: number;
  readonly head: TPathKey | null;
  readonly serialize: () => string;
  readonly toString: () => string;
  readonly append: (...raw: ReadonlyArray<TPathKey>) => Path;
  readonly prepend: (...raw: ReadonlyArray<TPathKey>) => Path;
  readonly shift: () => Path;
  readonly splitHead: () => [TPathKey | null, Path];
  readonly splitHeadOrThrow: () => [TPathKey, Path];
  [Symbol.iterator](): Iterator<TPathKey>;
}

export const Path = (() => {
  return Object.assign(create, {
    create: create,
    isPath,
    validatePathItem,
    serialize,
    parse,
    from: pathFrom,
    equal,
  });

  function create(...raw: ReadonlyArray<TPathKey>): Path {
    let serialized: string | null = null;

    const self: Path = {
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
        serialized = Path.serialize(self);
      }
      return serialized;
    }

    function shift(): Path {
      return Path(...self.raw.slice(1));
    }

    function append(...raw: ReadonlyArray<TPathKey>): Path {
      return Path(...self.raw, ...raw);
    }

    function prepend(...raw: ReadonlyArray<TPathKey>): Path {
      return Path(...raw, ...self.raw);
    }

    function splitHead(): [TPathKey | null, Path] {
      if (raw.length === 0) {
        return [null, Path()];
      }
      const [head, ...tail] = raw;
      return [head, Path(...tail)];
    }

    function splitHeadOrThrow(): [TPathKey, Path] {
      const [head, tail] = splitHead();
      if (head === null) {
        throw createCannotSplitEmpty();
      }
      return [head, tail];
    }
  }

  function equal(a: TPathLike, b: TPathLike): boolean {
    const aRaw = isPath(a) ? a.raw : a;
    const bRaw = isPath(b) ? b.raw : b;
    return aRaw.length === bRaw.length && aRaw.every((key, i) => key === bRaw[i]);
  }

  function isPath(path: any): path is Path {
    return Boolean(path && path[IS_PATH] === true);
  }

  function validatePathItem<V extends TPathKey>(item: V): V {
    if (typeof item === 'number') {
      if (Number.isInteger(item) && item >= 0 && item < Number.MAX_SAFE_INTEGER) {
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
  function serialize(path: TPathLike): string {
    const raw = Path.isPath(path) ? path.raw : path;

    let result = '';
    raw.forEach((item, index) => {
      if (typeof item === 'number') {
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

  function parse(str: string): Path {
    const parts = str.split(SPLITTER).filter((part) => part !== '.' && part !== '');
    return Path(
      ...parts.map((part) => {
        if (part.startsWith('[')) {
          return parseInt(part.slice(1, -1), 10);
        }
        return part;
      }),
    );
  }

  function pathFrom(...items: Array<TPathKey>): Path;
  function pathFrom(path: TPathLike): Path;
  function pathFrom(...args: [TPathLike] | Array<TPathKey>): Path {
    if (args.length === 1) {
      const arg = args[0];
      if (Path.isPath(arg)) {
        return arg;
      }
      if (Array.isArray(arg)) {
        return Path(...arg);
      }
      return Path.parse(arg as any);
    }
    return Path(...(args as any));
  }
})();
