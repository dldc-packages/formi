import { ErreurType } from '@dldc/erreur';
import type { FormiFieldAny } from './FormiField.types';
import type { FormiFieldTree } from './FormiFieldTree';
import type { FormiKey } from './FormiKey';
import type { Path } from './tools/Path';

export interface IInternal_UnhandledAction {
  readonly action: any;
}

export interface IInternal_DuplicateKey {
  readonly key: FormiKey;
  readonly current: Path;
  readonly conflict: Path;
}

export interface IInternal_UnexpectedNever {
  readonly received: any;
}

export const FormiInternalErrors = {
  Internal_UnhandledAction: ErreurType.defineWithTransform(
    'Internal_UnhandledAction',
    (action: any): IInternal_UnhandledAction => ({ action }),
    (err, provider, data) => {
      return err.with(provider).withMessage(`Unhandled action "${data.action?.type}"`);
    },
  ),
  Internal_DuplicateKey: ErreurType.defineWithTransform(
    'Internal_DuplicateKey',
    (key: FormiKey, current: Path, conflict: Path): IInternal_DuplicateKey => ({ key, current, conflict }),
    (err, provider, data) => {
      return err
        .with(provider)
        .withMessage(
          `Duplicate key "${data.key.toString()}" (${data.current.serialize()} and ${data.conflict.serialize()})`,
        );
    },
  ),
  Internal_UnexpectedNever: ErreurType.defineWithTransform(
    'Internal_UnexpectedNever',
    (received: any): IInternal_UnexpectedNever => ({ received }),
    (err, provider, data) => {
      return err.with(provider).withMessage(`Unexpected Never (received ${data.received})`);
    },
  ),
};

export interface IMissingFormRef {
  formName: string;
}

export interface IReusedField {
  tree: FormiFieldTree;
  field: FormiFieldAny;
  paths: Array<Path>;
}

export interface IFieldNotFound {
  tree: FormiFieldTree;
  field: FormiFieldAny;
}

export interface IValidateSuccessWithoutValue {
  field: FormiFieldAny;
  input: any;
}

export interface IGetValueUnmountedForm {
  formName: string;
}

export interface IGetValueUnresolved {
  formName: string;
}

export interface IMissingFieldState {
  field: FormiFieldAny;
}

export const FormiErrors = {
  ...FormiInternalErrors,
  MissingFormRef: ErreurType.defineWithTransform(
    'MissingFormRef',
    (formName: string): IMissingFormRef => ({ formName }),
    (err, provider, data) => {
      return err.with(provider).withMessage(`Missing form ref on form "${data.formName}"`);
    },
  ),
  ReusedField: ErreurType.defineWithTransform(
    'ReusedField',
    (tree: FormiFieldTree, field: FormiFieldAny, paths: Array<Path>): IReusedField => ({ tree, field, paths }),
    (err, provider, data) => {
      return err
        .with(provider)
        .withMessage(
          `Field "${data.field.key.toString()}" is used multiple times (${data.paths
            .map((p) => p.toString())
            .join(', ')})`,
        );
    },
  ),
  FieldNotFound: ErreurType.defineWithTransform(
    'FieldNotFound',
    (tree: FormiFieldTree, field: FormiFieldAny): IFieldNotFound => ({ tree, field }),
    (err, provider, data) => {
      return err.with(provider).withMessage(`Field "${data.field.key.toString()}" not found in tree.`);
    },
  ),
  ValidateSuccessWithoutValue: ErreurType.defineWithTransform(
    'ValidateSuccessWithoutValue',
    (field: FormiFieldAny, input: any): IValidateSuccessWithoutValue => ({ field, input }),
    (err, provider) => {
      return err
        .with(provider)
        .withMessage(`Expected a value to be returned from the validation function (got undefined).`);
    },
  ),
  GetValueUnmountedForm: ErreurType.defineWithTransform(
    'GetValueUnmountedForm',
    (formName: string): IGetValueUnmountedForm => ({ formName }),
    (err, provider, data) => {
      return err.with(provider).withMessage(`Cannot get value of unmounted form "${data.formName}"`);
    },
  ),
  GetValueUnresolved: ErreurType.defineWithTransform(
    'GetValueUnresolved',
    (formName: string): IGetValueUnresolved => ({ formName }),
    (err, provider, data) => {
      return err.with(provider).withMessage(`Cannot get value of unresolved form "${data.formName}"`);
    },
  ),
  MissingFieldState: ErreurType.defineWithTransform(
    'MissingFieldState',
    (field: FormiFieldAny): IMissingFieldState => ({ field }),
    (err, provider, data) => {
      return err.with(provider).withMessage(`Missing field state for field "${data.field.key.toString()}"`);
    },
  ),
  MissingFormiContext: ErreurType.defineEmpty('MissingFormiContext', (err, provider) =>
    err.with(provider).withMessage(`No FormiContext found`),
  ),
  MissingFormiController: ErreurType.defineEmpty('MissingFormiController', (err, provider) =>
    err.with(provider).withMessage(`No FormiController found`),
  ),
};
