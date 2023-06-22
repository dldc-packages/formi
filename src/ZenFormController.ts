import {
  IZenFormController,
  OnSubmit,
  OnSubmitActions,
  ZenFormControllerOptions,
  ZenFormResult,
} from './ZenFormController.types';
import { ZenFormErrors } from './ZenFormError';
import { ZenFormFieldAny } from './ZenFormField.types';
import { ZenFormFieldTree } from './ZenFormFieldTree';
import { ZenFormIssues } from './ZenFormIssue';
import { ZenFormIssuesBuilder } from './ZenFormIssuesBuilder';
import { ZenFormStore } from './ZenFormStore';
import { Path } from './tools/Path';

export const IS_FORM_CONTROLLER = Symbol('IS_FORM_CONTROLLER');

export const ZenFormController = (() => {
  return Object.assign(create, { validate });

  function validate<Tree extends ZenFormFieldTree>(
    options: ZenFormControllerOptions<Tree>,
    data: FormData
  ): ZenFormResult<Tree> {
    const formPaths: Path[] = [];
    Array.from(data.keys())
      .map((p) => Path.from(p))
      .forEach((path) => {
        const [formName, fieldPath] = path.splitHead();
        if (formName !== options.formName) {
          return;
        }
        formPaths.push(fieldPath);
      });
    const fields = ZenFormFieldTree.restoreFromPaths(options.initialFields, formPaths);
    const controller = create<Tree>({ ...options, initialFields: fields });
    controller.submit(data);
    return controller.getResult();
  }

  function create<Tree extends ZenFormFieldTree>({
    formName,
    validateOnMount = true,
    initialFields,
    initialIssues,
    onSubmit: userOnSubmit,
    onReset: userOnReset,
  }: ZenFormControllerOptions<Tree>): IZenFormController<Tree> {
    Path.validatePathItem(formName);

    let onSubmit: OnSubmit<Tree> | null = userOnSubmit ?? null;
    let formEl: HTMLFormElement | null = null;

    const store = ZenFormStore(formName, initialFields, initialIssues);

    const self: IZenFormController<Tree> = {
      [IS_FORM_CONTROLLER]: true,
      formName,

      getState: store.getState,
      subscribe: store.subscribe,

      submit,
      getResult,
      setIssues,
      setOnSubmit,
      setFields,
      revalidate,

      mount,
      unmount,
    };

    return self;

    function setOnSubmit(newOnSubmit: OnSubmit<Tree>) {
      onSubmit = newOnSubmit;
    }

    function setIssues(issues: ZenFormIssues<any>) {
      store.dispatch({ type: 'SetIssues', issues });
    }

    function setFields(fields: Tree | ((prev: Tree) => Tree)) {
      store.dispatch({ type: 'SetFields', fields: fields as any });
    }

    function revalidate(...fields: ZenFormFieldAny[]) {
      const form = getForm();
      const data = new FormData(form);
      store.dispatch({ type: 'Change', data, touched: false, fields: fields.length === 0 ? null : fields });
      return;
    }

    function getResult(): ZenFormResult<Tree> {
      const { rootField } = store.getState();
      const fields = rootField.children as Tree;
      const customIssues = ZenFormIssuesBuilder(fields) as ZenFormIssuesBuilder<unknown>;
      if (store.hasErrors() === false) {
        const value = store.getValueOrThrow();
        return { fields, customIssues, success: true, value };
      }
      const issues = store.getIssuesOrThrow();
      return { fields, customIssues, success: false, issues };
    }

    function getForm() {
      if (!formEl) {
        throw ZenFormErrors.MissingFormRef.create(formName);
      }
      return formEl;
    }

    function submit(data: FormData, actions?: OnSubmitActions) {
      store.dispatch({ type: 'Submit', data });
      if (store.hasErrors()) {
        actions?.preventDefault();
        return;
      }
      const value = store.getValueOrThrow();
      if (onSubmit && actions) {
        onSubmit({ value, formData: data }, actions);
      }
    }

    function handleSubmit(event: SubmitEvent) {
      const form = getForm();
      const formData = new FormData(form);
      submit(formData, {
        stopPropagation: () => event.stopPropagation(),
        preventDefault: () => event.preventDefault(),
        reset: () => form.reset(),
      });
    }

    function handleChange(event: Event) {
      const target = event.target;
      if (!target) {
        console.warn('No target ?');
        return;
      }
      const input = target as HTMLInputElement;
      const name = input.name;
      if (!name) {
        // ignore inputs without name
        return;
      }
      const fieldPath = Path.from(name);
      const [inputFormName, path] = fieldPath.splitHead();
      if (!inputFormName) {
        // no form name -> ignore it
        return;
      }
      if (inputFormName !== formName) {
        // input form name does not match form name -> ignore it
        return;
      }
      const form = getForm();
      const data = new FormData(form);
      const fields = store.getState().rootField;
      const field = ZenFormFieldTree.findByPath(fields, path);
      if (!field) {
        console.warn(`Field not found: ${name}`);
        return;
      }
      store.dispatch({ type: 'Change', data, touched: true, fields: [field] });
    }

    function handleReset() {
      const form = getForm();
      const data = new FormData(form);
      store.dispatch({ type: 'Reset', data });
      if (userOnReset) {
        userOnReset();
      }
    }

    function mount(newFormEl: HTMLFormElement) {
      if (formEl && formEl !== newFormEl) {
        unmount();
      }
      if (formEl === null) {
        formEl = newFormEl;
        formEl.addEventListener('submit', handleSubmit);
        formEl.addEventListener('change', handleChange);
        formEl.addEventListener('reset', handleReset);
      }
      const data = new FormData(formEl);
      if (validateOnMount) {
        store.dispatch({ type: 'Mount', data });
      }
    }

    function unmount() {
      if (formEl) {
        formEl.removeEventListener('submit', handleSubmit);
        formEl.removeEventListener('change', handleChange);
      }
    }
  }
})();
