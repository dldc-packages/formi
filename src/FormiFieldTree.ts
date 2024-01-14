import { FormiErreur } from './FormiError';
import { FormiField } from './FormiField';
import type { IFormiField, TFormiFieldAny } from './FormiField.types';
import { Path } from './tools/Path';

export type TFormiFieldTree = null | TFormiFieldAny | TFormiFieldTree[] | { [key: string]: TFormiFieldTree };

export type TFormiFieldTreeValue<Tree extends TFormiFieldTree> =
  Tree extends IFormiField<infer V, any, any>
    ? V
    : Tree extends Array<infer Inner extends TFormiFieldTree>
      ? ReadonlyArray<TFormiFieldTreeValue<Inner>>
      : Tree extends { [key: string]: TFormiFieldAny }
        ? { readonly [K in keyof Tree]: TFormiFieldTreeValue<Tree[K]> }
        : null;

export const FormiFieldTree = (() => {
  return {
    traverse,
    findByPath,
    fieldPath,
    wrap,
    unwrap,
    getChildren,
    clone,
    restoreFromPaths,
  };

  /**
   * Wrap fields in a group if they are not already a group or a single fields.
   */
  function wrap(fields: TFormiFieldTree): TFormiFieldAny {
    if (FormiField.utils.isFormiField(fields)) {
      return fields;
    }
    return FormiField.group(fields);
  }

  function unwrap(fields: TFormiFieldAny, wrapped: boolean): TFormiFieldTree {
    if (wrapped) {
      return fields.children;
    }
    return fields;
  }

  function traverse<T>(
    tree: TFormiFieldTree,
    visitor: (field: TFormiFieldAny, path: Path, next: () => Array<T>) => T,
  ): Array<T> {
    function next(current: TFormiFieldTree, base: Path): Array<T> {
      return getChildren(current, base).map(({ item, path }) => {
        return visitor(item, path, () => next(item.children, path));
      });
    }
    return next(tree, Path());
  }

  function getChildren(tree: TFormiFieldTree, base: Path): Array<{ path: Path; item: TFormiFieldAny }> {
    if (tree === null) {
      return [];
    }
    if (FormiField.utils.isFormiField(tree)) {
      return [{ path: base, item: tree }];
    }
    if (Array.isArray(tree)) {
      return tree.flatMap((item, index) => getChildren(item, base.append(index)));
    }
    return Object.entries(tree).flatMap(([key, item]) => getChildren(item, base.append(key)));
  }

  function fieldPath(tree: TFormiFieldTree, field: TFormiFieldAny): Path | null {
    const found: Array<Path> = [];
    traverse(tree, (item, path, next) => {
      if (item === field) {
        found.push(path);
      }
      next();
    });
    if (found.length === 0) {
      return null;
    }
    if (found.length > 1) {
      throw FormiErreur.ReusedField(tree, field, found);
    }
    return found[0];
  }

  function getChildrenByKey(tree: TFormiFieldTree, key: string | number): TFormiFieldTree | null {
    if (tree === null) {
      return null;
    }
    if (FormiField.utils.isFormiField(tree)) {
      return getChildrenByKey(tree.children, key);
    }
    if (Array.isArray(tree)) {
      if (typeof key !== 'number') {
        return null;
      }
      return tree[key] ?? null;
    }
    if (typeof key === 'number') {
      return null;
    }
    return tree[key] ?? null;
  }

  function findByPath(tree: TFormiFieldTree, path: Path): TFormiFieldAny | null {
    const pathResolved = Path.from(path);
    let current = tree;
    for (const pathItem of pathResolved) {
      const next = getChildrenByKey(current, pathItem);
      if (!next) {
        return null;
      }
      current = next;
    }
    if (FormiField.utils.isFormiField(current)) {
      return current;
    }
    return null;
  }

  function clone<Tree extends TFormiFieldTree>(tree: Tree): Tree {
    if (tree === null) {
      return tree;
    }
    if (FormiField.utils.isFormiField(tree)) {
      return tree.clone() as Tree;
    }
    if (Array.isArray(tree)) {
      return tree.map(clone) as Tree;
    }
    return Object.fromEntries(Object.entries(tree).map(([key, value]) => [key, clone(value)])) as Tree;
  }

  /**
   * Given the initial tree and a list of paths, restore the tree
   * (mainly array items to restore the correct number of items)
   */
  function restoreFromPaths<Tree extends TFormiFieldTree>(tree: Tree, paths: ReadonlyArray<Path>): Tree {
    if (paths.length === 0) {
      return tree;
    }
    if (tree === null) {
      return tree;
    }
    if (FormiField.utils.isFormiField(tree)) {
      const restore = FormiField.utils.getRestoreFromPaths(tree);
      return tree.withChildren((prev: TFormiFieldTree) => {
        if (!restore) {
          return restoreFromPaths(prev, paths);
        }
        return restore(paths);
      }) as Tree;
    }
    if (Array.isArray(tree)) {
      const pathsByIndex = new Map<number, Path[]>();
      for (const path of paths) {
        const [index, rest] = path.splitHead();
        if (index === null || typeof index !== 'number') {
          continue;
        }
        let list = pathsByIndex.get(index);
        if (!list) {
          list = [];
          pathsByIndex.set(index, list);
        }
        list.push(rest);
      }
      return tree.map((item, index): TFormiFieldTree => {
        const paths = pathsByIndex.get(index) ?? [];
        return restoreFromPaths(item, paths);
      }) as Tree;
    }
    // Object
    const pathsByKey = new Map<string, Path[]>();
    for (const path of paths) {
      const [key, rest] = path.splitHead();
      if (key === null || typeof key !== 'string') {
        continue;
      }
      let list = pathsByKey.get(key);
      if (!list) {
        list = [];
        pathsByKey.set(key, list);
      }
      list.push(rest);
    }
    return Object.fromEntries(
      Object.entries(tree).map(([key, value]): [string, TFormiFieldTree] => {
        const paths = pathsByKey.get(key) ?? [];
        return [key, restoreFromPaths(value, paths)];
      }),
    ) as Tree;
  }
})();
