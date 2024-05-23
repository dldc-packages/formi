import type { SubscribeMethod } from "@dldc/pubsub";
import type { TFieldsUpdateFn } from "./FormiController.types.ts";
import type {
  TFormiField,
  TFormiFieldAny,
  TFormiFieldChildren,
  TFormiFieldIssue,
  TFormiFieldValue,
  TInputBase,
} from "./FormiField.types.ts";
import type { TFormiFieldTree } from "./FormiFieldTree.ts";
import type { TFormiIssues } from "./FormiIssue.ts";
import type { TFormiKey } from "./FormiKey.ts";
import type { IImmuWeakMap, IImmuWeakMapDraft } from "./tools/ImmuWeakMap.ts";
import type { TPath } from "./tools/Path.ts";

export interface IFieldState<Value, Issue, Children extends TFormiFieldTree> {
  readonly key: TFormiKey;
  readonly path: TPath;
  readonly name: string; // path as string
  // All field keys (self + children recursively)
  // This is used to know which fields to update when a field changes
  readonly keys: ReadonlySet<TFormiKey>;

  readonly initialRawValue: TInputBase<Children> | undefined;
  readonly rawValue: TInputBase<Children> | undefined;
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

export type TFieldsStateMap = IImmuWeakMap<TFormiKey, TFieldStateAny>;
export type TFieldsStateMapDraft = IImmuWeakMapDraft<TFormiKey, TFieldStateAny>;

export type TFormiStoreActions =
  | { type: "Mount"; data: FormData }
  | {
    type: "Change";
    data: FormData;
    // Should the changed fields be marked as touched
    touched: boolean;
    // All fields that need to be updated
    // null means all fields
    fields: ReadonlyArray<TFormiFieldAny> | null;
  }
  | { type: "Submit"; data: FormData }
  | { type: "Reset"; data: FormData }
  | {
    // This action is triggered when controller.setIssues is called
    type: "SetIssues";
    issues: TFormiIssues<any>;
  }
  | {
    // This action updated the shape of the form
    type: "SetFields";
    fields: TFormiFieldTree | TFieldsUpdateFn<TFormiFieldTree>;
  };

export type TRootFormiField = TFormiField<any, any, TFormiFieldTree>;

export interface IFormiState {
  // If the root fields is an object of fields we wrap it in a group
  readonly rootFieldWrapped: boolean;
  // The tree of fields
  readonly rootField: TRootFormiField;
  // State for each field
  readonly states: TFieldsStateMap;
}

export type TDebugStateResult = Array<
  { field: TFormiFieldAny; state: TFieldStateAny }
>;

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
