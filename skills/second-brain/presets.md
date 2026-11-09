# Presets (inspiration, not templates)

Starting shapes for common cases. Always rename to the person's own words, and drop what they do not need.

| Case | Areas | Extra skill groups (playbooks) | Modules |
|---|---|---|---|
| App or product | features/, users/ (interviews, feedback), experiments/ | build (work-log, ship-check) | money if paid services |
| Codebase | docs/brain/ (architecture.md, conventions.md), adr/ (decision records) | code (review-pr, debug-log, release) | none |
| Small business | products/, customers/, suppliers/, marketing/ | orders (new-order, restock-check), content (product-listing) | money, publishing |
| Freelance / clients | clients/ (one file per client), projects/, proposals/ | clients (call-prep, call-notes, proposal) | money |
| Research or thesis | papers/ (one per paper read), experiments/, chapters/ | research (paper-to-note, experiment-log), writing (chapter-draft) | none |
| Book or long writing | chapters/, characters/ or topics/, research/ | writing (session-log, revise-chapter) | publishing if serialised |
| Learning a skill | notes/ (one per concept or source), practice/, projects/ | learn (note-from-source, plan-next) | publishing if learning in public |
| Job search | companies/, applications/, interviews/ | jobs (tailor-cv, interview-prep, follow-up) | none |
| Content creator | ideas/, drafts/, published/, insights/ (creators studied) | content (idea-to-draft, repurpose, teardown) | publishing, money |
| Home, event or life project | rooms/ or tasks/, suppliers/, quotes/ | planning (compare-quotes, weekly-plan) | money |

## Codebase notes
- Put the brain next to the code without touching it: CLAUDE.md at the root, other brain files under `docs/brain/` instead of top-level folders.
- CLAUDE.md "Where things live" lists the real code layout in a few lines (src/, tests/, scripts/), plus build, test and lint commands.
- Folder rules use the code paths: `.claude/rules/api.md` with `paths: ["src/api/**"]`.
- projects/now.md becomes docs/brain/now.md and is imported from there.
