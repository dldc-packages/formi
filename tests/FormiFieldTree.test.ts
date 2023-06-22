import { describe, expect, test, vi } from 'vitest';
import { Path, ZenFormField, ZenFormFieldTree } from '../src/mod';

test('Traverse', () => {
  const tree = {
    a: [ZenFormField.value(), ZenFormField.value()],
    b: ZenFormField.value(),
    c: ZenFormField.group(null),
  };

  const onTraverse = vi.fn();

  ZenFormFieldTree.traverse(tree, onTraverse);

  const expectedNextFn = expect.any(Function);

  expect(onTraverse).toHaveBeenCalledTimes(4);
  expect(onTraverse).toHaveBeenNthCalledWith(1, tree.a[0], expect.objectContaining({ raw: ['a', 0] }), expectedNextFn);
  expect(onTraverse).toHaveBeenNthCalledWith(2, tree.a[1], expect.objectContaining({ raw: ['a', 1] }), expectedNextFn);
  expect(onTraverse).toHaveBeenNthCalledWith(3, tree.b, expect.objectContaining({ raw: ['b'] }), expectedNextFn);
  expect(onTraverse).toHaveBeenNthCalledWith(4, tree.c, expect.objectContaining({ raw: ['c'] }), expectedNextFn);
});

test('Traverse nested fields', () => {
  const tree = {
    a1: [ZenFormField.value(), ZenFormField.value()],
    a2: ZenFormField.group({
      b1: ZenFormField.value(),
      b2: ZenFormField.group(null),
      b3: null,
      b4: null,
    }),
  };

  const onTraverse = vi.fn((_field, _path, next) => {
    next();
    return null;
  });

  ZenFormFieldTree.traverse(tree, onTraverse);

  expect(onTraverse).toHaveBeenCalledTimes(5);
  const fields = onTraverse.mock.calls.map((args) => args[0]);
  expect(fields).toEqual([tree.a1[0], tree.a1[1], tree.a2, tree.a2.children.b1, tree.a2.children.b2]);
});

test('Find path', () => {
  const tree = {
    a1: [ZenFormField.value(), ZenFormField.value()],
    a2: ZenFormField.group({
      b1: ZenFormField.value(),
      b2: ZenFormField.group(null),
      b3: null,
    }),
  };

  expect(ZenFormFieldTree.fieldPath(tree, tree.a1[0])?.raw).toEqual(['a1', 0]);
  expect(ZenFormFieldTree.fieldPath(tree, tree.a1[1])?.raw).toEqual(['a1', 1]);
  expect(ZenFormFieldTree.fieldPath(tree, tree.a2.children.b1)?.raw).toEqual(['a2', 'b1']);
  expect(ZenFormFieldTree.fieldPath(tree, tree.a2.children.b2)?.raw).toEqual(['a2', 'b2']);
});

describe('ZenFormFieldTree.restoreFromPaths', () => {
  test('Restore simple tree', () => {
    const tree: ZenFormFieldTree = {
      foo: ZenFormField.value(),
      bar: ZenFormField.value(),
    };

    const result = ZenFormFieldTree.restoreFromPaths(tree, []) as any;
    expect(result).toEqual({ foo: expect.anything(), bar: expect.anything() });
    expect(ZenFormField.utils.isZenFormField(result.foo)).toBe(true);
    expect(ZenFormField.utils.isZenFormField(result.bar)).toBe(true);
  });

  test('Restore repeat', () => {
    const tree: ZenFormFieldTree = {
      repeat: ZenFormField.repeat(ZenFormField.value()),
    };

    const result = ZenFormFieldTree.restoreFromPaths(tree, [
      Path.from(['repeat', 0]),
      Path.from(['repeat', 1]),
      Path.from(['repeat', 2]),
    ]) as any;
    expect(result.repeat.children).toHaveLength(3);
  });

  test('Restore repeat with object', () => {
    const tree: ZenFormFieldTree = {
      repeat: ZenFormField.repeat({
        foo: ZenFormField.value(),
      }),
    };

    const result = ZenFormFieldTree.restoreFromPaths(tree, [
      Path.from(['repeat', 0, 'foo']),
      Path.from(['repeat', 1, 'foo']),
      Path.from(['repeat', 2, 'foo']),
    ]) as any;
    expect(result.repeat.children).toHaveLength(3);
  });
});
