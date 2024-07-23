import {
  FIELD_RESTORE_FROM_PATHS,
  FIELD_TYPES,
  FIELD_VALIDATE_FN,
} from "./FormiField.contants.ts";
import type {
  ICreateFieldOptions,
  TChildrenUpdateFn,
  TFormiField,
  TInputBase,
  TValidateFn,
} from "./FormiField.types.ts";
import * as utils from "./FormiField.utils.ts";
import {
  cloneFormiFieldTree,
  restoreFormiFieldTreeFromPaths,
  type TFormiFieldTree,
  type TFormiFieldTreeValue,
} from "./FormiFieldTree.ts";
import type {
  TFormiIssueBase,
  TFormiIssueNonEmptyFile,
  TFormiIssueNotFile,
  TFormiIssueNotString,
  TFormiIssueNumber,
  TFormiIssueSingle,
} from "./FormiIssue.ts";
import { createFormiKey } from "./FormiKey.ts";
import type { TPath } from "./tools/Path.ts";

export { utils };

export const FormiField = {
  create,
  value,
  values,
  string,
  optionalString,
  number,
  optionalNumber,
  checkbox,
  file,
  nonEmptyfile,

  group,
  repeat,
} as const;

export function create<Value, Issue, Children extends TFormiFieldTree>({
  key,
  children,
  validateFn,
  restoreFromPaths = null,
}: ICreateFieldOptions<Value, Issue, Children>): TFormiField<
  Value,
  Issue,
  Children
> {
  const currentValidateFn = validateFn;

  const self: TFormiField<Value, Issue, Children> = {
    [FIELD_RESTORE_FROM_PATHS]: restoreFromPaths,
    [FIELD_VALIDATE_FN]: currentValidateFn,
    [FIELD_TYPES]: { __value: {} as Value, __issue: {} as Issue },
    key: key,
    children,
    clone,
    validate,
    withIssue,
    withChildren,
  };
  return self;

  function clone() {
    return create({
      key: createFormiKey(),
      children: cloneFormiFieldTree(children),
      validateFn: currentValidateFn,
      restoreFromPaths,
    });
  }

  function withIssue<NextIssue>(): TFormiField<
    Value,
    Issue | NextIssue,
    Children
  > {
    return self;
  }

  function validate<NextValue = Value, NextIssue = never>(
    validateFn: TValidateFn<Value, NextValue, Issue | NextIssue>,
  ): TFormiField<NextValue, Issue | NextIssue, Children> {
    const nextValidate = (input: any) => {
      const prev = currentValidateFn(input);
      if (!prev.success) {
        return prev;
      }
      return validateFn(prev.value);
    };
    return create({
      key: createFormiKey(),
      children,
      validateFn: nextValidate,
      restoreFromPaths,
    });
  }

  function withChildren(
    update: Children | TChildrenUpdateFn<Children>,
  ): TFormiField<Value, Issue, Children> {
    const nextChildren = typeof update === "function"
      ? update(children)
      : update;
    return create({
      key: self.key,
      children: nextChildren,
      validateFn: currentValidateFn,
      restoreFromPaths,
    });
  }
}

// fields

export function base(): TFormiField<TInputBase<null>, TFormiIssueBase, null> {
  return create<TInputBase<null>, TFormiIssueBase, null>({
    key: createFormiKey(),
    children: null,
    validateFn: (input) => utils.success(input),
    restoreFromPaths: null,
  });
}

export type TValueIssues = TFormiIssueBase | TFormiIssueSingle;
export function value(): TFormiField<
  FormDataEntryValue | null,
  TValueIssues,
  null
> {
  return base().validate(utils.isSingleValue);
}

export type TValuesIssues = TFormiIssueBase;
export function values(): TFormiField<
  FormDataEntryValue[],
  TFormiIssueBase,
  null
> {
  return base().validate((input) => utils.success(input.values));
}

export type TOptionalStringIssues = TValueIssues | TFormiIssueNotFile;
export function optionalString(): TFormiField<
  string | null,
  TOptionalStringIssues,
  null
> {
  return value().validate(utils.isNotFile);
}

export type TStringIssues = TOptionalStringIssues;
export function string(): TFormiField<string, TStringIssues, null> {
  return optionalString().validate(utils.isNotNull);
}

export type TOptionalNumberIssues = TStringIssues | TFormiIssueNumber;
export function optionalNumber(): TFormiField<
  number | null,
  TOptionalNumberIssues,
  null
> {
  return optionalString().validate(utils.isNumber);
}

export type TNumberIssues = TOptionalNumberIssues;
export function number(): TFormiField<number, TNumberIssues, null> {
  return optionalNumber().validate(utils.isNotNull);
}

export type TCheckboxIssues = TOptionalStringIssues;
export function checkbox(): TFormiField<boolean, TCheckboxIssues, null> {
  return optionalString().validate(utils.isDefined);
}

export type TFileIssues = TValueIssues | TFormiIssueNotString;
export function file(): TFormiField<File, TFileIssues, null> {
  return value().validate(utils.isFile);
}

export type TNonEmptyFileIssues = TFileIssues | TFormiIssueNonEmptyFile;
export function nonEmptyfile(): TFormiField<File, TNonEmptyFileIssues, null> {
  return file().validate(utils.isNonEmptyFile);
}

export function group<Children extends TFormiFieldTree>(
  children: Children,
): TFormiField<TFormiFieldTreeValue<Children>, TFormiIssueBase, Children> {
  return create<TFormiFieldTreeValue<Children>, TFormiIssueBase, Children>({
    key: createFormiKey(),
    children,
    validateFn: (input) => utils.success(input.children),
    restoreFromPaths: null,
  });
}

export function repeat<Child extends TFormiFieldTree>(
  child: Child,
  initialCount: number = 1,
): TFormiField<
  Array<TFormiFieldTreeValue<Child>>,
  TFormiIssueBase,
  Array<Child>
> {
  const initialChildren = Array.from(
    { length: initialCount },
    () => cloneFormiFieldTree(child),
  );
  return create<
    Array<TFormiFieldTreeValue<Child>>,
    TFormiIssueBase,
    Array<Child>
  >({
    key: createFormiKey(),
    children: initialChildren,
    validateFn: (input) => utils.success(input.children) as any,
    restoreFromPaths: (paths) => restoreRepeat(child, paths),
  });
}

function restoreRepeat<Child extends TFormiFieldTree>(
  child: Child,
  paths: ReadonlyArray<TPath>,
): Array<Child> {
  let size = 0;
  const pathsByIndex = new Map<number, Array<TPath>>();
  for (const path of paths) {
    const [head, rest] = path.splitHead();
    if (head === null || typeof head !== "number") {
      continue; // not an index
    }
    let list = pathsByIndex.get(head);
    if (!list) {
      list = [];
      pathsByIndex.set(head, list);
    }
    list.push(rest);
    size = Math.max(size, head + 1);
  }

  return Array.from({ length: size }, () => cloneFormiFieldTree(child)).map(
    (child, index) => {
      const paths = pathsByIndex.get(index) ?? [];
      return restoreFormiFieldTreeFromPaths(child, paths);
    },
  );
}
