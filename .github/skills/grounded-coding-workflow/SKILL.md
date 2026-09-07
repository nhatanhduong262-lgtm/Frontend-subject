---
name: grounded-coding-workflow
description: 'Use when implementing, debugging, or reviewing code changes in a repository. Routes from a concrete anchor to the owning behavior, makes the smallest testable edit, validates immediately, and iterates without broad exploratory drift.'
argument-hint: 'Describe the requested change, failing behavior, or review target.'
user-invocable: true
disable-model-invocation: false
---

# Grounded Coding Workflow

## Outcome

Produce a focused, verified repository change. Keep the reasoning local, preserve unrelated work, and finish with an executable validation result or a clear blocker.

## When to Use

Use this skill for:

- Implementing a feature or bug fix from a file, symbol, failing command, test, or behavior.
- Debugging a reported failure when the controlling code path is uncertain.
- Reviewing a change for bugs, regressions, risks, and missing tests.
- Working in a repository with existing conventions that should be preserved.

## Procedure

### 1. Establish a concrete anchor

Start with the most specific available anchor:

- named file or symbol;
- failing test, command, or error;
- observed behavior;
- nearby implementation or call site.

Inspect only enough nearby code to understand the path that directly computes, mutates, or controls the behavior. Prefer fast repository search and existing tests or call sites.

Before editing, state internally:

- **Hypothesis:** one falsifiable explanation of how the behavior should work or why it fails.
- **Discriminating check:** the cheapest nearby test, command, or observation that could disconfirm it.
- **Small edit:** the smallest reversible change that exercises the hypothesis.

If the request does not provide enough information to form these, ask one concise clarifying question rather than mapping the whole repository.

### 2. Check local constraints

Read applicable repository instructions and the owning module's conventions. Check for existing user changes before touching a file. Do not revert or overwrite unrelated work. Identify the narrowest relevant test, typecheck, lint, or build command.

For framework-specific work, follow the repository's current documentation and APIs rather than assumed conventions.

### 3. Make the smallest grounded edit

Edit only the files and behavior required by the hypothesis. Preserve public APIs, formatting, and existing patterns unless the request requires otherwise. Prefer established helpers and libraries. Avoid unrelated refactors, speculative hardening, and comments that merely narrate obvious code.

### 4. Validate immediately

After the first substantive edit, run one focused executable check before further reading or patching. Prefer this order:

1. the cheapest behavior-scoped or failing check;
2. a narrow test for the touched slice;
3. a narrow compile, lint, or typecheck command;
4. a diff inspection only when executable checks are unavailable.

Keep the validation scope narrow. If it fails and supports the hypothesis, repair the same slice and rerun the same check. If it falsifies the hypothesis, take one nearby hop to the code that more directly controls the behavior, then reassess.

### 5. Iterate with bounded exploration

If validation succeeds but the task is incomplete, make the smallest adjacent edit and rerun focused validation. If validation is ambiguous, perform one nearby disambiguating read or inspect one neighboring test or call site. Do not reopen broad exploration unless the nearby paths are exhausted.

Stop after three repair attempts in the same file unless a new, concrete diagnosis justifies a different approach.

### 6. Finish with evidence

Run at least one post-edit executable validation whenever the environment provides one. Report:

- what changed and why;
- the focused checks run and their outcomes;
- any broader tests not run or unrelated pre-existing failures;
- blockers and the next concrete action, if unresolved.

For reviews, list findings first, ordered by severity, with file links and concise behavioral impact. Put summaries and residual test gaps after the findings.

## Quality Criteria

A successful result has:

- a concrete anchor and falsifiable local hypothesis;
- minimal scope and no accidental rollback of user work;
- validation performed immediately after substantive edits;
- tests or checks that cover the changed behavior;
- explicit treatment of failures, ambiguity, and remaining risk;
- no claim of verification when commands were unavailable or not run.
