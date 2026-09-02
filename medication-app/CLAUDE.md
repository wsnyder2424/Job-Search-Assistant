# Medication app — Claude Code instructions

Read `design.md` in full before any UI, product, or data-model work. It is the source of truth for what this product is, the words it uses, its visual tokens, and the decisions already made.

Rules:
- Use the vocabulary in design.md §3 exactly (Rx, Round, Dose screen, Guest, Given, Not given…). Do not invent synonyms.
- Do not reopen anything in §8 (Closed decisions) or resurrect anything in §9 (Graveyard).
- The "Open conflicts to resolve before building" section at the end of design.md lists decisions that are deliberately unresolved. Ask Whitney about them before building anything that depends on them. Do not pick a default silently.
- Anything marked _TODO_ in design.md: ask, don't guess.
- All UI text is sentence case (design.md §7). Never Title Case, never all caps.
- Design tokens come from the Figma file named in §5. Reference tokens by name in code.
- Visual references live in `references/` and `design inspo/`. §12 explains what to take and what to avoid; match the attribute, not the screenshot.

Whitney is a senior product designer and a solo builder with no backend experience (§10). Explain backend and infrastructure choices in plain language and prefer the boring, managed option.
