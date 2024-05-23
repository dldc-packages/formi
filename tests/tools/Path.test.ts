import { expect } from "@std/expect";
import {
  createPath,
  parsePath,
  pathEqual,
  serializePath,
  type TRawPath,
} from "../../src/tools/Path.ts";

const testCases: Array<[TRawPath, string]> = [
  [[], ""],
  [["foo"], "foo"],
  [["a", 42, "b"], "a[42].b"],
  [["a", "b", "c"], "a.b.c"],
  [["a", "b", "c", "d"], "a.b.c.d"],
  [["a", 1, "c", "d"], "a[1].c.d"],
  [[1, "c", "d"], "[1].c.d"],
  [["a", "b", "c", 9], "a.b.c[9]"],
  [[0, 1, 2], "[0][1][2]"],
  [["____"], "____"],
  [["a", "b", "c", "d", "e", "f", "g", "h", "i"], "a.b.c.d.e.f.g.h.i"],
  [["$$", 0, "---"], "$$[0].---"],
];

testCases.forEach(([path, str]) => {
  Deno.test(`Path ${path} serialize to ${str}`, () => {
    expect(serializePath(path)).toBe(str);
  });

  Deno.test(`Parse ${str} into ${path}`, () => {
    expect(parsePath(str).raw).toEqual(path);
  });
});

Deno.test("Path is iterable", () => {
  const path = createPath("a", 42, "b");
  expect([...path]).toEqual(["a", 42, "b"]);
});

Deno.test("Serialize twice", () => {
  const path = createPath("a", 42, "b");
  expect(path.serialize()).toBe("a[42].b");
  expect(path.serialize()).toBe("a[42].b");
});

Deno.test("Path is immutable", () => {
  const path = createPath("a", 42, "b");
  expect(path.serialize()).toBe("a[42].b");
  const newPath = path.append("c");
  expect(path.serialize()).toBe("a[42].b");
  expect(newPath.serialize()).toBe("a[42].b.c");
});

Deno.test("Path shift", () => {
  const path = createPath("a", 42, "b");
  expect(path.serialize()).toBe("a[42].b");
  const newPath = path.shift();
  expect(path.serialize()).toBe("a[42].b");
  expect(newPath.serialize()).toBe("[42].b");
});

Deno.test("Path splitHead", () => {
  const path = createPath("a", 42, "b");
  expect(path.serialize()).toBe("a[42].b");
  const [head, tail] = path.splitHead();
  expect(head).toBe("a");
  expect(tail.serialize()).toBe("[42].b");
});

Deno.test("Path splitHead with empty", () => {
  const path = createPath();
  expect(path.serialize()).toBe("");
  const [head, tail] = path.splitHead();
  expect(head).toBeNull();
  expect(tail.serialize()).toBe("");
});

Deno.test("Path splitHeadOrThrow", () => {
  const path = createPath("a", 42, "b");
  expect(path.serialize()).toBe("a[42].b");
  const [head, tail] = path.splitHeadOrThrow();
  expect(head).toBe("a");
  expect(tail.serialize()).toBe("[42].b");

  const empty = createPath();
  expect(() => empty.splitHeadOrThrow()).toThrow(
    "Cannot split head of empty path",
  );
});

Deno.test("pathEqual", () => {
  const path = createPath("a", 42, "b");
  expect(pathEqual(path, path)).toBe(true);
  const path2 = createPath("a", 42, "b");
  expect(pathEqual(path, path2)).toBe(true);
  const path3 = createPath("a", 42, "c");
  expect(pathEqual(path, path3)).toBe(false);
});

Deno.test("pathEqual wit array", () => {
  const path = createPath("a", 42, "b");
  expect(pathEqual(path, ["a", 42, "b"])).toBe(true);
  const path2 = createPath("a", 42, "b");
  expect(pathEqual(path, path2.raw)).toBe(true);
  const path3 = createPath("a", 42, "c");
  expect(pathEqual(path, path3.raw)).toBe(false);
});
