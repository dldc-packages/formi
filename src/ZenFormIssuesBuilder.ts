import { ZenFormErrors } from './ZenFormError';
import { ZenFormFieldAny, ZenFormFieldIssue } from './ZenFormField.types';
import { ZenFormFieldTree } from './ZenFormFieldTree';
import { ZenFormIssues, ZenFormIssuesItem } from './ZenFormIssue';

export interface ZenFormIssuesBuilder<AnyIssue> {
  readonly add: <F extends ZenFormFieldAny>(field: F, issue: ZenFormFieldIssue<F>) => void;
  readonly getIssues: () => ZenFormIssues<AnyIssue>;
  readonly hasIssues: () => boolean;
}

export const ZenFormIssuesBuilder = (() => {
  return Object.assign(create, {});

  function create<Tree extends ZenFormFieldTree, AnyIssue>(tree: Tree): ZenFormIssuesBuilder<AnyIssue> {
    const map = new Map<ZenFormFieldAny, Array<any>>();

    return {
      add,
      getIssues,
      hasIssues,
    };

    function getIssues(): ZenFormIssues<AnyIssue> {
      return issuesFromMap(tree, map);
    }

    function hasIssues(): boolean {
      return map.size > 0;
    }

    function add<F extends ZenFormFieldAny>(field: F, issue: ZenFormFieldIssue<F>) {
      const issues = map.get(field) ?? [];
      issues.push(issue);
      if (map.has(field) === false) {
        map.set(field, issues);
      }
    }
  }

  function issuesFromMap<Issue>(tree: ZenFormFieldTree, map: Map<ZenFormFieldAny, Array<Issue>>): ZenFormIssues<Issue> {
    const issues = Array.from(map.entries())
      .map(([field, issues]): ZenFormIssuesItem<Issue> | null => {
        if (issues.length === 0) {
          return null;
        }
        const path = ZenFormFieldTree.fieldPath(tree, field);
        if (path === null) {
          throw ZenFormErrors.FieldNotFound.create(tree, field);
        }
        return {
          path: path.raw,
          issues,
        };
      })
      .filter((v): v is NonNullable<typeof v> => v !== null);
    return issues;
  }
})();
