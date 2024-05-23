import { expect } from "@std/expect";
import {
  createFormiController,
  FormiField,
  restoreFormiFieldTreeFromPaths,
  type TFormiFieldTree,
  validateForm,
} from "../mod.ts";

Deno.test("initialize controller", () => {
  const controller = createFormiController({
    formName: "test",
    initialFields: null,
  });
  expect(controller).toBeDefined();
});

Deno.test("validateForm", () => {
  const data = new FormData();
  data.append("test", "test");
  const validated = validateForm({
    formName: "test",
    initialFields: FormiField.string(),
  }, data);
  expect(validated).toMatchObject({
    success: true,
    value: "test",
  });
});

Deno.test("validateForm object", () => {
  const data = new FormData();
  data.append("test.str", "demo");
  data.append("test.num", "42");

  const fields = FormiField.group({
    str: FormiField.string(),
    num: FormiField.number(),
  });

  const validated = validateForm({
    formName: "test",
    initialFields: fields,
  }, data);
  expect(validated).toMatchObject({
    success: true,
    value: { str: "demo", num: 42 },
  });
});

Deno.test("Custom issues", () => {
  const fields = FormiField.group({
    str: FormiField.string(),
    num: FormiField.number(),
  });
  const data = new FormData();
  data.append("test.str", "demo");
  data.append("test.num", "42");

  const validated = validateForm({
    formName: "test",
    initialFields: fields,
  }, data);
  if (!validated.success) {
    throw new Error("Validation failed");
  }
  validated.customIssues.add(validated.fields.children.num, {
    kind: "InvalidNumber",
    value: "Ooops",
  });
  expect(validated.customIssues.getIssues()).toEqual([
    {
      issues: [{ kind: "InvalidNumber", value: "Ooops" }],
      path: ["num"],
    },
  ]);
});

Deno.test("validate should skip fields from another form", () => {
  const data = new FormData();
  data.append("test.str", "demo");
  data.append("test.num", "42");
  data.append("test2.str", "demo");

  const fields = FormiField.group({
    str: FormiField.string(),
    num: FormiField.number(),
  });

  const validated = validateForm({
    formName: "test",
    initialFields: fields,
  }, data);
  expect(validated).toMatchObject({
    success: true,
    value: { str: "demo", num: 42 },
  });
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
