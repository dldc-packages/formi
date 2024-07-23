import { createReusedField } from "./FormiErreur.ts";
import * as FormiField from "./FormiField.ts";
import type { TFormiField, TFormiFieldAny } from "./FormiField.types.ts";
import { createPath, pathFrom, type TPath } from "./tools/Path.ts";

export type TFormiFieldTree = null | TFormiFieldAny | TFormiFieldTree[] | {
  [key: string]: TFormiFieldTree;
};

export type TFormiFieldTreeValue<Tree extends TFormiFieldTree> = Tree extends
  TFormiField<infer V, any, any> ? V
  : Tree extends Array<infer Inner extends TFormiFieldTree>
    ? ReadonlyArray<TFormiFieldTreeValue<Inner>>
  : Tree extends { [key: string]: TFormiFieldAny }
    ? { readonly [K in keyof Tree]: TFormiFieldTreeValue<Tree[K]> }
  : null;

/**
 * Wrap fields in a group if they are not already a group or a single fields.
 */
export function wrapFormiFieldTree(fields: TFormiFieldTree): TFormiFieldAny {
  if (FormiField.utils.isFormiField(fields)) {
    return fields;
  }
  return FormiField.group(fields);
}

export function unwrapFormiFieldTree(
  fields: TFormiFieldAny,
  wrapped: boolean,
): TFormiFieldTree {
  if (wrapped) {
    return fields.children;
  }
  return fields;
}

export function traverseFormiFieldTree<T>(
  tree: TFormiFieldTree,
  visitor: (field: TFormiFieldAny, path: TPath, next: () => Array<T>) => T,
): Array<T> {
  function next(current: TFormiFieldTree, base: TPath): Array<T> {
    return getFormiFieldTreeChildren(current, base).map(({ item, path }) => {
      return visitor(item, path, () => next(item.children, path));
    });
  }
  return next(tree, createPath());
}

export function getFormiFieldTreeChildren(
  tree: TFormiFieldTree,
  base: TPath,
): Array<{ path: TPath; item: TFormiFieldAny }> {
  if (tree === null) {
    return [];
  }
  if (FormiField.utils.isFormiField(tree)) {
    return [{ path: base, item: tree }];
  }
  if (Array.isArray(tree)) {
    return tree.flatMap((item, index) =>
      getFormiFieldTreeChildren(item, base.append(index))
    );
  }
  return Object.entries(tree).flatMap(([key, item]) =>
    getFormiFieldTreeChildren(item, base.append(key))
  );
}

export function getFormiFieldTreeFieldPath(
  tree: TFormiFieldTree,
  field: TFormiFieldAny,
): TPath | null {
  const found: Array<TPath> = [];
  traverseFormiFieldTree(tree, (item, path, next) => {
    if (item === field) {
      found.push(path);
    }
    next();
  });
  if (found.length === 0) {
    return null;
  }
  if (found.length > 1) {
    throw createReusedField(tree, field, found);
  }
  return found[0];
}

function getFormiFieldTreeChildrenByKey(
  tree: TFormiFieldTree,
  key: string | number,
): TFormiFieldTree | null {
  if (tree === null) {
    return null;
  }
  if (FormiField.utils.isFormiField(tree)) {
    return getFormiFieldTreeChildrenByKey(tree.children, key);
  }
  if (Array.isArray(tree)) {
    if (typeof key !== "number") {
      return null;
    }
    return tree[key] ?? null;
  }
  if (typeof key === "number") {
    return null;
  }
  return tree[key] ?? null;
}

export function findInFormiFieldTreeByPath(
  tree: TFormiFieldTree,
  path: TPath,
): TFormiFieldAny | null {
  const pathResolved = pathFrom(path);
  let current = tree;
  for (const pathItem of pathResolved) {
    const next = getFormiFieldTreeChildrenByKey(current, pathItem);
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

export function cloneFormiFieldTree<Tree extends TFormiFieldTree>(
  tree: Tree,
): Tree {
  if (tree === null) {
    return tree;
  }
  if (FormiField.utils.isFormiField(tree)) {
    return tree.clone() as Tree;
  }
  if (Array.isArray(tree)) {
    return tree.map(cloneFormiFieldTree) as Tree;
  }
  return Object.fromEntries(
    Object.entries(tree).map((
      [key, value],
    ) => [key, cloneFormiFieldTree(value)]),
  ) as Tree;
}

/**
 * Given the initial tree and a list of paths, restore the tree
 * (mainly array items to restore the correct number of items)
 */
export function restoreFormiFieldTreeFromPaths<Tree extends TFormiFieldTree>(
  tree: Tree,
  paths: ReadonlyArray<TPath>,
): Tree {
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
        return restoreFormiFieldTreeFromPaths(prev, paths);
      }
      return restore(paths);
    }) as Tree;
  }
  if (Array.isArray(tree)) {
    const pathsByIndex = new Map<number, TPath[]>();
    for (const path of paths) {
      const [index, rest] = path.splitHead();
      if (index === null || typeof index !== "number") {
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
      return restoreFormiFieldTreeFromPaths(item, paths);
    }) as Tree;
  }
  // Object
  const pathsByKey = new Map<string, TPath[]>();
  for (const path of paths) {
    const [key, rest] = path.splitHead();
    if (key === null || typeof key !== "string") {
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
      return [key, restoreFormiFieldTreeFromPaths(value, paths)];
    }),
  ) as Tree;
}
