import { createSubscription } from "@dldc/pubsub";
import {
  createGetValueUnmountedForm,
  createGetValueUnresolved,
  createInternalDuplicateKey,
  createInternalUnhandledAction,
  createValidateSuccessWithoutValue,
} from "./FormiErreur.ts";
import * as FormiField from "./FormiField.ts";
import type { TFormiFieldAny, TInputBase } from "./FormiField.types.ts";
import {
  type TFormiFieldTree,
  traverseFormiFieldTree,
  unwrapFormiFieldTree,
  wrapFormiFieldTree,
} from "./FormiFieldTree.ts";
import type {
  TFormiIssue,
  TFormiIssueBase,
  TFormiIssues,
} from "./FormiIssue.ts";
import type { TFormiKey } from "./FormiKey.ts";
import type {
  IFormiState,
  IFormiStore,
  TDebugStateResult,
  TFieldsStateMap,
  TFieldsStateMapDraft,
  TFieldStateAny,
  TFormiStoreActions,
  TRootFormiField,
} from "./FormiStore.types.ts";
import { createEmptyImmuWeakMap } from "./tools/ImmuWeakMap.ts";
import { pathEqual, type TPath } from "./tools/Path.ts";
import { expectNever, isSetEqual, shallowEqual } from "./utils.ts";

