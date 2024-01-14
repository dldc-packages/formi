import type {
  IFormiController,
  IFormiControllerOptions,
  IOnSubmitActions,
  TFormiResult,
  TOnSubmit,
} from './FormiController.types';
import { FormiErreur } from './FormiError';
import type { TFormiFieldAny } from './FormiField.types';
import type { TFormiFieldTree } from './FormiFieldTree';
import { FormiFieldTree } from './FormiFieldTree';
import type { TFormiIssues } from './FormiIssue';
import { FormiIssuesBuilder } from './FormiIssuesBuilder';
import { FormiStore } from './FormiStore';
import { Path } from './tools/Path';

export const IS_FORM_CONTROLLER = Symbol('IS_FORM_CONTROLLER');

export const FormiController = (() => {
  return Object.assign(create, { validate });

  function validate<Tree extends TFormiFieldTree>(
    options: IFormiControllerOptions<Tree>,
    data: FormData,
  ): TFormiResult<Tree> {
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
    const fields = FormiFieldTree.restoreFromPaths(options.initialFields, formPaths);
    const controller = create<Tree>({ ...options, initialFields: fields });
    controller.submit(data);
    return controller.getResult();
  }

  function create<Tree extends TFormiFieldTree>({
    formName,
    validateOnMount = true,
    initialFields,
    initialIssues,
    onSubmit: userOnSubmit,
    onReset: userOnReset,
  }: IFormiControllerOptions<Tree>): IFormiController<Tree> {
    Path.validatePathItem(formName);

    let onSubmit: TOnSubmit<Tree> | null = userOnSubmit ?? null;
    let formEl: HTMLFormElement | null = null;

    const store = FormiStore(formName, initialFields, initialIssues);

    const self: IFormiController<Tree> = {
      [IS_FORM_CONTROLLER]: true,
      formName,

      getState: store.getState,
      subscribe: store.subscribe,

      submit,
      getResult,
      setIssues,
      setOnSubmit,
      setFields,
      getFields,
      revalidate,

      mount,
      unmount,
    };

    return self;

    function setOnSubmit(newOnSubmit: TOnSubmit<Tree>) {
      onSubmit = newOnSubmit;
    }

    function setIssues(issues: TFormiIssues<any>) {
      store.dispatch({ type: 'SetIssues', issues });
    }

    function setFields(fields: Tree | ((prev: Tree) => Tree)) {
      store.dispatch({ type: 'SetFields', fields: fields as any });
    }

    function revalidate(...fields: TFormiFieldAny[]) {
      const form = getForm();
      const data = new FormData(form);
      store.dispatch({ type: 'Change', data, touched: false, fields: fields.length === 0 ? null : fields });
      return;
    }

    function getResult(): TFormiResult<Tree> {
      // const { rootField } = store.getState();
      const fields = store.getTree() as Tree;
      // QUESTION: is it OK to use the unwrapped fields here?
      const customIssues = FormiIssuesBuilder(fields);
      if (store.hasErrors() === false) {
        const value = store.getValueOrThrow();
        return { fields, customIssues, success: true, value };
      }
      const issues = store.getIssuesOrThrow();
      return { fields, customIssues, success: false, issues };
    }

    function getForm() {
      if (!formEl) {
        throw FormiErreur.MissingFormRef(formName);
      }
      return formEl;
    }

    function getFields() {
      return store.getTree() as Tree;
    }

    function submit(data: FormData, actions?: IOnSubmitActions) {
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
      const field = FormiFieldTree.findByPath(fields, path);
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
      if (formEl) {
        if (formEl === newFormEl) {
          return;
        }
        unmount();
      }
      formEl = newFormEl;
      formEl.addEventListener('submit', handleSubmit);
      formEl.addEventListener('change', handleChange);
      formEl.addEventListener('reset', handleReset);
      if (validateOnMount) {
        const data = new FormData(formEl);
        store.dispatch({ type: 'Mount', data });
      }
    }

    function unmount() {
      if (formEl) {
        formEl.removeEventListener('submit', handleSubmit);
        formEl.removeEventListener('change', handleChange);
        formEl.removeEventListener('reset', handleReset);
        formEl = null;
      }
    }
  }
})();
