# nery-cano-portfolio — Claude session notes

This is **Nery Cano's personal portfolio site and blog**. Plain HTML/CSS, no framework, deployed via GitHub Pages at https://neryc.github.io/nery-cano-portfolio/.

## What's here

- `index.html` — the portfolio landing page (with the FAB widget embedded in the bottom-right corner)
- `blog/` — long-form blog posts, one per portfolio project, plus banners and the structure spec
- `CV_Nery_Cano_Senior_Engineer.pdf` — public CV (linked from the landing page)

## The blog

The blog covers four AI portfolio projects. Each post is a long-form, technically dense narrative — built/architecture/decisions + a structured postmortem + what-I'd-do-differently + a generalized pattern.

| Project | Blog post | Banner |
|---|---|---|
| 1 · Research Agent | `blog/research-agent.html` | `post_3_research_banner.png` |
| 2 · Multi-Agent Code Reviewer | `blog/multi-agent-code-reviewer.html` | `post_2_multiagent_banner.png` |
| 3 · RAG Agent with Memory | `blog/rag-agent-with-memory.html` | `post_1_rag_banner.png` |
| 4 · Talk to My Portfolio (MCP) | `blog/talk-to-my-portfolio.html` | `post_4_talk_banner.svg` + `.png` export |

**Canonical structure spec:** `blog/BLOG_STRUCTURE.md`. New posts and rewrites MUST follow it. The reference implementation is `blog/talk-to-my-portfolio.html` (the post the spec was derived from).

## Sibling repo — where the projects actually live

**Path:** `C:\Users\albert\Documents\Projects\Personal\agentProyect\`
**Project repos:** Each blog post here corresponds to an independent project in `agentProyect/projects/`:

| Blog post here | Project source there |
|---|---|
| `blog/research-agent.html` | `agentProyect/projects/research-agent/` → https://github.com/NeryC/research-agent |
| `blog/multi-agent-code-reviewer.html` | `agentProyect/projects/multi-agent-code-reviewer/` → https://github.com/NeryC/multi-agent-code-reviewer |
| `blog/rag-agent-with-memory.html` | `agentProyect/projects/rag-agent-memory/` → https://github.com/NeryC/rag-agent-memory |
| `blog/talk-to-my-portfolio.html` | `agentProyect/projects/talk-to-my-portfolio/` → https://github.com/NeryC/talk-to-my-portfolio |

**The blog posts include exact code snippets, error messages, version numbers, and architectural choices from the project repos.** If a project's stack or architecture changes, the corresponding blog post here usually needs the same edit — keep them honest.

The canonical status of the four projects (verified, deployed, what's missing) lives in `agentProyect/STATUS.md`.

## FAB widget on the landing page

The bottom-right floating chat button on `index.html` is the embeddable widget shipped by `agentProyect/projects/talk-to-my-portfolio/packages/widget/`. It's loaded as a single `<script>` tag (`widget.js`) served from the MCP server's Vercel deployment. The chat itself runs against the MCP server at `https://talk-to-my-portfolio.vercel.app/api/mcp`.

If the widget breaks on the live site, the source of truth is the talk-to-my-portfolio repo, not this one.

## When to edit what

- **Project code changed** → update the corresponding blog post in `blog/`. Most often: a tech-decisions section, a code snippet, or adding a new entry to the postmortem `bug-row` list.
- **New project shipped** → write a new post following `blog/BLOG_STRUCTURE.md`, add a banner (1200×630 SVG + 2400×1260 PNG retina export), update `index.html` and `blog/index.html` to link to it.
- **Structure spec changed** → rewrite the relevant posts. The spec is the contract; existing posts should conform to it (except the reference implementation, which defines it).

## Quick orientation for a cold start

If you're picking this up fresh, read in this order:

1. **`blog/BLOG_STRUCTURE.md`** — the canonical post format (HTML skeleton, sections, voice, components, checklist)
2. **`blog/talk-to-my-portfolio.html`** — the reference implementation of the structure
3. **`../agentProyect/STATUS.md`** — the source-of-truth project status
4. **`../agentProyect/CLAUDE.md`** — the agent-facing notes for the sibling repo

## Deployment

GitHub Pages, served from `main` branch root. A push to `main` triggers a rebuild within ~60 seconds. There's no build step — the HTML files are served as-is. This is intentional ("Shipped as plain HTML because it's 200ms faster," per the site footer).
