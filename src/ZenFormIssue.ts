import type { ZodIssue } from 'zod';
import { RawPath } from './tools/Path';

export type ZenFormIssuesItem<Issue> = { path: RawPath; issues: Array<Issue> };
export type ZenFormIssues<Issue> = Array<ZenFormIssuesItem<Issue>>;

export type ZenFormIssueBase =
  | { kind: 'FieldNotMounted' }
  | { kind: 'ValidationError'; error: unknown }
  | { kind: 'MissingField' };

export type ZenFormIssueSingle = { kind: 'UnexpectedMultipleValues' };
export type ZenFormIssueZod = ZenFormIssueBase | { kind: 'ZodIssue'; issue: ZodIssue };
export type ZenFormIssueNotFile = ZenFormIssueBase | { kind: 'UnexpectedFile' };
export type ZenFormIssueNotString = ZenFormIssueBase | { kind: 'UnexpectedString' };
export type ZenFormIssueNumber = ZenFormIssueBase | { kind: 'InvalidNumber'; value: string };
export type ZenFormIssueNonEmptyFile = ZenFormIssueBase | { kind: 'EmptyFile' };

export type ZenFormIssue =
  | ZenFormIssueBase
  | ZenFormIssueSingle
  | ZenFormIssueNotFile
  | ZenFormIssueNotString
  | ZenFormIssueNumber
  | ZenFormIssueNonEmptyFile
  | ZenFormIssueZod;
