---
name: second-brain
description: Set up, audit or open the viewer of a Claude Code "second brain" for any project or area of life - an app, a codebase, a business, research, a book, a job search, a course, a home renovation. Creates a short CLAUDE.md map (150 lines max), a focus file, a decision log, folder rules and grouped skills shaped around the person's own work, so Claude never needs the project re-explained. Use when the user asks to create, start, scaffold or set up a second brain, project memory or CLAUDE.md, or to check/audit/clean up an existing one, or to open, show, view or visualize their second brain (the interactive viewer).
---
# Second brain

Three modes. Pick from the request; if unclear, ask.

| If the user wants to... | Do |
|---|---|
| Create a second brain (new or existing folder) | "Create" below |
| Check, audit or clean up an existing one | "Audit" below |
| Open, show, view or visualize it; stop the viewer | "View" below |

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
   - then ask: "Want to see it? I can open the interactive viewer." If yes, do "View".

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

## View

The viewer is an interactive map of the brain that updates by itself when files change. It ships prebuilt in this kit: no install, only Node.js (18+).

1. Find the launcher: `viewer/scripts/open.mjs`, two folders up from this skill's base directory (`<skill dir>/../../viewer/scripts/open.mjs`). If it is not there (the skill was copied without the rest of the kit), say so and point to https://github.com/owlinthebarnai/second-brain-kit.
2. Brain folder: the folder with the brain's CLAUDE.md, usually the current directory. If the current directory has no CLAUDE.md, ask which folder.
3. Run: `node "<launcher>" "<brain folder>"`. It starts the viewer in the background (or reuses one already showing this brain), opens the browser, and prints the URL. It keeps running after the session ends.
4. If `node` is not found, tell the user to install Node.js 18+ from nodejs.org, then try again.
5. Reply in 3 lines: the URL, "it updates by itself as the brain changes", and how to stop it: "say 'stop the viewer'".
6. To stop: run the launcher with `--stop "<brain folder>"`.
7. Only if the user asks for it to start at login: explain the per-OS option (Windows scheduled task, macOS launchd, Linux systemd user service) running the same command, and set it up after they say OK.
