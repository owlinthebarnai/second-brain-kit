---
name: orders
description: Use for shop orders and stock: a new order or quote (retail or wholesale), or checking what needs restocking before a listing or market. Not for session close, the review, or writing listings.
---
Entry skill for orders. Read only the playbook that matches the request, then follow it.

| If I ask to... | Read and follow |
|---|---|
| Log a new order, or quote a customer | new-order.md |
| Check stock, what to restock, before a listing or market | restock-check.md |

If the request fits none of these, stop and say so; do not guess a playbook.
