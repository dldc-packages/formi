import type {
  ICreateFieldOptions,
  TChildrenUpdateFn,
  TFormiField,
  TFormiFieldAny,
  TInputBase,
  TRestoreFromPaths,
  TValidateFailure,
  TValidateFn,
  TValidateResult,
  TValidateSuccess,
} from "./FormiField.types.ts";
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
import { FileOrBlob } from "./utils.ts";

export const FIELD_TYPES = Symbol("FIELD_TYPES");
export const FIELD_VALIDATE_FN = Symbol("FIELD_VALIDATE_FN");
export const FIELD_RESTORE_FROM_PATHS = Symbol("FIELD_RESTORE_FROM_PATHS");

export const FormiField = {
  utils: {
    isFormiField,
    getValidateFn,
    getRestoreFromPaths,
    isNotNull,
    isNotFile,
    isNumber,
    isDefined,
    isFile,
    isNonEmptyFile,
  },
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

function create<Value, Issue, Children extends TFormiFieldTree>({
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
    validateFn: TValidateFn<Value, NextValue, Issue | NextIssue>
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
    update: Children | TChildrenUpdateFn<Children>
  ): TFormiField<Value, Issue, Children> {
    const nextChildren =
      typeof update === "function" ? update(children) : update;
    return create({
      key: self.key,
      children: nextChildren,
      validateFn: currentValidateFn,
      restoreFromPaths,
    });
  }
}

// fields

function base() {
  return create<TInputBase<null>, TFormiIssueBase, null>({
    key: createFormiKey(),
    children: null,
    validateFn: (input) => success(input),
    restoreFromPaths: null,
  });
}
export type TValueIssues = TFormiIssueBase | TFormiIssueSingle;
function value(): TFormiField<FormDataEntryValue | null, TValueIssues, null> {
  return base().validate(isSingleValue);
}

export type TValuesIssues = TFormiIssueBase;
function values(): TFormiField<FormDataEntryValue[], TFormiIssueBase, null> {
  return base().validate((input) => success(input.values));
}

export type TOptionalStringIssues = TValueIssues | TFormiIssueNotFile;
function optionalString(): TFormiField<
  string | null,
  TOptionalStringIssues,
  null
> {
  return value().validate(isNotFile);
}

export type TStringIssues = TOptionalStringIssues;
function string(): TFormiField<string, TStringIssues, null> {
  return optionalString().validate(isNotNull);
}

export type TOptionalNumberIssues = TStringIssues | TFormiIssueNumber;
function optionalNumber(): TFormiField<
  number | null,
  TOptionalNumberIssues,
  null
> {
  return optionalString().validate(isNumber);
}

export type TNumberIssues = TOptionalNumberIssues;
function number(): TFormiField<number, TNumberIssues, null> {
  return optionalNumber().validate(isNotNull);
}

export type TCheckboxIssues = TOptionalStringIssues;
function checkbox(): TFormiField<boolean, TCheckboxIssues, null> {
  return optionalString().validate(isDefined);
}

export type TFileIssues = TValueIssues | TFormiIssueNotString;
function file(): TFormiField<File, TFileIssues, null> {
  return value().validate(isFile);
}

export type TNonEmptyFileIssues = TFileIssues | TFormiIssueNonEmptyFile;
function nonEmptyfile(): TFormiField<File, TNonEmptyFileIssues, null> {
  return file().validate(isNonEmptyFile);
}

function group<Children extends TFormiFieldTree>(
  children: Children
): TFormiField<TFormiFieldTreeValue<Children>, TFormiIssueBase, Children> {
  return create<TFormiFieldTreeValue<Children>, TFormiIssueBase, Children>({
    key: createFormiKey(),
    children,
    validateFn: (input) => success(input.children),
    restoreFromPaths: null,
  });
}

function repeat<Child extends TFormiFieldTree>(
  child: Child,
  initialCount: number = 1
): TFormiField<
  Array<TFormiFieldTreeValue<Child>>,
  TFormiIssueBase,
  Array<Child>
> {
  const initialChildren = Array.from({ length: initialCount }, () =>
    cloneFormiFieldTree(child)
  );
  return create<
    Array<TFormiFieldTreeValue<Child>>,
    TFormiIssueBase,
    Array<Child>
  >({
    key: createFormiKey(),
    children: initialChildren,
    validateFn: (input) => success(input.children) as any,
    restoreFromPaths: (paths) => restoreRepeat(child, paths),
  });
}

// utils

function restoreRepeat<Child extends TFormiFieldTree>(
  child: Child,
  paths: ReadonlyArray<TPath>
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
    }
  );
}

function isFormiField(field: any): field is TFormiField<any, any, any> {
  return Boolean(field && field[FIELD_TYPES]);
}

function getValidateFn(field: TFormiFieldAny): TValidateFn<any, any, any> {
  return field[FIELD_VALIDATE_FN];
}

function getRestoreFromPaths(
  field: TFormiFieldAny
): TRestoreFromPaths<any> | null {
  return field[FIELD_RESTORE_FROM_PATHS];
}

function isSingleValue(
  input: TInputBase<null>
): TValidateResult<FormDataEntryValue | null, TFormiIssueSingle> {
  if (input.values === null) {
    return success(null);
  }
  if (input.values.length === 0) {
    return success(null);
  }
  if (input.values.length === 1) {
    return success(input.values[0]);
  }
  return failure({ kind: "UnexpectedMultipleValues" });
}

function isNotNull<Value>(
  input: Value | null
): TValidateResult<Value, TFormiIssueBase> {
  if (input === null) {
    return failure<TFormiIssueBase>({ kind: "MissingField" });
  }
  return success<Value>(input);
}

function isNotFile<Value>(
  input: Value | File
): TValidateResult<Value, TFormiIssueNotFile> {
  if (input instanceof FileOrBlob) {
    return failure<TFormiIssueNotFile>({ kind: "UnexpectedFile" });
  }
  return success<Value>(input);
}

function isNumber(
  input: string | null
): TValidateResult<number | null, TFormiIssueNumber> {
  if (input === "" || input === null) {
    return success<number | null>(null);
  }
  const numberValue = Number(input);
  if (Number.isNaN(numberValue)) {
    return failure<TFormiIssueNumber>({
      kind: "InvalidNumber",
      value: input,
    });
  }
  return success<number>(numberValue);
}

function isDefined(input: any): TValidateResult<boolean, TFormiIssueBase> {
  if (input === null || input === undefined) {
    return success(false);
  }
  return success(true);
}

function isFile(
  entry: FormDataEntryValue | null
): TValidateResult<File, TFormiIssueNotString> {
  if (entry === null) {
    return { success: false, issue: { kind: "MissingField" } };
  }
  if (typeof entry === "string") {
    return { success: false, issue: { kind: "UnexpectedString" } };
  }
  return { success: true, value: entry };
}

function isNonEmptyFile(
  input: File
): TValidateResult<File, TFormiIssueNonEmptyFile> {
  if (input.size === 0) {
    return failure<TFormiIssueNonEmptyFile>({ kind: "EmptyFile" });
  }
  return success(input);
}

export function success<Value>(value: Value): TValidateSuccess<Value> {
  return { success: true, value };
}

export function failure<Issue>(
  issue?: Issue | Array<Issue>
): TValidateFailure<Issue> {
  if (issue === undefined) {
    return { success: false };
  }
  if (Array.isArray(issue)) {
    return { success: false, issues: issue };
  }
  return { success: false, issue };
}
