import type { z } from 'zod';
import type { FIELD_RESTORE_FROM_PATHS, FIELD_TYPES, FIELD_VALIDATE_FN } from './FormiField';
import type { TFormiFieldTree, TFormiFieldTreeValue } from './FormiFieldTree';
import type { TFormiIssueZod } from './FormiIssue';
import type { IFormiKey } from './FormiKey';
import type { Path } from './tools/Path';

export type TInputBase<Children extends TFormiFieldTree> = {
  values: Array<FormDataEntryValue>;
  children: TFormiFieldTreeValue<Children>;
};

export type TValidateSuccess<Value> = { success: true; value: Value };
export type TValidateFailure<Issue> = { success: false; issue?: Issue; issues?: Array<Issue> };
export type TValidateResult<Value, Issue> = TValidateSuccess<Value> | TValidateFailure<Issue>;

export type TValidateFn<Input, Value, Issue> = (value: Input) => TValidateResult<Value, Issue>;

export type TChildrenUpdateFn<Children> = (prev: Children) => Children;

export type TFormiFieldAny = IFormiField<any, any, any>;

export type TFormiFieldValue<F extends TFormiFieldAny> = F[typeof FIELD_TYPES]['__value'];
export type TFormiFieldIssue<F extends TFormiFieldAny> = F[typeof FIELD_TYPES]['__issue'];
export type TFormiFieldChildren<F extends TFormiFieldAny> = F['children'];

export type TRestoreFromPaths<Children extends TFormiFieldTree> = (paths: ReadonlyArray<Path>) => Children;

export type TValidate<Value, Issue, Children extends TFormiFieldTree = null> = <NextValue = Value, NextIssue = never>(
  validateFn: TValidateFn<Value, NextValue, Issue | NextIssue>,
) => IFormiField<NextValue, Issue | NextIssue, Children>;

export interface IFormiField<Value, Issue, Children extends TFormiFieldTree = null> {
  readonly [FIELD_RESTORE_FROM_PATHS]: TRestoreFromPaths<Children> | null;
  readonly [FIELD_VALIDATE_FN]: TValidateFn<any, Value, Issue>;
  readonly [FIELD_TYPES]: { readonly __value: Value; readonly __issue: Issue };
  readonly children: Children;
  readonly key: IFormiKey;

  readonly clone: () => IFormiField<Value, Issue, Children>;
  readonly validate: TValidate<Value, Issue, Children>;
  readonly zodValidate: <NextValue = Value>(
    schema: z.Schema<NextValue>,
  ) => IFormiField<NextValue, Issue | TFormiIssueZod, Children>;
  readonly withIssue: <NextIssue>() => IFormiField<Value, Issue | NextIssue, Children>;
  readonly withChildren: (children: Children | TChildrenUpdateFn<Children>) => IFormiField<Value, Issue, Children>;
}

export interface ICreateFieldOptions<Value, Issue, Children extends TFormiFieldTree> {
  key: IFormiKey;
  children: Children;
  validateFn: TValidateFn<TInputBase<Children>, Value, Issue>;
  restoreFromPaths: TRestoreFromPaths<Children> | null;
}
