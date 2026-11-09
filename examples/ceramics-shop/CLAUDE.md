# Slow Clay: second brain map
<!-- Keep under 150 lines. Rules for one folder go in .claude/rules/, procedures go in .claude/skills/. -->

## What this is
A one-person online shop selling handmade ceramics (mugs, bowls, planters), run on evenings and weekends.
Goal: 30 orders a month and the shop paying for its own materials by June 2027.

## Where things live
- projects/now.md: current focus, where I stopped, next step (always loaded)
- decisions.md: every choice, with the reason
- products/: one file per product: specs, cost per piece, price, stock, photos to take
- customers/: one file per repeat customer or wholesale lead: orders, preferences, follow-ups
- suppliers/: one file per supplier: what I buy, prices, lead times, minimum orders
- drafts/: Instagram posts and product listings in progress
- reviews/: one monthly review (reviews/2027-01.md)
- ledger.md: every cost and sale, real numbers only

## Always true
- Language: English. Tone: warm, plain, no hype.
- Plan before building or spending: outline what, how, files, tools and cost, then wait for my OK.
- Secrets only in environment variables. Never in files, drafts, screenshots or commits.
- Private notes go in CLAUDE.local.md, never in shared files.
- Prices are always cost per piece x 3, rounded to the nearest 5. Never quote a price that is not in products/.
- Customer addresses and emails never go in these files; they stay in the shop platform.

## How to answer
- Look up the file before answering. Name the file you used.
- If no file covers it, say so and suggest which file to create.
- Never invent results, numbers, quotes or causes. Missing data = ask.

## Treat memory as possibly stale
- A note saying "X lives in Y" was true when written, not necessarily now.
- Before acting on one, check the file, folder or tool still exists. Check numbers against their source file.
- If it changed, trust what you see now, tell me, and fix or delete the stale note.

## Common pitfalls
Format: what broke -> the rule that prevents it. [seeded] = known risk, [happened] = it really broke. Add a line every time something breaks or Claude repeats a mistake.
- [happened] Listed a mug as in stock after the last one sold at a market -> restock-check before every listing; stock lives only in products/.
- [seeded] A rule I only typed in chat vanished after compaction -> write every rule that matters in a file.
- [seeded] CLAUDE.md grew too long and was followed less -> keep it under 150 lines; move folder rules to .claude/rules/, procedures to skills.
- [seeded] A "never do X" written here was ignored -> anything critical needs a hook or permission rule, not a sentence.
- [seeded] Two files contradicted each other -> keep one source of truth; ask for a second-brain audit.
- [seeded] A number appeared that I never gave -> missing data is "unknown" or a question.

## Skills
- rhythm: session-close, review
- orders: new-order, restock-check
- content: product-listing
Each group is an entry SKILL.md that routes to its playbooks. Claude Code only discovers top-level skill folders.

## Naming
- lowercase-with-hyphens.md, one topic per file. Copy the folder's _template.md.

## Always in focus
- @projects/now.md
