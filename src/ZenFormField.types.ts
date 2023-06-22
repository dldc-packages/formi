import { z } from 'zod';
import { FIELD_RESTORE_FROM_PATHS, FIELD_TYPES, FIELD_VALIDATE_FN } from './ZenFormField';
import { ZenFormFieldTree, ZenFormFieldTreeValue } from './ZenFormFieldTree';
import { ZenFormIssueZod } from './ZenFormIssue';
import { ZenFormKey } from './ZenFormKey';
import { Path } from './tools/Path';

export type InputBase<Children extends ZenFormFieldTree> = {
  values: Array<FormDataEntryValue>;
  children: ZenFormFieldTreeValue<Children>;
};

export type ValidateSuccess<Value> = { success: true; value: Value };
export type ValidateFailure<Issue> = { success: false; issue?: Issue; issues?: Array<Issue> };
export type ValidateResult<Value, Issue> = ValidateSuccess<Value> | ValidateFailure<Issue>;

export type ValidateFn<Input, Value, Issue> = (value: Input) => ValidateResult<Value, Issue>;

export type ChildrenUpdateFn<Children> = (prev: Children) => Children;

export type ZenFormFieldAny = IZenFormField<any, any, any>;

export type ZenFormFieldValue<F extends ZenFormFieldAny> = F[typeof FIELD_TYPES]['__value'];
export type ZenFormFieldIssue<F extends ZenFormFieldAny> = F[typeof FIELD_TYPES]['__issue'];
export type ZenFormFieldChildren<F extends ZenFormFieldAny> = F['children'];

export type RestoreFromPaths<Children extends ZenFormFieldTree> = (paths: ReadonlyArray<Path>) => Children;

export type Validate<Value, Issue, Children extends ZenFormFieldTree = null> = <NextValue = Value, NextIssue = never>(
  validateFn: ValidateFn<Value, NextValue, Issue | NextIssue>
) => IZenFormField<NextValue, Issue | NextIssue, Children>;

export interface IZenFormField<Value, Issue, Children extends ZenFormFieldTree = null> {
  readonly [FIELD_RESTORE_FROM_PATHS]: RestoreFromPaths<Children> | null;
  readonly [FIELD_VALIDATE_FN]: ValidateFn<any, Value, Issue>;
  readonly [FIELD_TYPES]: { readonly __value: Value; readonly __issue: Issue };
  readonly children: Children;
  readonly key: ZenFormKey;

  readonly clone: () => IZenFormField<Value, Issue, Children>;
  readonly validate: Validate<Value, Issue, Children>;
  readonly zodValidate: <NextValue = Value>(
    schema: z.Schema<NextValue>
  ) => IZenFormField<NextValue, Issue | ZenFormIssueZod, Children>;
  readonly withIssue: <NextIssue>() => IZenFormField<Value, Issue | NextIssue, Children>;
  readonly withChildren: (children: Children | ChildrenUpdateFn<Children>) => IZenFormField<Value, Issue, Children>;
}

export interface CreateFieldOptions<Value, Issue, Children extends ZenFormFieldTree> {
  key: ZenFormKey;
  children: Children;
  validateFn: ValidateFn<InputBase<Children>, Value, Issue>;
  restoreFromPaths: RestoreFromPaths<Children> | null;
}
