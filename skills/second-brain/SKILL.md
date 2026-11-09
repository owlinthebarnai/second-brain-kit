---
name: second-brain
description: Set up or audit a Claude Code "second brain" for any project or area of life - an app, a codebase, a business, research, a book, a job search, a course, a home renovation. Creates a short CLAUDE.md map (150 lines max), a focus file, a decision log, folder rules and grouped skills shaped around the person's own work, so Claude never needs the project re-explained. Use when the user asks to create, start, scaffold or set up a second brain, project memory or CLAUDE.md, or to check/audit/clean up an existing one.
---
# Second brain

Two modes. Pick from the request; if unclear, ask.

| If the user wants to... | Do |
|---|---|
| Create a second brain (new or existing folder) | "Create" below |
| Check, audit or clean up an existing one | "Audit" below |

Before anything else, read principles.md in this folder. Every file you write must follow it.

A second brain has a fixed **core** and a **shape** that comes from the person's work. Never force a shape: no weeks, builds, posts or learning notes unless the answers call for them.

## Create

1. **Where.** Ask for the target folder (default: current directory). List what is already there. Never overwrite an existing file: merge into it or skip it, and say which. If it is a code repository, the brain goes in its root and must not disturb the code (see presets.md, "Codebase").
2. **Interview.** Read interview.md and ask its questions in ONE message. Accept short or messy answers. Use the defaults for anything skipped; never invent facts about the person or the project.
3. **Design the shape** from the answers (interview.md, "From answers to shape"). presets.md has starting points for common cases; use one only as inspiration and rename everything to the person's own words.
4. **Plan, then wait.** Show:
   - the file tree
   - each area folder and what one file in it is
   - each skill group, its playbooks, and the phrase that triggers each one
   - the "Always true" rules you will write
   - the modules left out, and why
   Then stop and wait for an explicit OK. Do not write files before that.
5. **Write the files.**
   - Copy everything in templates/core/.
   - For each area, use templates/modules/area/ (a folder _template.md, plus a rules file if the area has its own rules).
   - For each skill group, use templates/modules/skill-group/.
   - Add money/ and publishing/ only if chosen.
   - `dot-claude/` becomes `.claude/` and `gitignore` becomes `.gitignore`.
   - Replace every `{{...}}` placeholder. If a value is unknown, write "unknown" or ask. Delete lines that do not apply.
6. **Check** before reporting done:
   - CLAUDE.md is 150 lines or fewer (count them). If it is longer, move folder rules into .claude/rules/ and procedures into skills.
   - CLAUDE.md imports only projects/now.md (`@projects/now.md`).
   - Every area and skill group listed in CLAUDE.md exists, and every existing one is listed.
   - Every skill entry SKILL.md has a routing table, and every playbook it names exists.
   - No `{{` is left in any file. No API keys, tokens or passwords anywhere.
   - .gitignore contains CLAUDE.local.md and .env*.
7. **Optional git.** Offer `git init` and a private repo. Never push without asking. Never commit CLAUDE.local.md.
8. **Hand over** in under 10 lines:
   - what was created
   - how to start a session: "Read projects/now.md and tell me where I stopped"
   - how to close one: "close this session" + raw notes
   - that README-HOW-TO-USE.md has the full loop
   - that the Second Brain Kit viewer can show the brain as a map

## Audit

1. Read CLAUDE.md, projects/now.md, and everything in .claude/rules/ and .claude/skills/.
2. Report as a checklist, marking each item pass / fail / warn:
   - CLAUDE.md line count (fail over 150), and whether it is a map or a manual
   - imports other than projects/now.md (warn: they load every session)
   - rules or facts that contradict each other across files (quote both)
   - "X lives in Y" notes where Y no longer exists (stale memory)
   - folders that exist but are missing from the CLAUDE.md map, and the reverse
   - skill entry files whose playbooks are missing
   - secrets or keys in any file (fail, and do not repeat the secret in the report)
   - a "Common pitfalls" section in the format `what broke -> rule`
3. Propose fixes. Apply them only after the user says which.
