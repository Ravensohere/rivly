# Card Schema

## Overview

This schema defines the structure of redesign pipeline cards. Each card represents one feature, page, or component to be verified/redesigned through the pipeline.

## State Transitions

States flow: `backlog` → `ready` → `running` → `review` → `merged`. Other states (`blocked`, `archived`) are valid if a card hits an exception, but not expected in normal flow.

## JSON Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Redesign Pipeline Card",
  "type": "object",
  "required": ["id", "title", "owner", "state", "branch", "acceptance", "merge_gate", "handoff"],
  "properties": {
    "id": {
      "type": "string",
      "description": "Unique identifier (slug format, lowercase with hyphens)"
    },
    "title": {
      "type": "string",
      "description": "Human-readable card title"
    },
    "owner": {
      "type": "string",
      "description": "Person assigned to this card, or 'unassigned'"
    },
    "state": {
      "type": "string",
      "enum": ["backlog", "ready", "running", "review", "merged", "blocked", "archived"],
      "description": "Current state in the pipeline"
    },
    "branch": {
      "type": "string",
      "description": "Git branch where work is tracked"
    },
    "acceptance": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "description": "List of acceptance criteria that must be met before merge"
    },
    "merge_gate": {
      "type": "string",
      "description": "Global constraint or gate that must pass before merge (e.g., 'vite build passes')"
    },
    "handoff": {
      "type": ["string", "null"],
      "description": "Name of person/team to hand off to, or null if none"
    }
  }
}
```
