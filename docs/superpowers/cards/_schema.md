# Card Schema

## Overview

This schema defines the structure of redesign pipeline cards. Each card represents one feature, page, or component to be verified/redesigned through the pipeline.

## State Transitions

States flow: `backlog` → `ready` → `running` → `review` → `merged`. Other states (`blocked`, `archived`) are valid if a card hits an exception, but not expected in normal flow.

## Card Structure (YAML Front-Matter Example)

```yaml
---
id: landing-whynot-promise
title: Landing Page - Why Not & Promise Sections
owner: unassigned
state: backlog
branch: riva/integrated-main
worktree: null
acceptance:
  - vite build passes
  - npm test passes
  - primary interaction verified
  - no shared-component regression in holistic smoke pass
merge_gate: riva/integrated-main local-only (no push); no .env/secrets access; <=2 concurrent builds
handoff: null
---
```

## Field Reference

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique identifier (slug format, lowercase with hyphens) |
| `title` | string | Human-readable card title |
| `owner` | string | Person assigned to this card, or 'unassigned' |
| `state` | string | Current state: backlog, ready, running, review, merged, blocked, or archived |
| `branch` | string | Git branch where work is tracked |
| `worktree` | string \| null | Optional git worktree path if work is isolated |
| `acceptance` | list | List of acceptance criteria that must be met before merge |
| `merge_gate` | string | Global constraint/gate that must pass before merge |
| `handoff` | string \| null | Name of person/team to hand off to, or null if none |
