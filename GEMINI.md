# GEMINI STRICT WORKSPACE DIRECTIVES

> **CRITICAL DIRECTIVE**: You are working on the **Plan B Careers** codebase (`planbcareers.in`). You MUST strictly adhere to the following rules at all times.

---

## 🚨 RULE 1: MANDATORY "SKILL-FIRST" EXECUTION (STRICT & ALWAYS-ON)

**Before starting ANY task, feature, refactor, audit, copy change, visual redesign, or fix, you MUST:**

1. **FIRST SCAN INSTALLED SKILLS**: Check the `.agents/skills/` directory for any skill relevant to the task at hand:
   - **Frontend & UI/UX Design**: `.agents/skills/frontend-design`, `.agents/skills/ui-ux-pro-max`, `.agents/skills/design-system`, `.agents/skills/brand-guidelines`, `.agents/skills/canvas-design`
   - **Search & AI Visibility**: `.agents/skills/web-optimization` (SEO, GEO, AEO), `.agents/skills/ai-seo`, `.agents/skills/seo-audit`, `.agents/skills/programmatic-seo`, `.agents/skills/schema`
   - **Marketing & Content**: `.agents/skills/copywriting`, `.agents/skills/cro`, `.agents/skills/conversion-tracking`, `.agents/skills/analytics`, `.agents/skills/site-architecture`
   - **Execution & Engineering Rigor**: `.agents/skills/get-shit-done` (GSD planning, execution, verification, review), `.agents/skills/webapp-testing`
2. **READ THE SKILL BEFORE CODING**: Open and read the relevant `SKILL.md` and its associated `references/` or `scripts/` before modifying any project files.
3. **EXECUTE STRICTLY ACCORDING TO THE SKILL**: Follow the step-by-step methodologies, checklists, design token systems, and anti-pattern warnings specified in the skill. Do not improvise or bypass skill protocols.
4. **VERIFY AGAINST SKILL CRITERIA**: Before marking a task complete, verify your work against the validation rubrics prescribed by the skill (e.g., running `audit.py`, checking contrast & responsive behavior, verifying schema validity, checking build outputs).

---

## 🎨 RULE 2: DESIGN SYSTEM & STYLING INTEGRITY

- **Color Palette**: Plan B Corporate White Theme with Navy Blue (`#061D45` / `#1B3A7D`) and Amber Gold (`#D4920A` / `#E8A317`).
- **Tailwind Workflow**: Never edit compiled CSS directly. Always edit `css/input.css` and build with `npm run build` (`css/styles.css`).
- **White Theme Priority**: Respect `css/white-theme.css` rules. Keep surfaces clean, crisp, modern, and high-contrast.

---

## ⚡ RULE 3: ARCHITECTURE & ZERO-REGRESSION POLICY

- **Vercel Serverless Compatibility**: `server.js` and `api/index.js` must never depend on persistent local disk writes in production. Always preserve the read-only/memory fallbacks.
- **Verification**: Run `npm run build` after any styling changes and test endpoints or pages before deploying.
- **Clean Codebase**: Never leave scratch files, duplicate styles, or unapproved dependencies in the repository root.
