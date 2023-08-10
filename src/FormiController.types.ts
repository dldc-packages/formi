import type { SubscribeMethod } from '@dldc/pubsub';
import type { IS_FORM_CONTROLLER } from './FormiController';
import type { TFormiFieldAny } from './FormiField.types';
import type { TFormiFieldTree, TFormiFieldTreeInput, TFormiFieldTreeOutput } from './FormiFieldTree';
import type { TFormiIssues } from './FormiIssue';
import type { IFormiIssuesBuilder } from './FormiIssuesBuilder';
import type { IFormiState } from './FormiStore.types';

export interface IOnSubmitActions {
  preventDefault: () => void;
  stopPropagation: () => void;
  reset: () => void;
}

export type TOnSubmit<Tree extends TFormiFieldTree> = (
  data: { value: TFormiFieldTreeOutput<Tree>; formData: FormData },
  actions: IOnSubmitActions,
) => void;

export type TFormiResult<Tree extends TFormiFieldTree> =
  | {
      success: true;
      value: TFormiFieldTreeOutput<Tree>;
      fields: Tree;
      customIssues: IFormiIssuesBuilder<unknown>;
    }
  | {
      success: false;
      issues: TFormiIssues<unknown>;
      fields: Tree;
      customIssues: IFormiIssuesBuilder<unknown>;
    };

export type TFieldsUpdateFn<F extends TFormiFieldTree> = (fields: F) => F;

export interface IFormiController<Tree extends TFormiFieldTree> {
  readonly [IS_FORM_CONTROLLER]: true;
  readonly formName: string;

  readonly getState: () => IFormiState;
  readonly subscribe: SubscribeMethod<IFormiState>;

  readonly submit: (data: FormData) => void;
  readonly ingest: (data: TFormiFieldTreeInput<Tree>) => void;
  readonly getResult: () => TFormiResult<Tree>;
  readonly setIssues: (issues: TFormiIssues<any>) => void;
  readonly setOnSubmit: (onSubmit: TOnSubmit<Tree>) => void;
  readonly setFields: (update: Tree | ((prev: Tree) => Tree)) => void;
  readonly getFields: () => Tree;
  /**
   * Revalidate the given fields.
   * If no fields are given, all fields will be revalidated.
   */
  readonly revalidate: (...fields: TFormiFieldAny[]) => void;

  readonly unmount: () => void;
  readonly mount: (formEl: HTMLFormElement) => void;
}

export interface IFormiControllerOptions<Tree extends TFormiFieldTree> {
  formName: string;
  initialFields: Tree;
  initialIssues?: TFormiIssues<any>;
  onSubmit?: TOnSubmit<Tree>;
  onReset?: () => void;
  validateOnMount?: boolean;
}

export type TFormiControllerAny = IFormiController<any>;