export function createFormiStore(
  formName: string,
  initialFields: TFormiFieldTree,
  issues: TFormiIssues<any> | undefined,
): IFormiStore {
  let state: IFormiState = createInitialState(
    formName,
    initialFields,
    issues,
  );
  const subscription = createSubscription<IFormiState>();

  return {
    subscribe: subscription.subscribe,
    getState,
    getTree,
    dispatch,
    getIssuesOrThrow,
    getValueOrThrow,
    hasErrors,

    debugState,
    logDegugState,
  };

  function dispatch(action: TFormiStoreActions): IFormiState {
    let nextState: IFormiState;
    try {
      nextState = reducer(state, action);
    } catch (error) {
      console.error(error);
      return state;
    }
    if (nextState !== state) {
      state = nextState;
      subscription.emit(state);
    }
    return state;
  }

  function getState(): IFormiState {
    return state;
  }

  function getTree(): TFormiFieldTree {
    return unwrapFormiFieldTree(state.rootField, state.rootFieldWrapped);
  }

  function reducer(
    state: IFormiState,
    action: TFormiStoreActions,
  ): IFormiState {
    if (action.type === "Mount") {
      return updateStates(state, (draft, fields) => {
        traverseFormiFieldTree<void>(fields, (field, _path, next) => {
          // mount children first
          next();
          draft.updateOrThrow(field.key, (prev) => {
            if (prev.isMounted) {
              return prev;
            }
            const input = getInput(draft, field, action.data);
            const result = runValidate(field, input);
            const isTouched = false;
            return {
              ...prev,
              ...inputToPartialState(prev, input),
              ...validateResultToPartialState(result, isTouched),
            };
          });
        });
      });
    }
    if (action.type === "Change") {
      const tree = unwrapFormiFieldTree(
        state.rootField,
        state.rootFieldWrapped,
      );
      const keys = action.fields
        ? new Set(action.fields.map((f) => f.key))
        : null;
      return updateStates(state, (draft) => {
        traverseFormiFieldTree<boolean>(tree, (field, _path, next) => {
          const childrenUpdated = next().some((v) => v);
          const shouldUpdateSelf = keys === null || keys.has(field.key);
          const shouldUpdate = shouldUpdateSelf || childrenUpdated;
          if (!shouldUpdate) {
            return false;
          }
          const inputRes = getInput(draft, field, action.data);
          const prev = draft.getOrThrow(field.key);
          const expectedTouched = action.touched;
          if (
            prev.isMounted && prev.isTouched === expectedTouched &&
            shallowEqual(prev.rawValue, inputRes.input)
          ) {
            // input is the same, stop validation
            return false;
          }
          const result = runValidate(field, inputRes);
          const isTouched = prev.isTouched || expectedTouched;
          const nextState: TFieldStateAny = {
            ...prev,
            isTouched,
            hasExternalIssues: false,
            ...inputToPartialState(prev, inputRes),
            ...validateResultToPartialState(result, isTouched),
          };
          draft.set(field.key, nextState);
          return true;
        });
      });
    }
    if (action.type === "Submit") {
      return updateStates(state, (draft, fields) => {
        traverseFormiFieldTree(fields, (field, _path, next) => {
          next();
          draft.updateOrThrow(field.key, (prev) => {
            if (prev.hasExternalIssues) {
              return prev;
            }
            const input = getInput(draft, field, action.data);
            const result = runValidate(field, input);
            const isTouched = true;
            return {
              ...prev,
              isSubmitted: true,
              ...inputToPartialState(prev, input),
              ...validateResultToPartialState(result, isTouched),
            };
          });
        });
      });
    }
    if (action.type === "Reset") {
      return updateStates(state, (draft, fields) => {
        traverseFormiFieldTree(fields, (field, _path, next) => {
          next();
          draft.updateOrThrow(field.key, (prev): TFieldStateAny => {
            const inputRes = getInput(draft, field, action.data);
            const result = runValidate(field, inputRes);
            const isTouched = false;
            return {
              ...prev,
              initialRawValue: inputRes.input ?? undefined,
              rawValue: inputRes.input ?? undefined,
              isDirty: false,
              isMounted: true,
              isTouched,
              isSubmitted: false,
              hasExternalIssues: false,
              ...validateResultToPartialState(result, isTouched),
            };
          });
        });
      });
    }
    if (action.type === "SetIssues") {
      return updateStates(state, (draft, fields) => {
        traverseFormiFieldTree(fields, (field, path, next) => {
          next();
          draft.updateOrThrow(field.key, (prev) => {
            const issues = getFieldIssues(path, action.issues);
            if (!issues) {
              return prev;
            }
            const mergedIssues = prev.issues
              ? [...prev.issues, ...issues]
              : issues;
            return {
              ...prev,
              value: undefined,
              isSubmitted: true,
              isTouched: true,
              issues: mergedIssues,
              hasExternalIssues: true,
              touchedIssues: mergedIssues,
            };
          });
        });
      });
    }
    if (action.type === "SetFields") {
      const prevFields = unwrapFormiFieldTree(
        state.rootField,
        state.rootFieldWrapped,
      );
      const nextFields = typeof action.fields === "function"
        ? action.fields(prevFields)
        : action.fields;
      if (nextFields === prevFields) {
        return state;
      }
      const nextRootField = wrapFormiFieldTree(nextFields);
      const draft = state.states.draft();
      traverseWithKeys(formName, nextRootField, (field, path, keys) => {
        draft.update(field.key, (prev) => {
          if (!prev) {
            return createFieldState(field, path, keys, undefined);
          }
          const nextKeys = isSetEqual(prev.keys, keys) ? prev.keys : keys;
          const nextPath = pathEqual(prev.path, path) ? prev.path : path;
          if (nextKeys === prev.keys && nextPath === prev.path) {
            return prev;
          }
          return {
            ...prev,
            keys: nextKeys,
            path: nextPath,
            name: nextPath.serialize(),
          };
        });
      });
      const rootState = draft.getOrThrow(nextRootField.key);
      return {
        rootField: nextRootField,
        rootFieldWrapped: nextRootField !== nextFields,
        states: draft.commit(rootState.keys),
      };
    }
    return expectNever(action, (action) => {
      throw createInternalUnhandledAction(action);
    });
  }

  function updateStates(
    state: IFormiState,
    updater: (draft: TFieldsStateMapDraft, fields: TRootFormiField) => void,
  ): IFormiState {
    const draft = state.states.draft();
    updater(draft, state.rootField);
    const nextStates = commiStatesDraft(draft, state.rootField);
    if (nextStates === state.states) {
      return state;
    }
    const result: IFormiState = { ...state, states: nextStates };
    return result;
  }

  function createInitialState(
    formName: string,
    fields: TFormiFieldTree,
    issues: TFormiIssues<any> | undefined,
  ): IFormiState {
    const map = createEmptyImmuWeakMap<TFormiKey, TFieldStateAny>();
    const draft = map.draft();
    const rootField = wrapFormiFieldTree(fields);
    initializeFieldStateMap(formName, rootField, draft, issues);
    return {
      rootFieldWrapped: rootField !== fields,
      rootField,
      states: commiStatesDraft(draft, rootField),
    };
  }

  function commiStatesDraft(
    draft: TFieldsStateMapDraft,
    rootField: TRootFormiField,
  ): TFieldsStateMap {
    const rootState = draft.getOrThrow(rootField.key);
    return draft.commit(rootState.keys);
  }

  function getFieldIssues(path: TPath, issues: TFormiIssues<any> | undefined) {
    const initialIssues = issues
      ?.filter((item) => pathEqual(item.path, path))
      .map((item) => item.issues)
      .flat();
    const issuesResolved = initialIssues && initialIssues.length > 0
      ? initialIssues
      : null;
    return issuesResolved;
  }

  function createFieldState(
    field: TFormiFieldAny,
    path: TPath,
    keys: Set<TFormiKey>,
    issues: TFormiIssues<any> | undefined,
  ): TFieldStateAny {
    const issuesResolved = getFieldIssues(path, issues);
    return {
      key: field.key,
      path,
      name: path.serialize(),
      keys,
      initialRawValue: undefined,
      rawValue: undefined,
      value: undefined,
      issues: issuesResolved,
      touchedIssues: issuesResolved,
      hasExternalIssues: issuesResolved !== null,
      isTouched: false,
      isDirty: false,
      isSubmitted: false,
      isMounted: false,
    };
  }

  function initializeFieldStateMap(
    formName: string,
    tree: TFormiFieldTree,
    draft: TFieldsStateMapDraft,
    issues: TFormiIssues<any> | undefined,
  ): void {
    traverseWithKeys(formName, tree, (field, path, keys) => {
      const state = createFieldState(field, path, keys, issues);
      draft.set(field.key, state);
      return state.keys;
    });
  }

  /**
   * Traverses the tree from top to bottom,
   * Collecting keys so the visitor function receive the keys of all the fields in the subtree
   */
  function traverseWithKeys(
    formName: string,
    tree: TFormiFieldTree,
    visitor: (
      field: TFormiFieldAny,
      path: TPath,
      keys: Set<TFormiKey>,
    ) => void,
  ) {
    traverseFormiFieldTree<{ path: TPath; keys: Set<TFormiKey> }>(
      tree,
      (field, path, next) => {
        const sub = next();
        const keysMap = new Map<TFormiKey, TPath>();
        const formPath = path.prepend(formName);
        keysMap.set(field.key, formPath);
        sub.forEach((item) => {
          item.keys.forEach((key) => {
            const current = keysMap.get(key);
            if (current) {
              throw createInternalDuplicateKey(key, current, item.path);
            }
            keysMap.set(key, item.path);
          });
        });
        const keys = new Set(keysMap.keys());
        visitor(field, formPath, keys);
        return { path: formPath, keys };
      },
    );
  }

  type ValidateResult =
    | { status: "success"; value: unknown }
    | { status: "error"; issues: any[] }
    | { status: "unkown" };

  function runValidate(
    field: TFormiFieldAny,
    input: GetInputResult,
  ): ValidateResult {
    if (input.resolved === false) {
      // Don't run validate if children are not resolved
      return { status: "unkown" };
    }
    const validateFn = FormiField.utils.getValidateFn(field);
    try {
      const result = validateFn(input.input as any);
      if (result.success) {
        if (result.value === undefined) {
          throw createValidateSuccessWithoutValue(field, input.input);
        }
        return { status: "success", value: result.value };
      }
      let issues = result.issues
        ? result.issues
        : result.issue
        ? [result.issue]
        : null;
      if (issues && issues.length === 0) {
        issues = null;
      }
      if (issues === null) {
        return { status: "unkown" };
      }
      return { status: "error", issues };
    } catch (error) {
      const issue: TFormiIssueBase = { kind: "ValidationError", error };
      return { status: "error", issues: [issue] };
    }
  }

  type GetInputTreeResult = { resolved: false; input: null } | {
    resolved: true;
    input: unknown;
  };

  function getTreeInput(
    draft: TFieldsStateMapDraft,
    field: TFormiFieldTree,
  ): GetInputTreeResult {
    if (field === null) {
      return { resolved: true, input: null };
    }
    if (FormiField.utils.isFormiField(field)) {
      const state = draft.getOrThrow(field.key);
      const value = getValue(state);
      if (value.resolved === false) {
        return { resolved: false, input: null };
      }
      return { resolved: true, input: value.value };
    }
    if (Array.isArray(field)) {
      const values: Array<any> = [];
      for (const item of field) {
        const result = getTreeInput(draft, item);
        if (result.resolved === false) {
          return { resolved: false, input: null };
        }
        values.push(result.input);
      }
      return { resolved: true, input: values };
    }
    const input: Record<string, any> = {};
    for (const [key, item] of Object.entries(field)) {
      const result = getTreeInput(draft, item);
      if (result.resolved === false) {
        return { resolved: false, input: null };
      }
      input[key] = result.input;
    }
    return { resolved: true, input };
  }

  type GetInputResult = { resolved: false; input: null } | {
    resolved: true;
    input: TInputBase<TFormiFieldTree>;
  };

  function getInput(
    draft: TFieldsStateMapDraft,
    field: TFormiFieldAny,
    data: FormData,
  ): GetInputResult {
    const state = draft.getOrThrow(field.key);
    const values = data.getAll(state.name);
    const children = getTreeInput(draft, field.children);
    if (children.resolved === false) {
      return { resolved: false, input: null };
    }
    return { resolved: true, input: { values, children: children.input } };
  }

  type GetValueResult = { resolved: false } | { resolved: true; value: any };

  function getValue(state: TFieldStateAny): GetValueResult {
    if (state.isMounted === false) {
      return { resolved: false };
    }
    if (state.issues !== null) {
      return { resolved: false };
    }
    if (state.value === undefined) {
      return { resolved: false };
    }
    return { resolved: true, value: state.value };
  }

  type PartialFieldState_Result = Pick<
    TFieldStateAny,
    "value" | "issues" | "touchedIssues"
  >;

  function validateResultToPartialState(
    result: ValidateResult,
    isTouched: boolean,
  ): PartialFieldState_Result {
    if (result.status === "success") {
      return { value: result.value, issues: null, touchedIssues: null };
    }
    if (result.status === "error") {
      return {
        value: undefined,
        issues: result.issues,
        touchedIssues: isTouched ? result.issues : null,
      };
    }
    if (result.status === "unkown") {
      return { value: undefined, issues: null, touchedIssues: null };
    }
    return expectNever(result);
  }

  type PartialFieldState_Input = Pick<
    TFieldStateAny,
    "isMounted" | "isDirty" | "initialRawValue" | "rawValue"
  >;

  function inputToPartialState(
    prev: TFieldStateAny,
    inputRes: GetInputResult,
  ): PartialFieldState_Input {
    const { isMounted, initialRawValue, rawValue, isDirty } = prev;
    if (inputRes.resolved === false) {
      // ignore
      return { isMounted, initialRawValue, rawValue, isDirty };
    }
    if (isMounted === false) {
      // mount the field
      return {
        isMounted: true,
        initialRawValue,
        rawValue: inputRes.input,
        isDirty: false,
      };
    }
    // mounted
    if (shallowEqual(rawValue, inputRes.input)) {
      // same input, ignore
      return { isMounted, initialRawValue, rawValue, isDirty };
    }
    return {
      isMounted,
      initialRawValue,
      rawValue: inputRes.input,
      isDirty: shallowEqual(inputRes.input, initialRawValue) === false,
    };
  }

  function hasErrors(): boolean {
    let errorFound = false;
    const { states, rootField } = getState();
    traverseFormiFieldTree(rootField, (field, _path, next) => {
      if (errorFound) {
        return;
      }
      const fieldState = states.getOrThrow(field.key);
      if (fieldState.isMounted === false) {
        errorFound = true;
        return;
      }
      if (fieldState.issues) {
        errorFound = true;
        return;
      }
      next();
    });
    return errorFound;
  }

  function getValueOrThrow(): any {
    const { states, rootField } = getState();
    const rootState = states.getOrThrow(rootField.key);
    if (rootState.isMounted === false) {
      throw createGetValueUnmountedForm(formName);
    }
    if (rootState.value === undefined) {
      throw createGetValueUnresolved(formName);
    }
    return rootState.value;
  }

  function getIssuesOrThrow(): TFormiIssues<any> {
    const { states, rootField } = getState();
    const issues: TFormiIssues<any> = [];
    traverseFormiFieldTree(rootField, (field, path, next) => {
      next();
      const fieldState = states.getOrThrow(field.key);
      if (fieldState.isMounted === false) {
        const issue: TFormiIssue = { kind: "FieldNotMounted" };
        issues.push({ path: path.raw, issues: [issue] });
        return;
      }
      if (fieldState.issues) {
        issues.push({ path: path.raw, issues: fieldState.issues });
      }
    });
    return issues;
  }

  function debugState(state: IFormiState): TDebugStateResult {
    const result: Array<{ field: TFormiFieldAny; state: TFieldStateAny }> = [];
    const { rootField, states } = state;
    traverseFormiFieldTree(rootField, (field, _path, next) => {
      const state = states.get(field.key) as TFieldStateAny;
      result.push({ field, state });
      next();
    });
    return result;
  }

  function logDegugState(state: IFormiState): void {
    const result = debugState(state);
    console.group("FormiState");
    console.groupCollapsed("Fields");
    logTree(state.rootField);
    console.groupEnd();
    console.groupCollapsed("States");
    for (const { field, state } of result) {
      console.groupCollapsed(field.key.id);
      console.log(field);
      console.log(state);
      console.groupEnd();
    }
    console.groupEnd();
    console.groupEnd();

    function logTree(tree: TFormiFieldTree) {
      if (tree === null) {
        console.log("null");
        return;
      }
      if (FormiField.utils.isFormiField(tree)) {
        if (tree.children === null) {
          console.log(tree.key.id, tree);
          return;
        }
        console.groupCollapsed(tree.key.id, tree);
        logTree(tree.children);
        console.groupEnd();
        return;
      }
      if (Array.isArray(tree)) {
        console.groupCollapsed("[]");
        for (const item of tree) {
          logTree(item);
        }
        console.groupEnd();
        return;
      }
      console.groupCollapsed("{}");
      for (const [key, item] of Object.entries(tree)) {
        console.groupCollapsed(key);
        logTree(item);
        console.groupEnd();
      }
      console.groupEnd();
    }
  }
}
