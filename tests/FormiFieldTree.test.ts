import { expect, fn } from "@std/expect";
import {
  FormiField,
  getFormiFieldTreeFieldPath,
  pathFrom,
  restoreFormiFieldTreeFromPaths,
  type TFormiFieldAny,
  type TFormiFieldTree,
  type TPath,
  traverseFormiFieldTree,
} from "../mod.ts";

Deno.test("Test", () => {
  expect(true).toBe(true);
});

Deno.test("Traverse", () => {
  const tree = {
    a: [FormiField.value(), FormiField.value()],
    b: FormiField.value(),
    c: FormiField.group(null),
  };

  const onTraverse = fn() as (() => void);

  traverseFormiFieldTree(tree, onTraverse);

  const expectedNextFn = expect.any(Function);

  expect(onTraverse).toHaveBeenCalledTimes(4);
  expect(onTraverse).toHaveBeenNthCalledWith(
    1,
    tree.a[0],
    // expect.objectContaining({ raw: ["a", 0] }),
    expect.anything(),
    expectedNextFn,
  );
  expect(onTraverse).toHaveBeenNthCalledWith(
    2,
    tree.a[1],
    // expect.objectContaining({ raw: ["a", 1] }),
    expect.anything(),
    expectedNextFn,
  );
  expect(onTraverse).toHaveBeenNthCalledWith(
    3,
    tree.b,
    // expect.objectContaining({ raw: ["b"] }),
    expect.anything(),
    expectedNextFn,
  );
  expect(onTraverse).toHaveBeenNthCalledWith(
    4,
    tree.c,
    // expect.objectContaining({ raw: ["c"] }),
    expect.anything(),
    expectedNextFn,
  );
});

Deno.test("Traverse nested fields", () => {
  const tree = {
    a1: [FormiField.value(), FormiField.value()],
    a2: FormiField.group({
      b1: FormiField.value(),
      b2: FormiField.group(null),
      b3: null,
      b4: null,
    }),
  };

  const visitedFields: Array<TFormiFieldAny> = [];

  const traverseMock = (
    field: TFormiFieldAny,
    _path: TPath,
    next: () => Array<any>,
  ) => {
    visitedFields.push(field);
    next();
    return null;
  };

  const onTraverse = fn(traverseMock) as typeof traverseMock;

  traverseFormiFieldTree(tree, onTraverse);

  expect(onTraverse).toHaveBeenCalledTimes(5);
  expect(visitedFields).toEqual([
    tree.a1[0],
    tree.a1[1],
    tree.a2,
    tree.a2.children.b1,
    tree.a2.children.b2,
  ]);
});

Deno.test("Find path", () => {
  const tree = {
    a1: [FormiField.value(), FormiField.value()],
    a2: FormiField.group({
      b1: FormiField.value(),
      b2: FormiField.group(null),
      b3: null,
    }),
  };

  expect(getFormiFieldTreeFieldPath(tree, tree.a1[0])?.raw).toEqual(["a1", 0]);
  expect(getFormiFieldTreeFieldPath(tree, tree.a1[1])?.raw).toEqual(["a1", 1]);
  expect(getFormiFieldTreeFieldPath(tree, tree.a2.children.b1)?.raw).toEqual([
    "a2",
    "b1",
  ]);
  expect(getFormiFieldTreeFieldPath(tree, tree.a2.children.b2)?.raw).toEqual([
    "a2",
    "b2",
  ]);
});

Deno.test("FormiFieldTree.restoreFromPaths -> Restore simple tree", () => {
  const tree: TFormiFieldTree = {
    foo: FormiField.value(),
    bar: FormiField.value(),
  };

  const result = restoreFormiFieldTreeFromPaths(tree, []) as any;
  expect(result).toEqual({ foo: expect.anything(), bar: expect.anything() });
  expect(FormiField.utils.isFormiField(result.foo)).toBe(true);
  expect(FormiField.utils.isFormiField(result.bar)).toBe(true);
});

Deno.test("FormiFieldTree.restoreFromPaths -> Restore repeat", () => {
  const tree: TFormiFieldTree = {
    repeat: FormiField.repeat(FormiField.value()),
  };

  const result = restoreFormiFieldTreeFromPaths(tree, [
    pathFrom(["repeat", 0]),
    pathFrom(["repeat", 1]),
    pathFrom(["repeat", 2]),
  ]) as any;
  expect(result.repeat.children).toHaveLength(3);
});

Deno.test("FormiFieldTree.restoreFromPaths -> Restore repeat with object", () => {
  const tree: TFormiFieldTree = {
    repeat: FormiField.repeat({
      foo: FormiField.value(),
    }),
  };

  const result = restoreFormiFieldTreeFromPaths(tree, [
    pathFrom(["repeat", 0, "foo"]),
    pathFrom(["repeat", 1, "foo"]),
    pathFrom(["repeat", 2, "foo"]),
  ]) as any;
  expect(result.repeat.children).toHaveLength(3);
});
