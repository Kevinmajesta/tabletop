---
name: anti-slop
description: Use when designing or reviewing application UI, UX copy, or product implementation to avoid generic AI-looking output and unverified functionality.
---

# Anti-slop product craft

Inspired by [Hallmark](https://github.com/Nutlope/hallmark), adapted for this project's tabletop interface. This is an original, compact workflow rather than a copy of the upstream skill.

1. Start from the actual use case: a DM prepares the table, players join and move tokens, everyone sees the same state. Prioritize legibility at a glance during a session.
2. Choose a visual direction that fits a tabletop workspace: restrained typography, purposeful hierarchy, consistent spacing and contrast. Avoid generic gradients, gratuitous badges, decorative filler, and repeated identical cards.
3. Make every visible control perform the named action. Empty, loading, error, offline, and permission states must be understandable. Don't claim capabilities that aren't implemented.
4. Review layouts at desktop and narrow widths. Check long names, empty rooms, many tokens, and many chat messages.
5. Verify behavior with a build and focused real workflow checks (DM creates and uploads, player joins and uploads, both see movement and rolls). Report what was actually verified and what remains untested.
6. Before delivery, remove unused imports, dead controls, redundant copy, and unjustified complexity. Do not invent screenshots or test results.

If a reviewer subagent is used, the primary agent retains responsibility for changes and final verification; the reviewer returns a concrete defect list with file locations, severity, and reproduction steps, not generic praise.
