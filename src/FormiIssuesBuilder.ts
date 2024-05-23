import { createFieldNotFound } from "./FormiErreur.ts";
import type { TFormiFieldAny, TFormiFieldIssue } from "./FormiField.types.ts";
import type { TFormiFieldTree } from "./FormiFieldTree.ts";
import { getFormiFieldTreeFieldPath } from "./FormiFieldTree.ts";
import type { TFormiIssues, TFormiIssuesItem } from "./FormiIssue.ts";

export interface IFormiIssuesBuilder<AnyIssue> {
  readonly add: <F extends TFormiFieldAny>(
    field: F,
    issue: TFormiFieldIssue<F>,
  ) => void;
  readonly getIssues: () => TFormiIssues<AnyIssue>;
  readonly hasIssues: () => boolean;
}

export function createFormiIssuesBuilder<
  Tree extends TFormiFieldTree,
  AnyIssue,
>(
  tree: Tree,
): IFormiIssuesBuilder<AnyIssue> {
  const map = new Map<TFormiFieldAny, Array<any>>();

  return {
    add,
    getIssues,
    hasIssues,
  };

  function getIssues(): TFormiIssues<AnyIssue> {
    return issuesFromMap(tree, map);
  }

  function hasIssues(): boolean {
    return map.size > 0;
  }

  function add<F extends TFormiFieldAny>(
    field: F,
    issue: TFormiFieldIssue<F>,
  ) {
    const issues = map.get(field) ?? [];
    issues.push(issue);
    if (map.has(field) === false) {
      map.set(field, issues);
    }
  }
}

function issuesFromMap<Issue>(
  tree: TFormiFieldTree,
  map: Map<TFormiFieldAny, Array<Issue>>,
): TFormiIssues<Issue> {
  const issues = Array.from(map.entries())
    .map(([field, issues]): TFormiIssuesItem<Issue> | null => {
      if (issues.length === 0) {
        return null;
      }
      const path = getFormiFieldTreeFieldPath(tree, field);
      if (path === null) {
        throw createFieldNotFound(tree, field);
      }
      return {
        path: path.raw,
        issues,
      };
    })
    .filter((v): v is NonNullable<typeof v> => v !== null);
  return issues;
}
