import type { z } from "zod";
import type {
  FIELD_RESTORE_FROM_PATHS,
  FIELD_TYPES,
  FIELD_VALIDATE_FN,
} from "./FormiField.ts";
import type {
  TFormiFieldTree,
  TFormiFieldTreeValue,
} from "./FormiFieldTree.ts";
import type { TFormiIssueZod } from "./FormiIssue.ts";
import type { TFormiKey } from "./FormiKey.ts";
import type { TPath } from "./tools/Path.ts";

export type TInputBase<Children extends TFormiFieldTree> = {
  values: Array<FormDataEntryValue>;
  children: TFormiFieldTreeValue<Children>;
};

export type TValidateSuccess<Value> = { success: true; value: Value };
export type TValidateFailure<Issue> = {
  success: false;
  issue?: Issue;
  issues?: Array<Issue>;
};
export type TValidateResult<Value, Issue> =
  | TValidateSuccess<Value>
  | TValidateFailure<Issue>;

export type TValidateFn<Input, Value, Issue> = (
  value: Input,
) => TValidateResult<Value, Issue>;

export type TChildrenUpdateFn<Children> = (prev: Children) => Children;

export type TFormiFieldAny = TFormiField<any, any, any>;

export type TFormiFieldValue<F extends TFormiFieldAny> =
  F[typeof FIELD_TYPES]["__value"];
export type TFormiFieldIssue<F extends TFormiFieldAny> =
  F[typeof FIELD_TYPES]["__issue"];
export type TFormiFieldChildren<F extends TFormiFieldAny> = F["children"];

export type TRestoreFromPaths<Children extends TFormiFieldTree> = (
  paths: ReadonlyArray<TPath>,
) => Children;

export type TValidate<Value, Issue, Children extends TFormiFieldTree = null> = <
  NextValue = Value,
  NextIssue = never,
>(
  validateFn: TValidateFn<Value, NextValue, Issue | NextIssue>,
) => TFormiField<NextValue, Issue | NextIssue, Children>;

export interface TFormiField<
  Value,
  Issue,
  Children extends TFormiFieldTree = null,
> {
  readonly [FIELD_RESTORE_FROM_PATHS]: TRestoreFromPaths<Children> | null;
  readonly [FIELD_VALIDATE_FN]: TValidateFn<any, Value, Issue>;
  readonly [FIELD_TYPES]: { readonly __value: Value; readonly __issue: Issue };
  readonly children: Children;
  readonly key: TFormiKey;

  readonly clone: () => TFormiField<Value, Issue, Children>;
  readonly validate: TValidate<Value, Issue, Children>;
  readonly zodValidate: <NextValue = Value>(
    schema: z.Schema<NextValue>,
  ) => TFormiField<NextValue, Issue | TFormiIssueZod, Children>;
  readonly withIssue: <NextIssue>() => TFormiField<
    Value,
    Issue | NextIssue,
    Children
  >;
  readonly withChildren: (
    children: Children | TChildrenUpdateFn<Children>,
  ) => TFormiField<Value, Issue, Children>;
}

export interface ICreateFieldOptions<
  Value,
  Issue,
  Children extends TFormiFieldTree,
> {
  key: TFormiKey;
  children: Children;
  validateFn: TValidateFn<TInputBase<Children>, Value, Issue>;
  restoreFromPaths: TRestoreFromPaths<Children> | null;
}
