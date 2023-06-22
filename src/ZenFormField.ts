import { z } from 'zod';
import {
  ChildrenUpdateFn,
  CreateFieldOptions,
  IZenFormField,
  InputBase,
  RestoreFromPaths,
  ValidateFailure,
  ValidateFn,
  ValidateResult,
  ValidateSuccess,
  ZenFormFieldAny,
} from './ZenFormField.types';
import { ZenFormFieldTree, ZenFormFieldTreeValue } from './ZenFormFieldTree';
import {
  ZenFormIssueBase,
  ZenFormIssueNonEmptyFile,
  ZenFormIssueNotFile,
  ZenFormIssueNotString,
  ZenFormIssueNumber,
  ZenFormIssueSingle,
  ZenFormIssueZod,
} from './ZenFormIssue';
import { ZenFormKey } from './ZenFormKey';
import { Path } from './tools/Path';

export const FIELD_TYPES = Symbol('FIELD_TYPES');
export const FIELD_VALIDATE_FN = Symbol('FIELD_VALIDATE_FN');
export const FIELD_RESTORE_FROM_PATHS = Symbol('FIELD_RESTORE_FROM_PATHS');

export const ZenFormField = (() => {
  return {
    utils: {
      isZenFormField,
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

  function create<Value, Issue, Children extends ZenFormFieldTree>({
    key,
    children,
    validateFn,
    restoreFromPaths = null,
  }: CreateFieldOptions<Value, Issue, Children>): IZenFormField<Value, Issue, Children> {
    const currentValidateFn = validateFn;

    const self: IZenFormField<Value, Issue, Children> = {
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
        key: ZenFormKey(),
        children: ZenFormFieldTree.clone(children),
        validateFn: currentValidateFn,
        restoreFromPaths,
      });
    }

    function withIssue<NextIssue>(): IZenFormField<Value, Issue | NextIssue, Children> {
      return self;
    }

    function validate<NextValue = Value, NextIssue = never>(
      validateFn: ValidateFn<Value, NextValue, Issue | NextIssue>
    ): IZenFormField<NextValue, Issue | NextIssue, Children> {
      const nextValidate = (input: any) => {
        const prev = currentValidateFn(input);
        if (!prev.success) {
          return prev;
        }
        return validateFn(prev.value);
      };
      return create({
        key: ZenFormKey(),
        children,
        validateFn: nextValidate,
        restoreFromPaths,
      });
    }

    function withChildren(update: Children | ChildrenUpdateFn<Children>): IZenFormField<Value, Issue, Children> {
      const nextChildren = typeof update === 'function' ? update(children) : update;
      return create({
        key: self.key,
        children: nextChildren,
        validateFn: currentValidateFn,
        restoreFromPaths,
      });
    }

    function zodValidate<NextValue = Value>(
      schema: z.Schema<NextValue>
    ): IZenFormField<NextValue, Issue | ZenFormIssueZod, Children> {
      return validate(zodValidator(schema));
    }
  }

  // fields

  function base() {
    return create<InputBase<null>, ZenFormIssueBase, null>({
      key: ZenFormKey(),
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

  function group<Children extends ZenFormFieldTree>(
    children: Children
  ): IZenFormField<ZenFormFieldTreeValue<Children>, ZenFormIssueBase, Children> {
    return create<ZenFormFieldTreeValue<Children>, ZenFormIssueBase, Children>({
      key: ZenFormKey(),
      children,
      validateFn: (input) => success(input.children),
      restoreFromPaths: null,
    });
  }

  function repeat<Child extends ZenFormFieldTree>(
    child: Child,
    initialCount: number = 1
  ): IZenFormField<Array<ZenFormFieldTreeValue<Child>>, ZenFormIssueBase, Array<Child>> {
    const initialChildren = Array.from({ length: initialCount }, () => ZenFormFieldTree.clone(child));
    return create<Array<ZenFormFieldTreeValue<Child>>, ZenFormIssueBase, Array<Child>>({
      key: ZenFormKey(),
      children: initialChildren,
      validateFn: (input) => success(input.children) as any,
      restoreFromPaths: (paths) => restoreRepeat(child, paths),
    });
  }

  // utils

  function restoreRepeat<Child extends ZenFormFieldTree>(child: Child, paths: ReadonlyArray<Path>): Array<Child> {
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

    return Array.from({ length: size }, () => ZenFormFieldTree.clone(child)).map((child, index) => {
      const paths = pathsByIndex.get(index) ?? [];
      return ZenFormFieldTree.restoreFromPaths(child, paths);
    });
  }

  function isZenFormField(field: any): field is IZenFormField<any, any, any> {
    return Boolean(field && field[FIELD_TYPES]);
  }

  function getValidateFn(field: ZenFormFieldAny): ValidateFn<any, any, any> {
    return field[FIELD_VALIDATE_FN];
  }

  function getRestoreFromPaths(field: ZenFormFieldAny): RestoreFromPaths<any> | null {
    return field[FIELD_RESTORE_FROM_PATHS];
  }

  function zodValidator<T>(schema: z.Schema<T>): ValidateFn<any, T, ZenFormIssueZod> {
    return (value) => {
      const result = schema.safeParse(value);
      if (result.success) {
        return { success: true, value: result.data };
      }
      const issues = result.error.issues.map((issue): ZenFormIssueZod => ({ kind: 'ZodIssue', issue }));
      if (issues.length === 1) {
        return { success: false, issue: issues[0] };
      }
      return { success: false, issues: issues };
    };
  }

  function isSingleValue(input: InputBase<null>): ValidateResult<FormDataEntryValue | null, ZenFormIssueSingle> {
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

  function isNotNull<Value>(input: Value | null): ValidateResult<Value, ZenFormIssueBase> {
    if (input === null) {
      return failure<ZenFormIssueBase>({ kind: 'MissingField' });
    }
    return success<Value>(input);
  }

  function isNotFile<Value>(input: Value | File): ValidateResult<Value, ZenFormIssueNotFile> {
    if (input instanceof File) {
      return failure<ZenFormIssueNotFile>({ kind: 'UnexpectedFile' });
    }
    return success<Value>(input);
  }

  function isNumber(input: string | null): ValidateResult<number | null, ZenFormIssueNumber> {
    if (input === '' || input === null) {
      return success<number | null>(null);
    }
    const numberValue = Number(input);
    if (Number.isNaN(numberValue)) {
      return failure<ZenFormIssueNumber>({ kind: 'InvalidNumber', value: input });
    }
    return success<number>(numberValue);
  }

  function isDefined(input: any): ValidateResult<boolean, ZenFormIssueBase> {
    if (input === null || input === undefined) {
      return success(false);
    }
    return success(true);
  }

  function isFile(entry: FormDataEntryValue | null): ValidateResult<File, ZenFormIssueNotString> {
    if (entry === null) {
      return { success: false, issue: { kind: 'MissingField' } };
    }
    if (typeof entry === 'string') {
      return { success: false, issue: { kind: 'UnexpectedString' } };
    }
    return { success: true, value: entry };
  }

  function isNonEmptyFile(input: File): ValidateResult<File, ZenFormIssueNonEmptyFile> {
    if (input.size === 0) {
      return failure<ZenFormIssueNonEmptyFile>({ kind: 'EmptyFile' });
    }
    return success(input);
  }
})();

export function success<Value>(value: Value): ValidateSuccess<Value> {
  return { success: true, value };
}

export function failure<Issue>(issue?: Issue | Array<Issue>): ValidateFailure<Issue> {
  if (issue === undefined) {
    return { success: false };
  }
  if (Array.isArray(issue)) {
    return { success: false, issues: issue };
  }
  return { success: false, issue };
}
