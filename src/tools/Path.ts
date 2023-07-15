import { ErreurType } from '@dldc/erreur';

export type TKey = string | number;
export type TRawPath = ReadonlyArray<TKey>;

const IS_PATH = Symbol('IS_PATH');

const ALLOWED_CHARS = /[A-Za-z0-9$=_-]+/; // . or [ or ]
const SPLITTER = /(\[\d+\]|\.)/g;

export interface IInvalidStringPathItem {
  readonly item: string;
}

export interface IInvalidNumberPathItem {
  readonly item: number;
}

export const PathErrors = {
  CannotSplitEmpty: ErreurType.defineEmpty('CannotSplitEmpty', (err, provider) => {
    return err.with(provider).withMessage(`Cannot split head of empty path`);
  }),
  InvalidStringPathItem: ErreurType.defineWithTransform(
    'InvalidStringPathItem',
    (item: string): IInvalidStringPathItem => ({ item }),
    (err, provider, data) => {
      return err.with(provider).withMessage(`String Path item cannot contain . or [ or ] (received "${data.item}")`);
    },
  ),
  InvalidNumberPathItem: ErreurType.defineWithTransform(
    'InvalidNumberPathItem',
    (item: number): IInvalidNumberPathItem => ({ item }),
    (err, provider, data) => {
      return err
        .with(provider)
        .withMessage(`Number Path item must be a positive (or 0) integer (received "${data.item}")`);
    },
  ),
};

export type TPathLike = TRawPath | Path;

export interface Path {
  readonly [IS_PATH]: true;
  readonly raw: TRawPath;
  readonly length: number;
  readonly head: TKey | null;
  readonly serialize: () => string;
  readonly toString: () => string;
  readonly append: (...raw: ReadonlyArray<TKey>) => Path;
  readonly prepend: (...raw: ReadonlyArray<TKey>) => Path;
  readonly shift: () => Path;
  readonly splitHead: () => [TKey | null, Path];
  readonly splitHeadOrThrow: () => [TKey, Path];
  [Symbol.iterator](): Iterator<TKey>;
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

  function create(...raw: ReadonlyArray<TKey>): Path {
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
      [Symbol.iterator](): Iterator<TKey> {
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

    function append(...raw: ReadonlyArray<TKey>): Path {
      return Path(...self.raw, ...raw);
    }

    function prepend(...raw: ReadonlyArray<TKey>): Path {
      return Path(...raw, ...self.raw);
    }

    function splitHead(): [TKey | null, Path] {
      if (raw.length === 0) {
        return [null, Path()];
      }
      const [head, ...tail] = raw;
      return [head, Path(...tail)];
    }

    function splitHeadOrThrow(): [TKey, Path] {
      const [head, tail] = splitHead();
      if (head === null) {
        throw PathErrors.CannotSplitEmpty.create();
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

  function validatePathItem<V extends TKey>(item: V): V {
    if (typeof item === 'number') {
      if (Number.isInteger(item) && item >= 0 && item < Number.MAX_SAFE_INTEGER) {
        return item;
      }
      throw PathErrors.InvalidNumberPathItem.create(item);
    }
    if (ALLOWED_CHARS.test(item)) {
      return item;
    }
    throw PathErrors.InvalidStringPathItem.create(item);
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

  function pathFrom(...items: Array<TKey>): Path;
  function pathFrom(path: TPathLike): Path;
  function pathFrom(...args: [TPathLike] | Array<TKey>): Path {
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
