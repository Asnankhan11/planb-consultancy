---
name: get-shit-done
description: >-
  Disciplined software engineering, execution, planning, and verification framework (GSD).
  Use whenever planning, executing, debugging, refactoring, or completing any non-trivial task
  in this codebase to ensure zero regressions, rigorous verification, and high execution velocity.
license: MIT
---

# Get Shit Done (GSD) — Execution & Quality Engine

GSD enforces structured, disciplined execution across any software task. It eliminates guesswork, scope creep, and untested releases.

## Core Directives

1. **Plan First**: Never write code blindly. Break complex tasks into phases with checkable completion criteria.
2. **Execute Systematically**: Execute small, self-contained atomic steps. Verify after each change.
3. **Verify Rigorously**: Every change MUST be tested (syntax check, build check, runtime check, visual review).
4. **Clean Execution**: Remove dead code, avoid introducing bloat, maintain consistency with the existing design system.

## Workflow Phases

### Phase 1: Context & Discovery
- Inspect existing files, dependencies, and styles before touching anything.
- Check relevant domain skills (e.g. SEO, GEO, copywriting, design system).

### Phase 2: Planning (`workflows/plan-phase.md`)
- List exact files to create or modify.
- Define what "done" looks like with verifiable tests.

### Phase 3: Execution (`workflows/execute-phase.md`)
- Keep edits localized and preserve comments/documentation.
- Follow established project architecture (Navy Blue & Amber Gold theme, Tailwind build system, SQLite/Vercel serverless constraints).

### Phase 4: Verification & Quality Audit (`workflows/verify-phase.md`, `workflows/code-review.md`)
- Build verification: `npm run build`
- Runtime verification: test server endpoints or verify live deployments.
- Regression check: ensure existing functionality remains unbroken.

