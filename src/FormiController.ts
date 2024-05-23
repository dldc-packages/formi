import type {
  IFormiController,
  IFormiControllerOptions,
  IOnSubmitActions,
  TFormiResult,
  TOnSubmit,
} from "./FormiController.types.ts";
import { createMissingFormRef } from "./FormiErreur.ts";
import type { TFormiFieldAny } from "./FormiField.types.ts";
import {
  findInFormiFieldTreeByPath,
  restoreFormiFieldTreeFromPaths,
  type TFormiFieldTree,
} from "./FormiFieldTree.ts";
import type { TFormiIssues } from "./FormiIssue.ts";
import { createFormiIssuesBuilder } from "./FormiIssuesBuilder.ts";
import { createFormiStore } from "./FormiStore.ts";
import { pathFrom, type TPath, validatePathItem } from "./tools/Path.ts";

export const IS_FORM_CONTROLLER = Symbol("IS_FORM_CONTROLLER");

export function createFormiController<Tree extends TFormiFieldTree>({
  formName,
  validateOnMount = true,
  initialFields,
  initialIssues,
  onSubmit: userOnSubmit,
  onReset: userOnReset,
}: IFormiControllerOptions<Tree>): IFormiController<Tree> {
  validatePathItem(formName);

  let onSubmit: TOnSubmit<Tree> | null = userOnSubmit ?? null;
  let formEl: HTMLFormElement | null = null;

  const store = createFormiStore(formName, initialFields, initialIssues);

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
    store.dispatch({ type: "SetIssues", issues });
  }

  function setFields(fields: Tree | ((prev: Tree) => Tree)) {
    store.dispatch({ type: "SetFields", fields: fields as any });
  }

  function revalidate(...fields: TFormiFieldAny[]) {
    const form = getForm();
    const data = new FormData(form);
    store.dispatch({
      type: "Change",
      data,
      touched: false,
      fields: fields.length === 0 ? null : fields,
    });
    return;
  }

  function getResult(): TFormiResult<Tree> {
    // const { rootField } = store.getState();
    const fields = store.getTree() as Tree;
    // QUESTION: is it OK to use the unwrapped fields here?
    const customIssues = createFormiIssuesBuilder(fields);
    if (store.hasErrors() === false) {
      const value = store.getValueOrThrow();
      return { fields, customIssues, success: true, value };
    }
    const issues = store.getIssuesOrThrow();
    return { fields, customIssues, success: false, issues };
  }

  function getForm() {
    if (!formEl) {
      throw createMissingFormRef(formName);
    }
    return formEl;
  }

  function getFields() {
    return store.getTree() as Tree;
  }

  function submit(data: FormData, actions?: IOnSubmitActions) {
    store.dispatch({ type: "Submit", data });
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
      console.warn("No target ?");
      return;
    }
    const input = target as HTMLInputElement;
    const name = input.name;
    if (!name) {
      // ignore inputs without name
      return;
    }
    const fieldPath = pathFrom(name);
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
    const field = findInFormiFieldTreeByPath(fields, path);
    if (!field) {
      console.warn(`Field not found: ${name}`);
      return;
    }
    store.dispatch({ type: "Change", data, touched: true, fields: [field] });
  }

  function handleReset() {
    const form = getForm();
    const data = new FormData(form);
    store.dispatch({ type: "Reset", data });
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
    formEl.addEventListener("submit", handleSubmit);
    formEl.addEventListener("change", handleChange);
    formEl.addEventListener("reset", handleReset);
    if (validateOnMount) {
      const data = new FormData(formEl);
      store.dispatch({ type: "Mount", data });
    }
  }

  function unmount() {
    if (formEl) {
      formEl.removeEventListener("submit", handleSubmit);
      formEl.removeEventListener("change", handleChange);
      formEl.removeEventListener("reset", handleReset);
      formEl = null;
    }
  }
}

export function validateForm<Tree extends TFormiFieldTree>(
  options: IFormiControllerOptions<Tree>,
  data: FormData,
): TFormiResult<Tree> {
  const formPaths: TPath[] = [];
  Array.from(data.keys())
    .map((p) => pathFrom(p))
    .forEach((path) => {
      const [formName, fieldPath] = path.splitHead();
      if (formName !== options.formName) {
        return;
      }
      formPaths.push(fieldPath);
    });
  const fields = restoreFormiFieldTreeFromPaths(
    options.initialFields,
    formPaths,
  );
  const controller = createFormiController<Tree>({
    ...options,
    initialFields: fields,
  });
  controller.submit(data);
  return controller.getResult();
}
