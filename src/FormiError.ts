import type { IKey } from '@dldc/erreur';
import { Erreur, Key } from '@dldc/erreur';
import type { TFormiFieldAny } from './FormiField.types';
import type { TFormiFieldTree } from './FormiFieldTree';
import type { IFormiKey } from './FormiKey';
import type { Path } from './tools/Path';

export interface IInternal_UnhandledAction {
  readonly action: any;
}

export interface IInternal_DuplicateKey {
  readonly key: IFormiKey;
  readonly current: Path;
  readonly conflict: Path;
}

export interface IInternal_UnexpectedNever {
  readonly received: any;
}

export const FormiInternalErrors = (() => {
  const Internal_UnhandledAction_Key: IKey<IInternal_UnhandledAction, false> = Key.create('Internal_UnhandledAction');
  const Internal_DuplicateKey_Key: IKey<IInternal_DuplicateKey, false> = Key.create('Internal_DuplicateKey');
  const Internal_UnexpectedNever_Key: IKey<IInternal_UnexpectedNever, false> = Key.create('Internal_UnexpectedNever');

  return {
    Internal_UnhandledAction: {
      Key: Internal_UnhandledAction_Key,
      create(action: any) {
        return Erreur.createWith(Internal_UnhandledAction_Key, { action })
          .withName('Internal_UnhandledAction')
          .withMessage(`Unhandled action "${action?.type}"`);
      },
    },
    Internal_DuplicateKey: {
      Key: Internal_DuplicateKey_Key,
      create(key: IFormiKey, current: Path, conflict: Path) {
        return Erreur.createWith(Internal_DuplicateKey_Key, { key, current, conflict })
          .withName('Internal_DuplicateKey')
          .withMessage(`Duplicate key "${key.toString()}" (${current.serialize()} and ${conflict.serialize()})`);
      },
    },
    Internal_UnexpectedNever: {
      Key: Internal_UnexpectedNever_Key,
      create(received: any) {
        return Erreur.createWith(Internal_UnexpectedNever_Key, { received })
          .withName('Internal_UnexpectedNever')
          .withMessage(`Unexpected Never (received ${received})`);
      },
    },
  };
})();

export interface IMissingFormRef {
  formName: string;
}

export interface IReusedField {
  tree: TFormiFieldTree;
  field: TFormiFieldAny;
  paths: Array<Path>;
}

export interface IFieldNotFound {
  tree: TFormiFieldTree;
  field: TFormiFieldAny;
}

export interface IValidateSuccessWithoutValue {
  field: TFormiFieldAny;
  input: any;
}

export interface IGetValueUnmountedForm {
  formName: string;
}

export interface IGetValueUnresolved {
  formName: string;
}

export interface IMissingFieldState {
  field: TFormiFieldAny;
}

export const FormiErrors = (() => {
  const MissingFormRefKey: IKey<IMissingFormRef, false> = Key.create('MissingFormRef');
  const ReusedFieldKey: IKey<IReusedField, false> = Key.create('ReusedField');
  const FieldNotFoundKey: IKey<IFieldNotFound, false> = Key.create('FieldNotFound');
  const ValidateSuccessWithoutValueKey: IKey<IValidateSuccessWithoutValue, false> =
    Key.create('ValidateSuccessWithoutValue');
  const GetValueUnmountedFormKey: IKey<IGetValueUnmountedForm, false> = Key.create('GetValueUnmountedForm');
  const GetValueUnresolvedKey: IKey<IGetValueUnresolved, false> = Key.create('GetValueUnresolved');
  const MissingFieldStateKey: IKey<IMissingFieldState, false> = Key.create('MissingFieldState');
  const MissingFormiContextKey: IKey<undefined, false, []> = Key.createEmpty('MissingFormiContext');
  const MissingFormiControllerKey: IKey<undefined, false, []> = Key.createEmpty('MissingFormiController');

  return {
    ...FormiInternalErrors,
    MissingFormRef: {
      Key: MissingFormRefKey,
      create(formName: string) {
        return Erreur.createWith(MissingFormRefKey, { formName })
          .withName('MissingFormRef')
          .withMessage(`Missing form ref on form "${formName}"`);
      },
    },
    ReusedField: {
      Key: ReusedFieldKey,
      create(tree: TFormiFieldTree, field: TFormiFieldAny, paths: Array<Path>) {
        return Erreur.createWith(ReusedFieldKey, { tree, field, paths })
          .withName('ReusedField')
          .withMessage(
            `Field "${field.key.toString()}" is used multiple times (${paths.map((p) => p.toString()).join(', ')})`,
          );
      },
    },
    FieldNotFound: {
      Key: FieldNotFoundKey,
      create(tree: TFormiFieldTree, field: TFormiFieldAny) {
        return Erreur.createWith(FieldNotFoundKey, { tree, field })
          .withName('FieldNotFound')
          .withMessage(`Field "${field.key.toString()}" not found in tree.`);
      },
    },
    ValidateSuccessWithoutValue: {
      Key: ValidateSuccessWithoutValueKey,
      create(field: TFormiFieldAny, input: any) {
        return Erreur.createWith(ValidateSuccessWithoutValueKey, { field, input })
          .withName('ValidateSuccessWithoutValue')
          .withMessage(`Expected a value to be returned from the validation function (got undefined).`);
      },
    },
    GetValueUnmountedForm: {
      Key: GetValueUnmountedFormKey,
      create(formName: string) {
        return Erreur.createWith(GetValueUnmountedFormKey, { formName })
          .withName('GetValueUnmountedForm')
          .withMessage(`Cannot get value of unmounted form "${formName}"`);
      },
    },
    GetValueUnresolved: {
      Key: GetValueUnresolvedKey,
      create(formName: string) {
        return Erreur.createWith(GetValueUnresolvedKey, { formName })
          .withName('GetValueUnresolved')
          .withMessage(`Cannot get value of unresolved form "${formName}"`);
      },
    },
    MissingFieldState: {
      Key: MissingFieldStateKey,
      create(field: TFormiFieldAny) {
        return Erreur.createWith(MissingFieldStateKey, { field })
          .withName('MissingFieldState')
          .withMessage(`Missing field state for field "${field.key.toString()}"`);
      },
    },
    MissingFormiContext: {
      Key: MissingFormiContextKey,
      create() {
        return Erreur.createWith(MissingFormiContextKey)
          .withName('MissingFormiContext')
          .withMessage(`No FormiContext found`);
      },
    },
    MissingFormiController: {
      Key: MissingFormiControllerKey,
      create() {
        return Erreur.createWith(MissingFormiControllerKey)
          .withName('MissingFormiController')
          .withMessage(`No FormiController found`);
      },
    },
  };
})();
