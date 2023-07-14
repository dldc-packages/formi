import type { z } from 'zod';
import type { FIELD_RESTORE_FROM_PATHS, FIELD_TYPES, FIELD_VALIDATE_FN } from './FormiField';
import type { FormiFieldTree, FormiFieldTreeValue } from './FormiFieldTree';
import type { FormiIssueZod } from './FormiIssue';
import type { FormiKey } from './FormiKey';
import type { Path } from './tools/Path';

export type InputBase<Children extends FormiFieldTree> = {
  values: Array<FormDataEntryValue>;
  children: FormiFieldTreeValue<Children>;
};

export type ValidateSuccess<Value> = { success: true; value: Value };
export type ValidateFailure<Issue> = { success: false; issue?: Issue; issues?: Array<Issue> };
export type ValidateResult<Value, Issue> = ValidateSuccess<Value> | ValidateFailure<Issue>;

export type ValidateFn<Input, Value, Issue> = (value: Input) => ValidateResult<Value, Issue>;

export type ChildrenUpdateFn<Children> = (prev: Children) => Children;

export type FormiFieldAny = IFormiField<any, any, any>;

export type FormiFieldValue<F extends FormiFieldAny> = F[typeof FIELD_TYPES]['__value'];
export type FormiFieldIssue<F extends FormiFieldAny> = F[typeof FIELD_TYPES]['__issue'];
export type FormiFieldChildren<F extends FormiFieldAny> = F['children'];

export type RestoreFromPaths<Children extends FormiFieldTree> = (paths: ReadonlyArray<Path>) => Children;

export type Validate<Value, Issue, Children extends FormiFieldTree = null> = <NextValue = Value, NextIssue = never>(
  validateFn: ValidateFn<Value, NextValue, Issue | NextIssue>,
) => IFormiField<NextValue, Issue | NextIssue, Children>;

export interface IFormiField<Value, Issue, Children extends FormiFieldTree = null> {
  readonly [FIELD_RESTORE_FROM_PATHS]: RestoreFromPaths<Children> | null;
  readonly [FIELD_VALIDATE_FN]: ValidateFn<any, Value, Issue>;
  readonly [FIELD_TYPES]: { readonly __value: Value; readonly __issue: Issue };
  readonly children: Children;
  readonly key: FormiKey;

  readonly clone: () => IFormiField<Value, Issue, Children>;
  readonly validate: Validate<Value, Issue, Children>;
  readonly zodValidate: <NextValue = Value>(
    schema: z.Schema<NextValue>,
  ) => IFormiField<NextValue, Issue | FormiIssueZod, Children>;
  readonly withIssue: <NextIssue>() => IFormiField<Value, Issue | NextIssue, Children>;
  readonly withChildren: (children: Children | ChildrenUpdateFn<Children>) => IFormiField<Value, Issue, Children>;
}

export interface CreateFieldOptions<Value, Issue, Children extends FormiFieldTree> {
  key: FormiKey;
  children: Children;
  validateFn: ValidateFn<InputBase<Children>, Value, Issue>;
  restoreFromPaths: RestoreFromPaths<Children> | null;
}
