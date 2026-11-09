# Principles

These rules are what make a second brain work, whatever it is for. Every file the skill writes follows them, and the generated CLAUDE.md states the ones that apply.

## Shape
1. **CLAUDE.md is a map, not a manual.** 150 lines max. It says what the project is, where things live, what is always true and how to answer. Longer CLAUDE.md files get followed less.
2. **Three homes for instructions.** Always-true facts go in CLAUDE.md. Rules for one folder go in `.claude/rules/<topic>.md` with a `paths:` frontmatter, so they load only when Claude touches that folder. Step-by-step procedures go in skills.
3. **Import one file only.** CLAUDE.md imports `@projects/now.md` (current focus, where I stopped, next step). Everything else is looked up when needed. Every import costs context every session.
4. **One topic per file.** Names are `lowercase-with-hyphens.md`. Folders have a `_template.md` to copy.
5. **Skills are grouped.** Claude Code only discovers top-level skill folders, so each group is one entry `SKILL.md` with a routing table that points to playbook files in the same folder. Only the entry description is always loaded.

## Memory
6. **If it matters, it goes in a file.** Instructions typed only in chat vanish after compaction.
7. **Every decision gets a reason.** `decisions.md`: date | decision | reason.
8. **Real numbers only.** Missing data is "unknown" or a question, never an estimate. If money is tracked, costs and revenue go in `ledger.md` with dates.
9. **Memory can be stale.** A note saying "X lives in Y" was true when written. Check that the file, folder or tool still exists before acting on it; fix or delete stale notes.
10. **Pitfalls become rules.** CLAUDE.md keeps a "Common pitfalls" list: `what broke -> the rule that prevents it`, marked `[seeded]` (known risk) or `[happened]` (really broke). Add one every time something breaks or Claude repeats a mistake.
11. **A sentence is not enforcement.** Anything that must never happen (leaking secrets, committing keys) needs a hook or a permission rule, not a line in CLAUDE.md.

## Working
12. **Plan before building or spending.** Before any prototype, purchase or paid API call: outline what, how, files, tools and cost, then wait for an explicit OK.
13. **Close every session.** At the end, the person pastes raw notes; Claude files them (notes, logs, decisions, costs, now.md). Next session starts with full context.
14. **Never invent.** No made-up results, metrics, quotes or causes. Look the file up and name it when answering.

## Safety
15. **Secrets live in environment variables only.** Never in files, drafts, screenshots or commits.
16. **Private stays private.** Personal notes go in `CLAUDE.local.md` (gitignored). If the project is public or pseudonymous, nothing identifying goes in public material.
