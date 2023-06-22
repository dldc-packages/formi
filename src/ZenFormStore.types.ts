import { SubscribeMethod } from 'suub';
import { FieldsUpdateFn } from './ZenFormController.types';
import {
  IZenFormField,
  InputBase,
  ZenFormFieldAny,
  ZenFormFieldChildren,
  ZenFormFieldIssue,
  ZenFormFieldValue,
} from './ZenFormField.types';
import { ZenFormFieldTree } from './ZenFormFieldTree';
import { ZenFormIssues } from './ZenFormIssue';
import { ZenFormKey } from './ZenFormKey';
import { ImmuWeakMap, ImmuWeakMapDraft } from './tools/ImmuWeakMap';
import { Path } from './tools/Path';

export interface IFieldState<Value, Issue, Children extends ZenFormFieldTree> {
  readonly key: ZenFormKey;
  readonly path: Path;
  readonly name: string; // path as string
  // All field keys (self + children recursively)
  // This is used to know which fields to update when a field changes
  readonly keys: ReadonlySet<ZenFormKey>;

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

export type FieldStateOf<Field extends ZenFormFieldAny> = IFieldState<
  ZenFormFieldValue<Field>,
  ZenFormFieldIssue<Field>,
  ZenFormFieldChildren<Field>
>;

export type FieldStateAny = IFieldState<any, any, any>;

export type FieldsStateMap = ImmuWeakMap<ZenFormKey, FieldStateAny>;
export type FieldsStateMapDraft = ImmuWeakMapDraft<ZenFormKey, FieldStateAny>;

export type ZenFormStoreActions =
  | { type: 'Mount'; data: FormData }
  | {
      type: 'Change';
      data: FormData;
      // Should the changed fields be marked as touched
      touched: boolean;
      // All fields that need to be updated
      // null means all fields
      fields: ReadonlyArray<ZenFormFieldAny> | null;
    }
  | { type: 'Submit'; data: FormData }
  | { type: 'Reset'; data: FormData }
  | {
      // This action is triggered when controller.setIssues is called
      type: 'SetIssues';
      issues: ZenFormIssues<any>;
    }
  | {
      // This action updated the shape of the form
      type: 'SetFields';
      fields: ZenFormFieldTree | FieldsUpdateFn<ZenFormFieldTree>;
    };

export type RootZenFormField = IZenFormField<any, any, ZenFormFieldTree>;

export interface ZenFormState {
  // If the root fields is an object of fields we wrap it in a group
  readonly rootFieldWrapped: boolean;
  // The tree of fields
  readonly rootField: RootZenFormField;
  // State for each field
  readonly states: FieldsStateMap;
}

export type DebugStateResult = Array<{ field: ZenFormFieldAny; state: FieldStateAny }>;

export interface IZenFormStore {
  readonly subscribe: SubscribeMethod<ZenFormState>;
  readonly getState: () => ZenFormState;
  readonly dispatch: (action: ZenFormStoreActions) => ZenFormState;
  // utils
  readonly hasErrors: () => boolean;
  readonly getValueOrThrow: () => any;
  readonly getIssuesOrThrow: () => ZenFormIssues<any>;

  readonly debugState: (state: ZenFormState) => DebugStateResult;
  readonly logDegugState: (state: ZenFormState) => void;
}
