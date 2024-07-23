import type { TRawPath } from "./tools/Path.ts";

export type TFormiIssuesItem<Issue> = { path: TRawPath; issues: Array<Issue> };
export type TFormiIssues<Issue> = Array<TFormiIssuesItem<Issue>>;

export type TFormiIssueBase =
  | { kind: "FieldNotMounted" }
  | { kind: "ValidationError"; error: unknown }
  | { kind: "MissingField" };

export type TFormiIssueSingle = { kind: "UnexpectedMultipleValues" };
export type TFormiIssueNotFile = TFormiIssueBase | { kind: "UnexpectedFile" };
export type TFormiIssueNotString =
  | TFormiIssueBase
  | {
    kind: "UnexpectedString";
  };
export type TFormiIssueNumber =
  | TFormiIssueBase
  | {
    kind: "InvalidNumber";
    value: string;
  };
export type TFormiIssueNonEmptyFile = TFormiIssueBase | { kind: "EmptyFile" };

export type TFormiIssue =
  | TFormiIssueBase
  | TFormiIssueSingle
  | TFormiIssueNotFile
  | TFormiIssueNotString
  | TFormiIssueNumber
  | TFormiIssueNonEmptyFile;
