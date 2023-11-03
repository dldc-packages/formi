import type { TKey } from '@dldc/erreur';
import { Erreur, Key } from '@dldc/erreur';

export type TImmuWeakMapErreurData =
  | { kind: 'MissingKey'; key: any }
  | { kind: 'CannotUpdateUnregisteredKey'; key: any };

export const ImmuWeakMapErreurKey: TKey<TImmuWeakMapErreurData, false> =
  Key.create<TImmuWeakMapErreurData>('ImmuWeakMapErreur');

export const ImmuWeakMapErreur = {
  MissingKey: (key: any) => {
    return Erreur.create(new Error(`Unexpected missing key "${key}"`))
      .with(ImmuWeakMapErreurKey.Provider({ kind: 'MissingKey', key }))
      .withName('ImmuWeakMapErreur');
  },
  CannotUpdateUnregisteredKey: (key: any) => {
    return Erreur.create(new Error(`Cannot update unregistered key "${key}"`))
      .with(ImmuWeakMapErreurKey.Provider({ kind: 'CannotUpdateUnregisteredKey', key }))
      .withName('ImmuWeakMapErreur');
  },
};

const IS_IMMU_WEAK_MAP = Symbol('IS_IMMU_WEAK_MAP');

/**
 * An immutable WeakMap.
 */
export interface IImmuWeakMap<K extends object, V> {
  readonly [IS_IMMU_WEAK_MAP]: true;
  readonly get: (key: K) => V | undefined;
  readonly getOrThrow: (key: K) => V;
  readonly has: (key: K) => boolean;
  /**
   * Create a draft of the map (see ImmuWeakMapDraft).
   */
  readonly draft: () => IImmuWeakMapDraft<K, V>;
  readonly produce: (update: (draft: IImmuWeakMapDraft<K, V>) => IImmuWeakMap<K, V>) => IImmuWeakMap<K, V>;
}

export const ImmuWeakMap = (() => {
  return Object.assign(create, {
    empty,
    isImmuWeakMap,
  });

  function create<K extends object, V>(data: WeakMap<K, V>): IImmuWeakMap<K, V> {
    const self: IImmuWeakMap<K, V> = {
      [IS_IMMU_WEAK_MAP]: true,
      get,
      getOrThrow,
      has,
      draft,
      produce,
    };
    return self;

    function get(key: K): V | undefined {
      return data.get(key);
    }

    function getOrThrow(key: K): V {
      if (has(key) === false) {
        throw ImmuWeakMapErreur.MissingKey(key);
      }
      return get(key) as any;
    }

    function has(key: K): boolean {
      return data.has(key);
    }

    function draft(): IImmuWeakMapDraft<K, V> {
      return ImmuWeakMapDraft(data, self);
    }

    function produce(update: (draft: IImmuWeakMapDraft<K, V>) => IImmuWeakMap<K, V>): IImmuWeakMap<K, V> {
      return update(draft());
    }
  }

  function isImmuWeakMap(val: any): val is IImmuWeakMap<any, any> {
    return Boolean(val && val[IS_IMMU_WEAK_MAP] === true);
  }

  function empty<K extends object, V>(): IImmuWeakMap<K, V> {
    return create<K, V>(new WeakMap());
  }
})();

const IS_IMMU_WEAK_MAP_DRAFT = Symbol('IS_IMMU_WEAK_MAP_DRAFT');

/**
 * This object let you update an ImmuWeakMap as if it was a mutable one.
 * Once you are done, you can commit the changes to get a new ImmuWeakMap.
 * When you commit, you must provide all the keys that you want to keep.
 */
export interface IImmuWeakMapDraft<K extends object, V> {
  readonly [IS_IMMU_WEAK_MAP_DRAFT]: true;
  readonly get: (key: K) => V | undefined;
  readonly getOrThrow: (key: K) => V;
  readonly has: (key: K) => boolean;
  readonly set: (key: K, val: V) => void;
  readonly update: (key: K, updater: (prev: V | undefined) => V) => void;
  readonly updateOrThrow: (key: K, updater: (prev: V) => V) => void;
  readonly delete: (key: K) => void;
  readonly commit: (allKeys: Iterable<K>) => IImmuWeakMap<K, V>;
}

export const ImmuWeakMapDraft = (() => {
  return create;

  function create<K extends object, V>(prev: WeakMap<K, V>, prevParent: IImmuWeakMap<K, V>): IImmuWeakMapDraft<K, V> {
    const deleted = new WeakSet<K>();
    const next = new WeakMap<K, V>();

    let changed = false;

    const self: IImmuWeakMapDraft<K, V> = {
      [IS_IMMU_WEAK_MAP_DRAFT]: true,
      get,
      getOrThrow,
      has,
      set,
      commit,
      delete: doDelete,
      update,
      updateOrThrow,
    };
    return self;

    function update(key: K, updater: (prev: V | undefined) => V): void {
      const prevVal = get(key);
      const nextVal = updater(prevVal);
      set(key, nextVal);
    }

    function updateOrThrow(key: K, updater: (prev: V) => V): void {
      const prevVal = get(key);
      if (prevVal === undefined) {
        throw ImmuWeakMapErreur.CannotUpdateUnregisteredKey(key);
      }
      const nextVal = updater(prevVal);
      set(key, nextVal);
    }

    function get(key: K): V | undefined {
      if (!has(key)) {
        return undefined;
      }
      if (next.has(key)) {
        return next.get(key);
      }
      return prev.get(key);
    }

    function getOrThrow(key: K): V {
      if (has(key) === false) {
        throw ImmuWeakMapErreur.MissingKey(key);
      }
      return get(key) as any;
    }

    function has(key: K): boolean {
      if (deleted.has(key)) {
        return false;
      }
      if (next.has(key)) {
        return true;
      }
      return prev.has(key);
    }

    function set(key: K, val: V): void {
      if (deleted.has(key)) {
        deleted.delete(key);
      }
      const prevVal = get(key);
      if (prevVal !== val) {
        changed = true;
        next.set(key, val);
      }
    }

    function doDelete(key: K): void {
      if (prev.has(key)) {
        deleted.add(key);
        changed = true;
      }
      if (next.has(key)) {
        next.delete(key);
      }
    }

    function commit(allKeys: Iterable<K>): IImmuWeakMap<K, V> {
      if (!changed) {
        return prevParent;
      }
      for (const key of allKeys) {
        if (deleted.has(key)) {
          continue;
        }
        if (next.has(key) === false) {
          if (prev.has(key)) {
            next.set(key, prev.get(key)!);
            continue;
          }
        }
      }
      return ImmuWeakMap(next);
    }
  }
})();
