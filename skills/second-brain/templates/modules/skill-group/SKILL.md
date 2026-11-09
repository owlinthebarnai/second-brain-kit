---
name: {{GROUP}}
description: Use for {{GROUP_WHAT}}: {{TRIGGER_LIST}}. Not for session close, the review, or {{NOT_FOR}}.
---
Entry skill for {{GROUP}}. Read only the playbook that matches the request, then follow it.

| If I ask to... | Read and follow |
|---|---|
{{ROUTING_ROWS}}

If the request fits none of these, stop and say so; do not guess a playbook.
