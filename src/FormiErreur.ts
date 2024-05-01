import { createErreurStore } from '@dldc/erreur';
import type { TFormiFieldAny } from './FormiField.types';
import type { TFormiFieldTree } from './FormiFieldTree';
import type { IFormiKey } from './FormiKey';
import type { Path } from './tools/Path';

export type TFormiErreurData =
  | { kind: 'InternalUnhandledAction'; action: any }
  | { kind: 'InternalDuplicateKey'; key: IFormiKey; current: Path; conflict: Path }
  | { kind: 'InternalUnexpectedNever'; received: any }
  | { kind: 'MissingFormRef'; formName: string }
  | { kind: 'ReusedField'; tree: TFormiFieldTree; field: TFormiFieldAny; paths: Array<Path> }
  | { kind: 'FieldNotFound'; tree: TFormiFieldTree; field: TFormiFieldAny }
  | { kind: 'ValidateSuccessWithoutValue'; field: TFormiFieldAny; input: any }
  | { kind: 'GetValueUnmountedForm'; formName: string }
  | { kind: 'GetValueUnresolved'; formName: string }
  | { kind: 'MissingFieldState'; field: TFormiFieldAny };

const FormiErreurInternal = createErreurStore<TFormiErreurData>();

export const FormiErreur = FormiErreurInternal.asReadonly;

export function createInternalUnhandledAction(action: any) {
  return FormiErreurInternal.setAndReturn(`Unhandled action "${action?.type}"`, {
    kind: 'InternalUnhandledAction',
    action,
  });
}

export function createInternalDuplicateKey(key: IFormiKey, current: Path, conflict: Path) {
  return FormiErreurInternal.setAndReturn(
    `Duplicate key "${key.toString()}" (${current.serialize()} and ${conflict.serialize()})`,
    {
      kind: 'InternalDuplicateKey',
      key,
      current,
      conflict,
    },
  );
}

export function createInternalUnexpectedNever(received: any) {
  return FormiErreurInternal.setAndReturn(`Unexpected Never (received ${received} [${typeof received}])`, {
    kind: 'InternalUnexpectedNever',
    received,
  });
}

export function createMissingFormRef(formName: string) {
  return FormiErreurInternal.setAndReturn(`Missing form ref on form "${formName}"`, {
    kind: 'MissingFormRef',
    formName,
  });
}

export function createReusedField(tree: TFormiFieldTree, field: TFormiFieldAny, paths: Array<Path>) {
  return FormiErreurInternal.setAndReturn(
    `Field "${field.key.toString()}" is used multiple times (${paths.map((p) => p.toString()).join(', ')})`,
    { kind: 'ReusedField', tree, field, paths },
  );
}

export function createFieldNotFound(tree: TFormiFieldTree, field: TFormiFieldAny) {
  return FormiErreurInternal.setAndReturn(`Field "${field.key.toString()}" not found in tree.`, {
    kind: 'FieldNotFound',
    tree,
    field,
  });
}

export function createValidateSuccessWithoutValue(field: TFormiFieldAny, input: any) {
  return FormiErreurInternal.setAndReturn(
    `Expected a value to be returned from the validation function (got undefined).`,
    { kind: 'ValidateSuccessWithoutValue', field, input },
  );
}

export function createGetValueUnmountedForm(formName: string) {
  return FormiErreurInternal.setAndReturn(`Cannot get value of unmounted form "${formName}"`, {
    kind: 'GetValueUnmountedForm',
    formName,
  });
}

export function createGetValueUnresolved(formName: string) {
  return FormiErreurInternal.setAndReturn(`Cannot get value of unresolved form "${formName}"`, {
    kind: 'GetValueUnresolved',
    formName,
  });
}

export function createMissingFieldState(field: TFormiFieldAny) {
  return FormiErreurInternal.setAndReturn(`Missing field state for field "${field.key.toString()}"`, {
    kind: 'MissingFieldState',
    field,
  });
}
