import type { TKey } from '@dldc/erreur';
import { Erreur, Key } from '@dldc/erreur';
import type { TFormiFieldAny } from './FormiField.types';
import type { TFormiFieldTree } from './FormiFieldTree';
import type { IFormiKey } from './FormiKey';
import type { Path } from './tools/Path';

export type TFormiInternalErreurData =
  | { kind: 'UnhandledAction'; action: any }
  | { kind: 'DuplicateKey'; key: IFormiKey; current: Path; conflict: Path }
  | { kind: 'UnexpectedNever'; received: any };

export const FormiInternalErreurKey: TKey<TFormiInternalErreurData, false> =
  Key.create<TFormiInternalErreurData>('FormiInternalErreur');

export const FormiInternalErreur = {
  Internal_UnhandledAction: (action: any) => {
    return Erreur.create(new Error(`Unhandled action "${action?.type}"`))
      .with(FormiInternalErreurKey.Provider({ kind: 'UnhandledAction', action }))
      .withName('FormiInternalErreur');
  },
  Internal_DuplicateKey: (key: IFormiKey, current: Path, conflict: Path) => {
    return Erreur.create(
      new Error(`Duplicate key "${key.toString()}" (${current.serialize()} and ${conflict.serialize()})`),
    )
      .with(FormiInternalErreurKey.Provider({ kind: 'DuplicateKey', key, current, conflict }))
      .withName('FormiInternalErreur');
  },
  Internal_UnexpectedNever: (received: any) => {
    return Erreur.create(new Error(`Unexpected Never (received ${received})`))
      .with(FormiInternalErreurKey.Provider({ kind: 'UnexpectedNever', received }))
      .withName('FormiInternalErreur');
  },
};

export type TFormiErreurData =
  | { kind: 'MissingFormRef'; formName: string }
  | { kind: 'ReusedField'; tree: TFormiFieldTree; field: TFormiFieldAny; paths: Array<Path> }
  | { kind: 'FieldNotFound'; tree: TFormiFieldTree; field: TFormiFieldAny }
  | { kind: 'ValidateSuccessWithoutValue'; field: TFormiFieldAny; input: any }
  | { kind: 'GetValueUnmountedForm'; formName: string }
  | { kind: 'GetValueUnresolved'; formName: string }
  | { kind: 'MissingFieldState'; field: TFormiFieldAny };

export const FormiErreurKey: TKey<TFormiErreurData, false> = Key.create<TFormiErreurData>('FormiErreur');

export const FormiErreur = {
  ...FormiInternalErreur,
  MissingFormRef: (formName: string) => {
    return Erreur.create(new Error(`Missing form ref on form "${formName}"`))
      .with(FormiErreurKey.Provider({ kind: 'MissingFormRef', formName }))
      .withName('FormiErreur');
  },
  ReusedField: (tree: TFormiFieldTree, field: TFormiFieldAny, paths: Array<Path>) => {
    return Erreur.create(
      new Error(
        `Field "${field.key.toString()}" is used multiple times (${paths.map((p) => p.toString()).join(', ')})`,
      ),
    )
      .with(FormiErreurKey.Provider({ kind: 'ReusedField', tree, field, paths }))
      .withName('FormiErreur');
  },
  FieldNotFound: (tree: TFormiFieldTree, field: TFormiFieldAny) => {
    return Erreur.create(new Error(`Field "${field.key.toString()}" not found in tree.`))
      .with(FormiErreurKey.Provider({ kind: 'FieldNotFound', tree, field }))
      .withName('FormiErreur');
  },
  ValidateSuccessWithoutValue: (field: TFormiFieldAny, input: any) => {
    return Erreur.create(new Error(`Expected a value to be returned from the validation function (got undefined).`))
      .with(FormiErreurKey.Provider({ kind: 'ValidateSuccessWithoutValue', field, input }))
      .withName('FormiErreur');
  },
  GetValueUnmountedForm: (formName: string) => {
    return Erreur.create(new Error(`Cannot get value of unmounted form "${formName}"`))
      .with(FormiErreurKey.Provider({ kind: 'GetValueUnmountedForm', formName }))
      .withName('FormiErreur');
  },
  GetValueUnresolved: (formName: string) => {
    return Erreur.create(new Error(`Cannot get value of unresolved form "${formName}"`))
      .with(FormiErreurKey.Provider({ kind: 'GetValueUnresolved', formName }))
      .withName('FormiErreur');
  },
  MissingFieldState: (field: TFormiFieldAny) => {
    return Erreur.create(new Error(`Missing field state for field "${field.key.toString()}"`))
      .with(FormiErreurKey.Provider({ kind: 'MissingFieldState', field }))
      .withName('FormiErreur');
  },
};
