import type { SubscribeMethod } from '@dldc/pubsub';
import type { FieldsUpdateFn } from './FormiController.types';
import type {
  FormiFieldAny,
  FormiFieldChildren,
  FormiFieldIssue,
  FormiFieldValue,
  IFormiField,
  InputBase,
} from './FormiField.types';
import type { FormiFieldTree } from './FormiFieldTree';
import type { FormiIssues } from './FormiIssue';
import type { FormiKey } from './FormiKey';
import type { ImmuWeakMap, ImmuWeakMapDraft } from './tools/ImmuWeakMap';
import type { Path } from './tools/Path';

export interface IFieldState<Value, Issue, Children extends FormiFieldTree> {
  readonly key: FormiKey;
  readonly path: Path;
  readonly name: string; // path as string
  // All field keys (self + children recursively)
  // This is used to know which fields to update when a field changes
  readonly keys: ReadonlySet<FormiKey>;

  readonly initialRawValue: InputBase<Children> | undefined;
  readonly rawValue: InputBase<Children> | undefined;
  readonly value: Value | undefined;
  readonly issues: null | Array<Issue>;
  readonly touchedIssues: null | Array<Issue>;
  readonly hasExternalIssues: boolean; // Issues from initial issues or SetIssues
  readonly isMounted: boolean;
  readonly isTouched: boolean;
  readonly isDirty: boolean;
  readonly isSubmitted: boolean;
}

export type FieldStateOf<Field extends FormiFieldAny> = IFieldState<
  FormiFieldValue<Field>,
  FormiFieldIssue<Field>,
  FormiFieldChildren<Field>
>;

export type FieldStateAny = IFieldState<any, any, any>;

export type FieldsStateMap = ImmuWeakMap<FormiKey, FieldStateAny>;
export type FieldsStateMapDraft = ImmuWeakMapDraft<FormiKey, FieldStateAny>;

export type FormiStoreActions =
  | { type: 'Mount'; data: FormData }
  | {
      type: 'Change';
      data: FormData;
      // Should the changed fields be marked as touched
      touched: boolean;
      // All fields that need to be updated
      // null means all fields
      fields: ReadonlyArray<FormiFieldAny> | null;
    }
  | { type: 'Submit'; data: FormData }
  | { type: 'Reset'; data: FormData }
  | {
      // This action is triggered when controller.setIssues is called
      type: 'SetIssues';
      issues: FormiIssues<any>;
    }
  | {
      // This action updated the shape of the form
      type: 'SetFields';
      fields: FormiFieldTree | FieldsUpdateFn<FormiFieldTree>;
    };

export type RootFormiField = IFormiField<any, any, FormiFieldTree>;

export interface FormiState {
  // If the root fields is an object of fields we wrap it in a group
  readonly rootFieldWrapped: boolean;
  // The tree of fields
  readonly rootField: RootFormiField;
  // State for each field
  readonly states: FieldsStateMap;
}

export type DebugStateResult = Array<{ field: FormiFieldAny; state: FieldStateAny }>;

export interface IFormiStore {
  readonly subscribe: SubscribeMethod<FormiState>;
  readonly getState: () => FormiState;
  readonly getTree: () => FormiFieldTree;
  readonly dispatch: (action: FormiStoreActions) => FormiState;
  // utils
  readonly hasErrors: () => boolean;
  readonly getValueOrThrow: () => any;
  readonly getIssuesOrThrow: () => FormiIssues<any>;

  readonly debugState: (state: FormiState) => DebugStateResult;
  readonly logDegugState: (state: FormiState) => void;
}
