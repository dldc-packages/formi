import { SubscribeMethod } from 'suub';
import { IS_FORM_CONTROLLER } from './ZenFormController';
import { ZenFormFieldAny } from './ZenFormField.types';
import { ZenFormFieldTree, ZenFormFieldTreeValue } from './ZenFormFieldTree';
import { ZenFormIssues } from './ZenFormIssue';
import { ZenFormIssuesBuilder } from './ZenFormIssuesBuilder';
import { ZenFormState } from './ZenFormStore.types';

export type OnSubmitActions = {
  preventDefault: () => void;
  stopPropagation: () => void;
  reset: () => void;
};

export type OnSubmit<Tree extends ZenFormFieldTree> = (
  data: { value: ZenFormFieldTreeValue<Tree>; formData: FormData },
  actions: OnSubmitActions
) => void;

export type ZenFormResult<Tree extends ZenFormFieldTree> =
  | {
      success: true;
      value: ZenFormFieldTreeValue<Tree>;
      fields: Tree;
      customIssues: ZenFormIssuesBuilder<unknown>;
    }
  | {
      success: false;
      issues: ZenFormIssues<unknown>;
      fields: Tree;
      customIssues: ZenFormIssuesBuilder<unknown>;
    };

export type FieldsUpdateFn<F extends ZenFormFieldTree> = (fields: F) => F;

export interface IZenFormController<Tree extends ZenFormFieldTree> {
  readonly [IS_FORM_CONTROLLER]: true;
  readonly formName: string;

  readonly getState: () => ZenFormState;
  readonly subscribe: SubscribeMethod<ZenFormState>;

  readonly submit: (data: FormData) => void;
  readonly getResult: () => ZenFormResult<Tree>;
  readonly setIssues: (issues: ZenFormIssues<any>) => void;
  readonly setOnSubmit: (onSubmit: OnSubmit<Tree>) => void;
  readonly setFields: (update: Tree | ((prev: Tree) => Tree)) => void;
  /**
   * Revalidate the given fields.
   * If no fields are given, all fields will be revalidated.
   */
  readonly revalidate: (...fields: ZenFormFieldAny[]) => void;

  readonly unmount: () => void;
  readonly mount: (formEl: HTMLFormElement) => void;
}

export type ZenFormControllerOptions<Tree extends ZenFormFieldTree> = {
  formName: string;
  initialFields: Tree;
  initialIssues?: ZenFormIssues<any>;
  onSubmit?: OnSubmit<Tree>;
  onReset?: () => void;
  validateOnMount?: boolean;
};

export type ZenFormControllerAny = IZenFormController<any>;
