import { FormiErrors } from './FormiError';
import type { FormiFieldAny, FormiFieldIssue } from './FormiField.types';
import { FormiFieldTree } from './FormiFieldTree';
import type { FormiIssues, FormiIssuesItem } from './FormiIssue';

export interface FormiIssuesBuilder<AnyIssue> {
  readonly add: <F extends FormiFieldAny>(field: F, issue: FormiFieldIssue<F>) => void;
  readonly getIssues: () => FormiIssues<AnyIssue>;
  readonly hasIssues: () => boolean;
}

export const FormiIssuesBuilder = (() => {
  return Object.assign(create, {});

  function create<Tree extends FormiFieldTree, AnyIssue>(tree: Tree): FormiIssuesBuilder<AnyIssue> {
    const map = new Map<FormiFieldAny, Array<any>>();

    return {
      add,
      getIssues,
      hasIssues,
    };

    function getIssues(): FormiIssues<AnyIssue> {
      return issuesFromMap(tree, map);
    }

    function hasIssues(): boolean {
      return map.size > 0;
    }

    function add<F extends FormiFieldAny>(field: F, issue: FormiFieldIssue<F>) {
      const issues = map.get(field) ?? [];
      issues.push(issue);
      if (map.has(field) === false) {
        map.set(field, issues);
      }
    }
  }

  function issuesFromMap<Issue>(tree: FormiFieldTree, map: Map<FormiFieldAny, Array<Issue>>): FormiIssues<Issue> {
    const issues = Array.from(map.entries())
      .map(([field, issues]): FormiIssuesItem<Issue> | null => {
        if (issues.length === 0) {
          return null;
        }
        const path = FormiFieldTree.fieldPath(tree, field);
        if (path === null) {
          throw FormiErrors.FieldNotFound.create(tree, field);
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
