# Templates

`dot-claude/` becomes `.claude/` and `gitignore` becomes `.gitignore`. They are stored without the dot so Claude Code does not load them as real rules and skills while they sit inside this kit.

## core/ (every brain)
| Template | Becomes |
|---|---|
| CLAUDE.md | CLAUDE.md (150 lines max) |
| CLAUDE.local.md | CLAUDE.local.md (private, gitignored) |
| README-HOW-TO-USE.md | README-HOW-TO-USE.md (for the person, not for Claude) |
| projects/now.md | projects/now.md |
| decisions.md | decisions.md |
| gitignore | .gitignore |
| dot-claude/skills/rhythm/ | .claude/skills/rhythm/ (session-close + review; drop review.md and its row if there is no review) |

## modules/ (pick from the interview)
| Module | Becomes | Use when |
|---|---|---|
| area/_template.md | `<area>/_template.md`, one per area | always: one per kind of thing they keep |
| area/rules.md | `.claude/rules/<area>.md` | the area has its own rules |
| skill-group/SKILL.md | `.claude/skills/<group>/SKILL.md` | for each group of recurring tasks |
| skill-group/playbook.md | `.claude/skills/<group>/<task>.md` | for each recurring task |
| money/ledger.md | ledger.md | money = yes |
| publishing/rules.md | .claude/rules/publishing.md | public |
| publishing/drafts-README.md | drafts/README.md | public |

## Filling CLAUDE.md
- `{{GOAL_LINE}}`: "Goal: ... by <date>." or "Ongoing." Leave out dates for ongoing work.
- `{{AREAS_MAP}}`: one line per area, plus ledger.md, drafts/ and reviews/ if used, e.g. `- clients/: one file per client: contact, history, open work`.
- `{{SKILLS_MAP}}`: one line per extra group, e.g. `- clients: call-prep, call-notes, proposal`.
- `{{ALWAYS_TRUE}}`: hard rules from the interview, one line each. Delete the placeholder line if there are none.

Every `{{...}}` must be replaced, or its line deleted.
