import type { SubscribeMethod } from '@dldc/pubsub';
import type { TFieldsUpdateFn } from './FormiController.types';
import type {
  IFormiField,
  TFormiFieldAny,
  TFormiFieldChildren,
  TFormiFieldIssue,
  TFormiFieldValue,
  TOutputBase,
} from './FormiField.types';
import type { TFormiFieldTree } from './FormiFieldTree';
import type { TFormiIssues } from './FormiIssue';
import type { IFormiKey } from './FormiKey';
import type { IImmuWeakMap, IImmuWeakMapDraft } from './tools/ImmuWeakMap';
import type { Path } from './tools/Path';

export interface IFieldState<Value, Issue, Children extends TFormiFieldTree> {
  readonly key: IFormiKey;
  readonly path: Path;
  readonly name: string; // path as string
  // All field keys (self + children recursively)
  // This is used to know which fields to update when a field changes
  readonly keys: ReadonlySet<IFormiKey>;

  readonly initialRawValue: TOutputBase<Children> | undefined;
  readonly rawValue: TOutputBase<Children> | undefined;
  readonly value: Value | undefined;
  readonly issues: null | Array<Issue>;
  readonly touchedIssues: null | Array<Issue>;
  readonly hasExternalIssues: boolean; // Issues from initial issues or SetIssues
  readonly isMounted: boolean;
  readonly isTouched: boolean;
  readonly isDirty: boolean;
  readonly isSubmitted: boolean;
}

export type TFieldStateOf<Field extends TFormiFieldAny> = IFieldState<
  TFormiFieldValue<Field>,
  TFormiFieldIssue<Field>,
  TFormiFieldChildren<Field>
>;

export type TFieldStateAny = IFieldState<any, any, any>;

export type TFieldsStateMap = IImmuWeakMap<IFormiKey, TFieldStateAny>;
export type TFieldsStateMapDraft = IImmuWeakMapDraft<IFormiKey, TFieldStateAny>;

export type TFormiStoreActions =
  | { type: 'Mount'; data: FormData }
  | {
      type: 'Change';
      data: FormData;
      // Should the changed fields be marked as touched
      touched: boolean;
      // All fields that need to be updated
      // null means all fields
      fields: ReadonlyArray<TFormiFieldAny> | null;
    }
  | { type: 'Submit'; data: FormData }
  | { type: 'Reset'; data: FormData }
  | {
      // This action is triggered when controller.setIssues is called
      type: 'SetIssues';
      issues: TFormiIssues<any>;
    }
  | {
      // This action updated the shape of the form
      type: 'SetFields';
      fields: TFormiFieldTree | TFieldsUpdateFn<TFormiFieldTree>;
    }
  | { type: 'Ingest'; fields: TFormiFieldTree; data: any };

export type TRootFormiField = IFormiField<any, any, any, TFormiFieldTree>;

export interface IFormiState {
  // If the root fields is an object of fields we wrap it in a group
  readonly rootFieldWrapped: boolean;
  // The tree of fields
  readonly rootField: TRootFormiField;
  // State for each field
  readonly states: TFieldsStateMap;
}

export type TDebugStateResult = Array<{ field: TFormiFieldAny; state: TFieldStateAny }>;

export interface IFormiStore {
  readonly subscribe: SubscribeMethod<IFormiState>;
  readonly getState: () => IFormiState;
  readonly getTree: () => TFormiFieldTree;
  readonly dispatch: (action: TFormiStoreActions) => IFormiState;
  // utils
  readonly hasErrors: () => boolean;
  readonly getValueOrThrow: () => any;
  readonly getIssuesOrThrow: () => TFormiIssues<any>;

  readonly debugState: (state: IFormiState) => TDebugStateResult;
  readonly logDegugState: (state: IFormiState) => void;
}
