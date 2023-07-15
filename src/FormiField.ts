import type { z } from 'zod';
import type {
  ICreateFieldOptions,
  IFormiField,
  TChildrenUpdateFn,
  TFormiFieldAny,
  TInputBase,
  TRestoreFromPaths,
  TValidateFailure,
  TValidateFn,
  TValidateResult,
  TValidateSuccess,
} from './FormiField.types';
import type { TFormiFieldTree, TFormiFieldTreeValue } from './FormiFieldTree';
import { FormiFieldTree } from './FormiFieldTree';
import type {
  TFormiIssueBase,
  TFormiIssueNonEmptyFile,
  TFormiIssueNotFile,
  TFormiIssueNotString,
  TFormiIssueNumber,
  TFormiIssueSingle,
  TFormiIssueZod,
} from './FormiIssue';
import { FormiKey } from './FormiKey';
import type { Path } from './tools/Path';
import { FileOrBlob } from './utils';

export const FIELD_TYPES = Symbol('FIELD_TYPES');
export const FIELD_VALIDATE_FN = Symbol('FIELD_VALIDATE_FN');
export const FIELD_RESTORE_FROM_PATHS = Symbol('FIELD_RESTORE_FROM_PATHS');

export const FormiField = (() => {
  return {
    utils: {
      isFormiField,
      getValidateFn,
      getRestoreFromPaths,
      zodValidator,
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
  }: ICreateFieldOptions<Value, Issue, Children>): IFormiField<Value, Issue, Children> {
    const currentValidateFn = validateFn;

    const self: IFormiField<Value, Issue, Children> = {
      [FIELD_RESTORE_FROM_PATHS]: restoreFromPaths,
      [FIELD_VALIDATE_FN]: currentValidateFn,
      [FIELD_TYPES]: { __value: {} as Value, __issue: {} as Issue },
      key: key,
      children,
      clone,
      validate,
      withIssue,
      zodValidate,
      withChildren,
    };
    return self;

    function clone() {
      return create({
        key: FormiKey(),
        children: FormiFieldTree.clone(children),
        validateFn: currentValidateFn,
        restoreFromPaths,
      });
    }

    function withIssue<NextIssue>(): IFormiField<Value, Issue | NextIssue, Children> {
      return self;
    }

    function validate<NextValue = Value, NextIssue = never>(
      validateFn: TValidateFn<Value, NextValue, Issue | NextIssue>,
    ): IFormiField<NextValue, Issue | NextIssue, Children> {
      const nextValidate = (input: any) => {
        const prev = currentValidateFn(input);
        if (!prev.success) {
          return prev;
        }
        return validateFn(prev.value);
      };
      return create({
        key: FormiKey(),
        children,
        validateFn: nextValidate,
        restoreFromPaths,
      });
    }

    function withChildren(update: Children | TChildrenUpdateFn<Children>): IFormiField<Value, Issue, Children> {
      const nextChildren = typeof update === 'function' ? update(children) : update;
      return create({
        key: self.key,
        children: nextChildren,
        validateFn: currentValidateFn,
        restoreFromPaths,
      });
    }

    function zodValidate<NextValue = Value>(
      schema: z.Schema<NextValue>,
    ): IFormiField<NextValue, Issue | TFormiIssueZod, Children> {
      return validate(zodValidator(schema));
    }
  }

  // fields

  function base() {
    return create<TInputBase<null>, TFormiIssueBase, null>({
      key: FormiKey(),
      children: null,
      validateFn: (input) => success(input),
      restoreFromPaths: null,
    });
  }

  function value() {
    return base().validate(isSingleValue);
  }

  function values() {
    return base().validate((input) => success(input.values));
  }

  function optionalString() {
    return value().validate(isNotFile);
  }

  function string() {
    return optionalString().validate(isNotNull);
  }

  function optionalNumber() {
    return optionalString().validate(isNumber);
  }

  function number() {
    return optionalNumber().validate(isNotNull);
  }

  function checkbox() {
    return optionalString().validate(isDefined);
  }

  function file() {
    return value().validate(isFile);
  }

  function nonEmptyfile() {
    return file().validate(isNonEmptyFile);
  }

  function group<Children extends TFormiFieldTree>(
    children: Children,
  ): IFormiField<TFormiFieldTreeValue<Children>, TFormiIssueBase, Children> {
    return create<TFormiFieldTreeValue<Children>, TFormiIssueBase, Children>({
      key: FormiKey(),
      children,
      validateFn: (input) => success(input.children),
      restoreFromPaths: null,
    });
  }

  function repeat<Child extends TFormiFieldTree>(
    child: Child,
    initialCount: number = 1,
  ): IFormiField<Array<TFormiFieldTreeValue<Child>>, TFormiIssueBase, Array<Child>> {
    const initialChildren = Array.from({ length: initialCount }, () => FormiFieldTree.clone(child));
    return create<Array<TFormiFieldTreeValue<Child>>, TFormiIssueBase, Array<Child>>({
      key: FormiKey(),
      children: initialChildren,
      validateFn: (input) => success(input.children) as any,
      restoreFromPaths: (paths) => restoreRepeat(child, paths),
    });
  }

  // utils

  function restoreRepeat<Child extends TFormiFieldTree>(child: Child, paths: ReadonlyArray<Path>): Array<Child> {
    let size = 0;
    const pathsByIndex = new Map<number, Array<Path>>();
    for (const path of paths) {
      const [head, rest] = path.splitHead();
      if (head === null || typeof head !== 'number') {
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

    return Array.from({ length: size }, () => FormiFieldTree.clone(child)).map((child, index) => {
      const paths = pathsByIndex.get(index) ?? [];
      return FormiFieldTree.restoreFromPaths(child, paths);
    });
  }

  function isFormiField(field: any): field is IFormiField<any, any, any> {
    return Boolean(field && field[FIELD_TYPES]);
  }

  function getValidateFn(field: TFormiFieldAny): TValidateFn<any, any, any> {
    return field[FIELD_VALIDATE_FN];
  }

  function getRestoreFromPaths(field: TFormiFieldAny): TRestoreFromPaths<any> | null {
    return field[FIELD_RESTORE_FROM_PATHS];
  }

  function zodValidator<T>(schema: z.Schema<T>): TValidateFn<any, T, TFormiIssueZod> {
    return (value) => {
      const result = schema.safeParse(value);
      if (result.success) {
        return { success: true, value: result.data };
      }
      const issues = result.error.issues.map((issue): TFormiIssueZod => ({ kind: 'ZodIssue', issue }));
      if (issues.length === 1) {
        return { success: false, issue: issues[0] };
      }
      return { success: false, issues: issues };
    };
  }

  function isSingleValue(input: TInputBase<null>): TValidateResult<FormDataEntryValue | null, TFormiIssueSingle> {
    if (input.values === null) {
      return success(null);
    }
    if (input.values.length === 0) {
      return success(null);
    }
    if (input.values.length === 1) {
      return success(input.values[0]);
    }
    return failure({ kind: 'UnexpectedMultipleValues' });
  }

  function isNotNull<Value>(input: Value | null): TValidateResult<Value, TFormiIssueBase> {
    if (input === null) {
      return failure<TFormiIssueBase>({ kind: 'MissingField' });
    }
    return success<Value>(input);
  }

  function isNotFile<Value>(input: Value | File): TValidateResult<Value, TFormiIssueNotFile> {
    if (input instanceof FileOrBlob) {
      return failure<TFormiIssueNotFile>({ kind: 'UnexpectedFile' });
    }
    return success<Value>(input);
  }

  function isNumber(input: string | null): TValidateResult<number | null, TFormiIssueNumber> {
    if (input === '' || input === null) {
      return success<number | null>(null);
    }
    const numberValue = Number(input);
    if (Number.isNaN(numberValue)) {
      return failure<TFormiIssueNumber>({ kind: 'InvalidNumber', value: input });
    }
    return success<number>(numberValue);
  }

  function isDefined(input: any): TValidateResult<boolean, TFormiIssueBase> {
    if (input === null || input === undefined) {
      return success(false);
    }
    return success(true);
  }

  function isFile(entry: FormDataEntryValue | null): TValidateResult<File, TFormiIssueNotString> {
    if (entry === null) {
      return { success: false, issue: { kind: 'MissingField' } };
    }
    if (typeof entry === 'string') {
      return { success: false, issue: { kind: 'UnexpectedString' } };
    }
    return { success: true, value: entry };
  }

  function isNonEmptyFile(input: File): TValidateResult<File, TFormiIssueNonEmptyFile> {
    if (input.size === 0) {
      return failure<TFormiIssueNonEmptyFile>({ kind: 'EmptyFile' });
    }
    return success(input);
  }
})();

export function success<Value>(value: Value): TValidateSuccess<Value> {
  return { success: true, value };
}

export function failure<Issue>(issue?: Issue | Array<Issue>): TValidateFailure<Issue> {
  if (issue === undefined) {
    return { success: false };
  }
  if (Array.isArray(issue)) {
    return { success: false, issues: issue };
  }
  return { success: false, issue };
}
