import { Subscription } from 'suub';
import { FormiErrors, FormiInternalErrors } from './FormiError';
import { FormiField } from './FormiField';
import { InputBase, FormiFieldAny } from './FormiField.types';
import { FormiFieldTree } from './FormiFieldTree';
import { FormiIssue, FormiIssueBase, FormiIssues } from './FormiIssue';
import { FormiKey } from './FormiKey';
import {
  DebugStateResult,
  FieldStateAny,
  FieldsStateMap,
  FieldsStateMapDraft,
  IFormiStore,
  RootFormiField,
  FormiState,
  FormiStoreActions,
} from './FormiStore.types';
import { ImmuWeakMap } from './tools/ImmuWeakMap';
import { Path } from './tools/Path';
import { expectNever, isSetEqual, shallowEqual } from './utils';

export const FormiStore = (() => {
  return create;

  function create(formName: string, initialFields: FormiFieldTree, issues: FormiIssues<any> | undefined): IFormiStore {
    let state: FormiState = createInitialState(formName, initialFields, issues);
    const subscription = Subscription<FormiState>();

    return {
      subscribe: subscription.subscribe,
      getState,
      dispatch,
      getIssuesOrThrow,
      getValueOrThrow,
      hasErrors,

      debugState,
      logDegugState,
    };

    function dispatch(action: FormiStoreActions): FormiState {
      let nextState: FormiState;
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

    function getState(): FormiState {
      return state;
    }

    function reducer(state: FormiState, action: FormiStoreActions): FormiState {
      if (action.type === 'Mount') {
        return updateStates(state, (draft, fields) => {
          FormiFieldTree.traverse<void>(fields, (field, _path, next) => {
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
      if (action.type === 'Change') {
        const tree = FormiFieldTree.unwrap(state.rootField, state.rootFieldWrapped);
        const keys = action.fields ? new Set(action.fields.map((f) => f.key)) : null;
        return updateStates(state, (draft) => {
          FormiFieldTree.traverse<boolean>(tree, (field, _path, next) => {
            const childrenUpdated = next().some((v) => v);
            const shouldUpdateSelf = keys === null || keys.has(field.key);
            const shouldUpdate = shouldUpdateSelf || childrenUpdated;
            if (!shouldUpdate) {
              return false;
            }
            const inputRes = getInput(draft, field, action.data);
            const prev = draft.getOrThrow(field.key);
            const expectedTouched = action.touched;
            if (prev.isMounted && prev.isTouched === expectedTouched && shallowEqual(prev.rawValue, inputRes.input)) {
              // input is the same, stop validation
              return false;
            }
            const result = runValidate(field, inputRes);
            const isTouched = prev.isTouched || expectedTouched;
            const nextState: FieldStateAny = {
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
      if (action.type === 'Submit') {
        return updateStates(state, (draft, fields) => {
          FormiFieldTree.traverse(fields, (field, _path, next) => {
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
      if (action.type === 'Reset') {
        return updateStates(state, (draft, fields) => {
          FormiFieldTree.traverse(fields, (field, _path, next) => {
            next();
            draft.updateOrThrow(field.key, (prev): FieldStateAny => {
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
      if (action.type === 'SetIssues') {
        return updateStates(state, (draft, fields) => {
          FormiFieldTree.traverse(fields, (field, path, next) => {
            next();
            draft.updateOrThrow(field.key, (prev) => {
              const issues = getFieldIssues(path, action.issues);
              if (!issues) {
                return prev;
              }
              const mergedIssues = prev.issues ? [...prev.issues, ...issues] : issues;
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
      if (action.type === 'SetFields') {
        const prevFields = FormiFieldTree.unwrap(state.rootField, state.rootFieldWrapped);
        const nextFields = typeof action.fields === 'function' ? action.fields(prevFields) : action.fields;
        if (nextFields === prevFields) {
          return state;
        }
        const nextRootField = FormiFieldTree.wrap(nextFields);
        const draft = state.states.draft();
        traverseWithKeys(formName, nextRootField, (field, path, keys) => {
          draft.update(field.key, (prev) => {
            if (!prev) {
              return createFieldState(field, path, keys, undefined);
            }
            const nextKeys = isSetEqual(prev.keys, keys) ? prev.keys : keys;
            const nextPath = Path.equal(prev.path, path) ? prev.path : path;
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
        throw FormiInternalErrors.Internal_UnhandledAction.create(action);
      });
    }

    function updateStates(
      state: FormiState,
      updater: (draft: FieldsStateMapDraft, fields: RootFormiField) => void
    ): FormiState {
      const draft = state.states.draft();
      updater(draft, state.rootField);
      const nextStates = commiStatesDraft(draft, state.rootField);
      if (nextStates === state.states) {
        return state;
      }
      const result: FormiState = { ...state, states: nextStates };
      return result;
    }

    function createInitialState(
      formName: string,
      fields: FormiFieldTree,
      issues: FormiIssues<any> | undefined
    ): FormiState {
      const map = ImmuWeakMap.empty<FormiKey, FieldStateAny>();
      const draft = map.draft();
      const rootField = FormiFieldTree.wrap(fields);
      initializeFieldStateMap(formName, rootField, draft, issues);
      return {
        rootFieldWrapped: rootField !== fields,
        rootField,
        states: commiStatesDraft(draft, rootField),
      };
    }

    function commiStatesDraft(draft: FieldsStateMapDraft, rootField: RootFormiField): FieldsStateMap {
      const rootState = draft.getOrThrow(rootField.key);
      return draft.commit(rootState.keys);
    }

    function getFieldIssues(path: Path, issues: FormiIssues<any> | undefined) {
      const initialIssues = issues
        ?.filter((item) => Path.equal(item.path, path))
        .map((item) => item.issues)
        .flat();
      const issuesResolved = initialIssues && initialIssues.length > 0 ? initialIssues : null;
      return issuesResolved;
    }

    function createFieldState(
      field: FormiFieldAny,
      path: Path,
      keys: Set<FormiKey>,
      issues: FormiIssues<any> | undefined
    ): FieldStateAny {
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
      tree: FormiFieldTree,
      draft: FieldsStateMapDraft,
      issues: FormiIssues<any> | undefined
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
      tree: FormiFieldTree,
      visitor: (field: FormiFieldAny, path: Path, keys: Set<FormiKey>) => void
    ) {
      FormiFieldTree.traverse<{ path: Path; keys: Set<FormiKey> }>(tree, (field, path, next) => {
        const sub = next();
        const keysMap = new Map<FormiKey, Path>();
        const formPath = path.prepend(formName);
        keysMap.set(field.key, formPath);
        sub.forEach((item) => {
          item.keys.forEach((key) => {
            const current = keysMap.get(key);
            if (current) {
              throw FormiInternalErrors.Internal_DuplicateKey.create(key, current, item.path);
            }
            keysMap.set(key, item.path);
          });
        });
        const keys = new Set(keysMap.keys());
        visitor(field, formPath, keys);
        return { path: formPath, keys };
      });
    }

    type ValidateResult =
      | { status: 'success'; value: unknown }
      | { status: 'error'; issues: any[] }
      | { status: 'unkown' };

    function runValidate(field: FormiFieldAny, input: GetInputResult): ValidateResult {
      if (input.resolved === false) {
        // Don't run validate if children are not resolved
        return { status: 'unkown' };
      }
      const validateFn = FormiField.utils.getValidateFn(field);
      try {
        const result = validateFn(input.input as any);
        if (result.success) {
          if (result.value === undefined) {
            throw FormiErrors.ValidateSuccessWithoutValue.create(field, input.input);
          }
          return { status: 'success', value: result.value };
        }
        let issues = result.issues ? result.issues : result.issue ? [result.issue] : null;
        if (issues && issues.length === 0) {
          issues = null;
        }
        if (issues === null) {
          return { status: 'unkown' };
        }
        return { status: 'error', issues };
      } catch (error) {
        const issue: FormiIssueBase = { kind: 'ValidationError', error };
        return { status: 'error', issues: [issue] };
      }
    }

    type GetInputTreeResult = { resolved: false; input: null } | { resolved: true; input: unknown };

    function getTreeInput(draft: FieldsStateMapDraft, field: FormiFieldTree): GetInputTreeResult {
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

    type GetInputResult = { resolved: false; input: null } | { resolved: true; input: InputBase<FormiFieldTree> };

    function getInput(draft: FieldsStateMapDraft, field: FormiFieldAny, data: FormData): GetInputResult {
      const state = draft.getOrThrow(field.key);
      const values = data.getAll(state.name);
      const children = getTreeInput(draft, field.children);
      if (children.resolved === false) {
        return { resolved: false, input: null };
      }
      return { resolved: true, input: { values, children: children.input } };
    }

    type GetValueResult = { resolved: false } | { resolved: true; value: any };

    function getValue(state: FieldStateAny): GetValueResult {
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

    type PartialFieldState_Result = Pick<FieldStateAny, 'value' | 'issues' | 'touchedIssues'>;

    function validateResultToPartialState(result: ValidateResult, isTouched: boolean): PartialFieldState_Result {
      if (result.status === 'success') {
        return { value: result.value, issues: null, touchedIssues: null };
      }
      if (result.status === 'error') {
        return { value: undefined, issues: result.issues, touchedIssues: isTouched ? result.issues : null };
      }
      if (result.status === 'unkown') {
        return { value: undefined, issues: null, touchedIssues: null };
      }
      return expectNever(result);
    }

    type PartialFieldState_Input = Pick<FieldStateAny, 'isMounted' | 'isDirty' | 'initialRawValue' | 'rawValue'>;

    function inputToPartialState(prev: FieldStateAny, inputRes: GetInputResult): PartialFieldState_Input {
      const { isMounted, initialRawValue, rawValue, isDirty } = prev;
      if (inputRes.resolved === false) {
        // ignore
        return { isMounted, initialRawValue, rawValue, isDirty };
      }
      if (isMounted === false) {
        // mount the field
        return { isMounted: true, initialRawValue, rawValue: inputRes.input, isDirty: false };
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
      FormiFieldTree.traverse(rootField, (field, _path, next) => {
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
        throw FormiErrors.GetValueUnmountedForm.create(formName);
      }
      if (rootState.value === undefined) {
        throw FormiErrors.GetValueUnresolved.create(formName);
      }
      return rootState.value;
    }

    function getIssuesOrThrow(): FormiIssues<any> {
      const { states, rootField } = getState();
      const issues: FormiIssues<any> = [];
      FormiFieldTree.traverse(rootField, (field, path, next) => {
        next();
        const fieldState = states.getOrThrow(field.key);
        if (fieldState.isMounted === false) {
          const issue: FormiIssue = { kind: 'FieldNotMounted' };
          issues.push({ path: path.raw, issues: [issue] });
          return;
        }
        if (fieldState.issues) {
          issues.push({ path: path.raw, issues: fieldState.issues });
        }
      });
      return issues;
    }

    function debugState(state: FormiState): DebugStateResult {
      const result: Array<{ field: FormiFieldAny; state: FieldStateAny }> = [];
      const { rootField, states } = state;
      FormiFieldTree.traverse(rootField, (field, _path, next) => {
        const state = states.get(field.key) as FieldStateAny;
        result.push({ field, state });
        next();
      });
      return result;
    }

    function logDegugState(state: FormiState): void {
      const result = debugState(state);
      console.group('FormiState');
      console.groupCollapsed('Fields');
      logTree(state.rootField);
      console.groupEnd();
      console.groupCollapsed('States');
      for (const { field, state } of result) {
        console.groupCollapsed(field.key.id);
        console.log(field);
        console.log(state);
        console.groupEnd();
      }
      console.groupEnd();
      console.groupEnd();

      function logTree(tree: FormiFieldTree) {
        if (tree === null) {
          console.log('null');
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
          console.groupCollapsed('[]');
          for (const item of tree) {
            logTree(item);
          }
          console.groupEnd();
          return;
        }
        console.groupCollapsed('{}');
        for (const [key, item] of Object.entries(tree)) {
          console.groupCollapsed(key);
          logTree(item);
          console.groupEnd();
        }
        console.groupEnd();
      }
    }
  }
})();