# Interview

Ask all of these in ONE message, numbered, with the default in brackets so the person can answer only what they care about.

1. **What is it?** The project or area, in one line. [required]
2. **What does success look like?** A goal, a deadline, or "ongoing". [ongoing, no deadline]
3. **What will you keep?** The 2-5 kinds of things you create, collect or track. Examples: features, clients, chapters, experiments, applications, recipes, papers, rooms, bugs. [ask again if empty; this is the shape]
4. **What do you do again and again?** Tasks you repeat, like "log a work session", "prep for a client call", "review a pull request", "turn a paper into notes", "write the monthly report". [only session close and a review]
5. **How often do you work on it, and how often do you want to step back and review?** Daily, weekly, monthly, or no fixed review. [a few sessions a week, review weekly]
6. **Who sees it?** Just you, a team, or the public (blog, social media, newsletter)? Under your own name or a pseudonym? [just me]
7. **Money?** Costs, budget or revenue to track? [no]
8. **Language and tone** for notes and drafts. [English, concise and plain]
9. **Hard rules.** Anything Claude must always or never do. [plan before building or spending; never invent data]
10. **Anything private** Claude should know but never put in shared files? (It goes in CLAUDE.local.md, which git ignores.) [nothing]

## From answers to shape

| Answer | Becomes |
|---|---|
| 1, 2 | CLAUDE.md "What this is" (one line plus goal). No dates if ongoing. |
| 3: each kind of thing | an **area**: a folder named in the person's words (plural, lowercase), with a `_template.md` for one item. If items of that kind have their own rules, add `.claude/rules/<area>.md` with `paths: ["<area>/**"]`. |
| 4: recurring tasks | **skill groups**. Group related tasks (2-4 per group) under one entry skill named after the activity: `clients`, `writing`, `code-review`. Each task becomes a playbook. Session close and the review always live in the core `rhythm` group, so do not duplicate them. |
| 5: review cadence | the `review` playbook in rhythm, and a `reviews/` folder named by period (2027-w03.md, 2027-03.md). None = drop reviews/ and the review playbook. |
| 6: team | "Always true": who else reads these files. Never put personal notes in shared files. |
| 6: public | the **publishing** module: `drafts/` plus `.claude/rules/publishing.md` with the channels and post format. |
| 6: pseudonym | Add to "Always true": never include the owner's name, face, employer, location or personal details in anything public. |
| 7: yes | the **money** module: `ledger.md`, plus cost lines in session close. |
| 8 | CLAUDE.md "Always true": language and tone. |
| 9 | CLAUDE.md "Always true", one line each. |
| 10 | CLAUDE.local.md only. Never repeat it anywhere else. |

Keep it small: 2-5 areas and 0-3 extra skill groups are enough to start. The brain grows through session close, not up front.
