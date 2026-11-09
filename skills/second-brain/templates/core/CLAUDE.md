# {{PROJECT_NAME}}: second brain map
<!-- Keep under 150 lines. Rules for one folder go in .claude/rules/, procedures go in .claude/skills/. -->

## What this is
{{ONE_LINE}}
{{GOAL_LINE}}

## Where things live
- projects/now.md: current focus, where I stopped, next step (always loaded)
- decisions.md: every choice, with the reason
{{AREAS_MAP}}

## Always true
- Language: {{LANGUAGE}}. Tone: {{TONE}}.
- Plan before building or spending: outline what, how, files, tools and cost, then wait for my OK.
- Secrets only in environment variables. Never in files, drafts, screenshots or commits.
- Private notes go in CLAUDE.local.md, never in shared files.
{{ALWAYS_TRUE}}

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
- [seeded] A rule I only typed in chat vanished after compaction -> write every rule that matters in a file.
- [seeded] CLAUDE.md grew too long and was followed less -> keep it under 150 lines; move folder rules to .claude/rules/, procedures to skills.
- [seeded] A "never do X" written here was ignored -> anything critical needs a hook or permission rule, not a sentence.
- [seeded] Two files contradicted each other -> keep one source of truth; ask for a second-brain audit.
- [seeded] A key ended up in a file or screenshot -> keys only in environment variables.
- [seeded] A number appeared that I never gave -> missing data is "unknown" or a question.

## Skills
- rhythm: session-close, review
{{SKILLS_MAP}}
Each group is an entry SKILL.md that routes to its playbooks. Claude Code only discovers top-level skill folders.

## Naming
- lowercase-with-hyphens.md, one topic per file. Copy the folder's _template.md.

## Always in focus
- @projects/now.md
