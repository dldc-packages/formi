import {
  FIELD_RESTORE_FROM_PATHS,
  FIELD_TYPES,
  FIELD_VALIDATE_FN,
} from "./FormiField.contants.ts";
import type {
  TFormiField,
  TFormiFieldAny,
  TInputBase,
  TRestoreFromPaths,
  TValidateFailure,
  TValidateFn,
  TValidateResult,
  TValidateSuccess,
} from "./FormiField.types.ts";
import type {
  TFormiIssueBase,
  TFormiIssueNonEmptyFile,
  TFormiIssueNotFile,
  TFormiIssueNotString,
  TFormiIssueNumber,
  TFormiIssueSingle,
} from "./FormiIssue.ts";
import { FileOrBlob } from "./utils.ts";

export function isFormiField(field: any): field is TFormiField<any, any, any> {
  return Boolean(field && field[FIELD_TYPES]);
}

export function getValidateFn(
  field: TFormiFieldAny,
): TValidateFn<any, any, any> {
  return field[FIELD_VALIDATE_FN];
}

export function getRestoreFromPaths(
  field: TFormiFieldAny,
): TRestoreFromPaths<any> | null {
  return field[FIELD_RESTORE_FROM_PATHS];
}

export function isSingleValue(
  input: TInputBase<null>,
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

export function isNotNull<Value>(
  input: Value | null,
): TValidateResult<Value, TFormiIssueBase> {
  if (input === null) {
    return failure<TFormiIssueBase>({ kind: "MissingField" });
  }
  return success<Value>(input);
}

export function isNotFile<Value>(
  input: Value | File,
): TValidateResult<Value, TFormiIssueNotFile> {
  if (input instanceof FileOrBlob) {
    return failure<TFormiIssueNotFile>({ kind: "UnexpectedFile" });
  }
  return success<Value>(input);
}

export function isNumber(
  input: string | null,
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

export function isDefined(
  input: any,
): TValidateResult<boolean, TFormiIssueBase> {
  if (input === null || input === undefined) {
    return success(false);
  }
  return success(true);
}

export function isFile(
  entry: FormDataEntryValue | null,
): TValidateResult<File, TFormiIssueNotString> {
  if (entry === null) {
    return { success: false, issue: { kind: "MissingField" } };
  }
  if (typeof entry === "string") {
    return { success: false, issue: { kind: "UnexpectedString" } };
  }
  return { success: true, value: entry };
}

export function isNonEmptyFile(
  input: File,
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
  issue?: Issue | Array<Issue>,
): TValidateFailure<Issue> {
  if (issue === undefined) {
    return { success: false };
  }
  if (Array.isArray(issue)) {
    return { success: false, issues: issue };
  }
  return { success: false, issue };
}
