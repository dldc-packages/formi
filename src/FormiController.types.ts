import { SubscribeMethod } from '@dldc/pubsub';
import { IS_FORM_CONTROLLER } from './FormiController';
import { FormiFieldAny } from './FormiField.types';
import { FormiFieldTree, FormiFieldTreeValue } from './FormiFieldTree';
import { FormiIssues } from './FormiIssue';
import { FormiIssuesBuilder } from './FormiIssuesBuilder';
import { FormiState } from './FormiStore.types';

export type OnSubmitActions = {
  preventDefault: () => void;
  stopPropagation: () => void;
  reset: () => void;
};

export type OnSubmit<Tree extends FormiFieldTree> = (
  data: { value: FormiFieldTreeValue<Tree>; formData: FormData },
  actions: OnSubmitActions,
) => void;

export type FormiResult<Tree extends FormiFieldTree> =
  | {
      success: true;
      value: FormiFieldTreeValue<Tree>;
      fields: Tree;
      customIssues: FormiIssuesBuilder<unknown>;
    }
  | {
      success: false;
      issues: FormiIssues<unknown>;
      fields: Tree;
      customIssues: FormiIssuesBuilder<unknown>;
    };

export type FieldsUpdateFn<F extends FormiFieldTree> = (fields: F) => F;

export interface IFormiController<Tree extends FormiFieldTree> {
  readonly [IS_FORM_CONTROLLER]: true;
  readonly formName: string;

  readonly getState: () => FormiState;
  readonly subscribe: SubscribeMethod<FormiState>;

  readonly submit: (data: FormData) => void;
  readonly getResult: () => FormiResult<Tree>;
  readonly setIssues: (issues: FormiIssues<any>) => void;
  readonly setOnSubmit: (onSubmit: OnSubmit<Tree>) => void;
  readonly setFields: (update: Tree | ((prev: Tree) => Tree)) => void;
  readonly getFields: () => Tree;
  /**
   * Revalidate the given fields.
   * If no fields are given, all fields will be revalidated.
   */
  readonly revalidate: (...fields: FormiFieldAny[]) => void;

  readonly unmount: () => void;
  readonly mount: (formEl: HTMLFormElement) => void;
}

export type FormiControllerOptions<Tree extends FormiFieldTree> = {
  formName: string;
  initialFields: Tree;
  initialIssues?: FormiIssues<any>;
  onSubmit?: OnSubmit<Tree>;
  onReset?: () => void;
  validateOnMount?: boolean;
};

export type FormiControllerAny = IFormiController<any>;
