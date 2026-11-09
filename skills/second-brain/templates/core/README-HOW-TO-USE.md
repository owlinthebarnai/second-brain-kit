# How to use this second brain (for you, not for Claude)

## Check it loads
Open Claude Code in this folder and run /context. CLAUDE.md must appear under memory files.

## The loop
- START: "Read projects/now.md and tell me where I stopped."
- DURING: do the work. Keep rough notes anywhere: bullets, voice dictation, screenshots.
- END (2 min): "Close this session" + paste your raw notes. Claude files everything.
- {{REVIEW_LINE}}

## Skills: say it in plain words
| Group | Playbooks | Say something like |
|---|---|---|
| rhythm | session-close, review | "Close this session" + notes / "Do the review" |
{{SKILLS_TABLE}}

You can also type the group name as a slash command, like /rhythm.

## Rules of thumb
- If it matters, it goes in a file. Chat instructions vanish after compaction.
- Never put API keys in any file.
- CLAUDE.md stays under 150 lines. Rules for one folder go in .claude/rules/.
- When something breaks or Claude repeats a mistake, it goes into "Common pitfalls" in CLAUDE.md: what broke -> rule. Session close does this for you.
- Every few weeks: run /memory to review what Claude saved, and ask for a "second-brain audit" to catch contradictions and stale notes.
