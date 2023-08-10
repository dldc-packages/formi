import type { z } from 'zod';
import type {
  FIELD_INGEST_FN,
  FIELD_RESTORE_FROM_INPUT,
  FIELD_RESTORE_FROM_PATHS,
  FIELD_TYPES,
  FIELD_VALIDATE_FN,
} from './FormiField';
import type { TFormiFieldTree, TFormiFieldTreeInput, TFormiFieldTreeOutput } from './FormiFieldTree';
import type { TFormiIssueZod } from './FormiIssue';
import type { IFormiKey } from './FormiKey';
import type { Path } from './tools/Path';

/**
 * Value returned by a field when they are no transforms
 */
export type TOutputBase<Children extends TFormiFieldTree> = {
  values: Array<FormDataEntryValue>;
  children: TFormiFieldTreeOutput<Children>;
};

/**
 * Value expected by a field when they are no ingests
 */
export type TInputBase<Children extends TFormiFieldTree> = {
  values: Array<FormDataEntryValue>;
  children: TFormiFieldTreeInput<Children>;
};

export type TValidateSuccess<Output> = { success: true; value: Output };
export type TValidateFailure<Issue> = { success: false; issue?: Issue; issues?: Array<Issue> };
export type TValidateResult<Output, Issue> = TValidateSuccess<Output> | TValidateFailure<Issue>;

// validate and transform the value
export type TValidateFn<Output, NextOutput, Issue> = (out: Output) => TValidateResult<NextOutput, Issue>;
// transform input value (never fails because it's then validated by the validateFn)
export type TIngestFn<FromInput, ToInput> = (value: FromInput) => ToInput;

export type TChildrenUpdateFn<Children> = (prev: Children) => Children;

export type TFormiFieldAny = IFormiField<any, any, any, any>;

export type TFormiFieldValue<F extends TFormiFieldAny> = F[typeof FIELD_TYPES]['__out'];
export type TFormiFieldIssue<F extends TFormiFieldAny> = F[typeof FIELD_TYPES]['__issue'];
export type TFormiFieldChildren<F extends TFormiFieldAny> = F['children'];

export type TRestoreFromPaths<Children extends TFormiFieldTree> = (paths: ReadonlyArray<Path>) => Children;

export type TRestoreFromInput<Children extends TFormiFieldTree, Input> = (input: Input) => Children;

export type TValidate<Output, Input, Issue, Children extends TFormiFieldTree = null> = <
  NextOut = Output,
  NextIssue = never,
>(
  validateFn: TValidateFn<Output, NextOut, Issue | NextIssue>,
) => IFormiField<NextOut, Input, Issue | NextIssue, Children>;

export type TIngest<Output, Input, Issue, Children extends TFormiFieldTree = null> = <NextInput = Input>(
  ingestFn: TIngestFn<NextInput, Input>,
) => IFormiField<Output, NextInput, Issue, Children>;

/**
 * Output is the value return after the validation
 * Input is the value you have to pass to manually send values to the form
 */
export interface IFormiField<Output, Input, Issue, Children extends TFormiFieldTree = null> {
  readonly [FIELD_VALIDATE_FN]: TValidateFn<any, Output, Issue>;
  readonly [FIELD_INGEST_FN]: TIngestFn<Input, any>;
  readonly [FIELD_RESTORE_FROM_PATHS]: TRestoreFromPaths<Children> | null;
  readonly [FIELD_RESTORE_FROM_INPUT]: TRestoreFromInput<Children, Input> | null;
  readonly [FIELD_TYPES]: { readonly __out: Output; readonly __in: Input; readonly __issue: Issue };
  readonly children: Children;
  readonly key: IFormiKey;

  readonly validate: TValidate<Output, Input, Issue, Children>;
  readonly ingest: TIngest<Output, Input, Issue, Children>;
  readonly zodValidate: <NextValue = Output>(
    schema: z.Schema<NextValue>,
  ) => IFormiField<NextValue, Input, Issue | TFormiIssueZod, Children>;
  readonly withIssue: <NextIssue>() => IFormiField<Output, Input, Issue | NextIssue, Children>;
  readonly withChildren: (
    children: Children | TChildrenUpdateFn<Children>,
  ) => IFormiField<Output, Input, Issue, Children>;

  readonly clone: () => IFormiField<Output, Input, Issue, Children>;
}

export interface ICreateFieldOptions<Output, Input, Issue, Children extends TFormiFieldTree> {
  key: IFormiKey;
  children: Children;
  validateFn: TValidateFn<TOutputBase<Children>, Output, Issue>;
  ingestFn: TIngestFn<Input, TInputBase<Children>>;
  restoreFromPaths: TRestoreFromPaths<Children> | null;
  restoreFromInput: TRestoreFromInput<Children, Input> | null;
}
