# GitHub Agentic Workflows — A Beginner's Complete Guide

> **Use case covered:** A PR Code Reviewer that automatically reads every pull request and posts a comment flagging logic bugs.
>
> **Repo type:** An existing app repo (React + TypeScript, but the steps apply to any language).
>
> **Assumed knowledge:** Basic familiarity with git and GitHub (clone, commit, push, pull request). Everything else is explained from scratch.

---

## Table of Contents

1. [What is GitHub Agentic Workflows?](#1-what-is-github-agentic-workflows)
2. [Key Concepts Glossary](#2-key-concepts-glossary)
3. [How it All Fits Together](#3-how-it-all-fits-together)
4. [Prerequisites](#4-prerequisites)
5. [Step 1 — Initialize the Repo for gh-aw](#step-1--initialize-the-repo-for-gh-aw)
6. [Step 2 — Create a Fine-Grained PAT](#step-2--create-a-fine-grained-pat)
7. [Step 3 — Store the PAT as a GitHub Actions Secret](#step-3--store-the-pat-as-a-github-actions-secret)
8. [Step 4 — Write the Agentic Workflow](#step-4--write-the-agentic-workflow)
9. [Step 5 — Compile the Workflow](#step-5--compile-the-workflow)
10. [Step 6 — Commit and Push](#step-6--commit-and-push)
11. [Step 7 — Merge to Main so the Workflow is Active](#step-7--merge-to-main-so-the-workflow-is-active)
12. [Step 8 — Open a PR to Trigger the Reviewer](#step-8--open-a-pr-to-trigger-the-reviewer)
13. [Step 9 — Monitor the Run](#step-9--monitor-the-run)
14. [Step 10 — Read the AI's Review Comment](#step-10--read-the-ais-review-comment)
15. [Troubleshooting Common Errors](#15-troubleshooting-common-errors)
16. [What to Learn Next](#16-what-to-learn-next)

---

## 1. What is GitHub Agentic Workflows?

### Traditional GitHub Actions (what you may already know)

GitHub Actions is a CI/CD system built into GitHub. You write a YAML file describing a sequence of steps — install dependencies, run tests, deploy — and GitHub runs those steps on a cloud machine whenever something happens (a push, a pull request, a schedule, etc.).

The key word is **deterministic**: you write exactly what should happen, step by step. The computer follows your instructions literally.

### Agentic Workflows — adding AI to the picture

**GitHub Agentic Workflows** (`gh-aw`) is an extension on top of GitHub Actions that replaces some of those rigid steps with an **AI agent**.

Instead of writing:
```
step 1: run eslint
step 2: if exit code != 0, post a comment
step 3: format the comment like this...
```

You write in plain English:
> "Review the pull request diff for logic bugs. If you find one, post a comment explaining what is wrong and showing the fix."

The AI agent reads your instructions, looks at the PR diff, thinks about it, and posts the comment — just like a human code reviewer would.

### Why is this powerful?

- **No brittle scripting** — you describe the goal, not every step to achieve it
- **Context-aware** — the agent can read code, understand intent, and reason about correctness
- **Composable** — you can mix AI steps with traditional CI steps in one workflow
- **Auditable** — every action the agent takes is logged and sandboxed

### What `gh-aw` is technically

`gh-aw` is a **GitHub CLI extension** — a plugin for the `gh` command line tool. It gives you commands like:

| Command | What it does |
|---|---|
| `gh aw init` | Set up a repo for agentic workflows |
| `gh aw new <name>` | Scaffold a new workflow Markdown file |
| `gh aw compile` | Compile `.md` → `.lock.yml` for GitHub Actions |
| `gh aw run <name>` | Manually trigger a workflow |
| `gh aw audit <run-id>` | Deep-inspect a past run's agent logs |
| `gh aw list` | List all agentic workflows in the repo |
| `gh aw status` | Show enabled/disabled status of each workflow |

---

## 2. Key Concepts Glossary

Before diving into steps, here are the terms you'll encounter and what they mean.

### Engine
The AI model that powers the agent. The default is **GitHub Copilot CLI**. Other options include Anthropic (Claude) and OpenAI (GPT). The engine reads your instructions and decides what to do.

### MCP (Model Context Protocol)
A standardized protocol that lets the AI agent call external tools — like the GitHub API. Think of it as the agent's "hands". Without MCP, the agent can think but can't act. With MCP, it can read PR diffs, post comments, create issues, etc.

### Safe Outputs
A security layer that controls **what the AI is allowed to do**. You declare upfront what write operations are permitted (e.g., "allowed to add 1 comment"). The agent cannot do anything outside this list — it cannot delete branches, merge PRs, or push code unless you explicitly allow it.

### Activation
The first job that runs when the workflow triggers. It validates your secrets, compiles the prompt from your Markdown instructions, and passes everything to the agent job.

### Firewall
Every agentic workflow runs inside a **network sandbox**. The agent container can only reach whitelisted domains (like `api.githubcopilot.com` and `api.github.com`). It cannot make arbitrary internet requests. This prevents prompt injection attacks from malicious PRs.

### `.lock.yml`
The compiled GitHub Actions YAML file generated from your Markdown workflow. This is what GitHub Actions actually runs. You never edit it manually — always edit the `.md` source and re-run `gh aw compile`.

### `COPILOT_GITHUB_TOKEN`
A fine-grained Personal Access Token (PAT) stored as a GitHub Actions Secret. The agent uses it to authenticate with the Copilot API and to call the GitHub API (e.g., post a comment). It must be a PAT — not an OAuth token.

---

## 3. How it All Fits Together

Here is the complete flow from opening a PR to seeing the AI's review comment:

```
You open a Pull Request on GitHub
         │
         ▼
GitHub sees: pull_request event (type: opened)
         │
         ▼
GitHub Actions starts the PR Code Reviewer workflow
         │
         ├── Job 1: pre_activation
         │     └─ Checks team membership / access rules
         │
         ├── Job 2: activation
         │     ├─ Validates COPILOT_GITHUB_TOKEN secret
         │     ├─ Reads your pr-reviewer.md instructions
         │     ├─ Builds the full prompt (instructions + repo context)
         │     └─ Uploads the prompt as an artifact for the agent
         │
         ├── Job 3: agent
         │     ├─ Spins up a sandboxed Docker container
         │     ├─ Starts the GitHub Copilot CLI inside the container
         │     ├─ Copilot reads the prompt
         │     ├─ Copilot calls MCP tools: fetches PR diff via GitHub API
         │     ├─ Copilot analyzes the diff for bugs
         │     ├─ Copilot calls safe-output tool: add_comment with its finding
         │     └─ Outputs saved to safe-output-items.jsonl
         │
         ├── Job 4: safe_outputs
         │     └─ Reads safe-output-items.jsonl
         │     └─ Makes the actual GitHub API call to post the comment
         │         (the agent itself never touches GitHub directly — only
         │          safe_outputs does, with validated, sanitized content)
         │
         └── Job 5: conclusion
               └─ Marks the workflow run as success or failure
                  Posts a summary to the GitHub Actions UI

         ▼
You see a comment on PR #7 from github-actions[bot]
```

The key insight: **the agent proposes actions, safe_outputs executes them**. This two-step design means even if the AI were somehow manipulated, it could only do what you pre-approved in `safe-outputs`.

---

## 4. Prerequisites

Before starting, make sure you have:

### A GitHub account with Copilot access
The default engine is GitHub Copilot. You need a Copilot subscription (individual, business, or enterprise). Verify at: https://github.com/settings/copilot

### The `gh` CLI installed and authenticated
```bash
# Check if installed
gh --version

# If not installed: https://cli.github.com/
# Then authenticate:
gh auth login
```

### The `gh-aw` extension installed
```bash
# Install
gh extension install github/gh-aw

# Verify
gh aw --version
# Should print: gh aw  github/gh-aw  v0.x.x
```

### An existing repo with code
This guide assumes you have a repo with some source code (in our case, a React TypeScript app). The agentic workflow will review PRs against that code.

---

## Step 1 — Initialize the Repo for gh-aw

Navigate to your repo and run:

```bash
cd /path/to/your-repo
gh aw init
```

### What this does

`gh aw init` creates the scaffolding that GitHub needs to run agentic workflows. Specifically, it creates:

**`.github/workflows/copilot-setup-steps.yml`**

This is a special GitHub Actions workflow file that GitHub Copilot Agent looks for to understand how to set up the environment. It installs the `gh-aw` CLI on the Actions runner so agentic workflows can run.

Here is what ours looks like:

```yaml
name: "Copilot Setup Steps"

on:
  workflow_dispatch:
  push:
    paths:
      - .github/workflows/copilot-setup-steps.yml

jobs:
  copilot-setup-steps:          # ← Job name MUST be exactly this
    runs-on: ubuntu-latest
    permissions:
      contents: read
    steps:
      - name: Checkout repository
        uses: actions/checkout@v6
      - name: Install gh-aw extension
        uses: github/gh-aw/actions/setup-cli@<sha>
        with:
          version: v0.57.0
```

> **Important:** The job name must be `copilot-setup-steps` exactly — GitHub Copilot Agent looks for this specific name.

### Commit and push this file

```bash
git add .github/workflows/copilot-setup-steps.yml
git commit -m "chore: initialize repo for gh-aw"
git push
```

---

## Step 2 — Create a Fine-Grained PAT

### What is a PAT?

A **Personal Access Token (PAT)** is a credential you generate on GitHub that acts like a password, but scoped to specific permissions. Instead of your full GitHub password, you give the workflow a token that can only do what you explicitly allow.

There are two kinds:
- **Classic PAT** (`ghp_...`) — broad permissions, not recommended for this
- **Fine-grained PAT** (`github_pat_...`) — scoped to specific repos and permissions ✅

### Why do we need one?

The agentic workflow runs on GitHub's cloud servers (GitHub Actions). When it runs, it needs to:
1. Authenticate with the **Copilot API** to run the AI model
2. Authenticate with the **GitHub API** to read the PR diff and post a comment

The `COPILOT_GITHUB_TOKEN` secret is what provides these credentials. It must be a fine-grained PAT — GitHub rejects OAuth tokens (`gho_...`) for Copilot API calls.

### Why NOT commit it in your code?

A PAT is a secret credential. If you commit it in your repo:
- Anyone who can read your repo can steal it
- They can impersonate you on GitHub
- GitHub will automatically revoke it (it scans for leaked tokens)

Instead, you store it as a **GitHub Actions Secret** (see Step 3). Your workflow file only references the secret's *name*, never its value.

### Step-by-step: Create the PAT

1. Go to: **https://github.com/settings/personal-access-tokens/new**

2. Fill in the form:

   | Field | Value |
   |---|---|
   | **Token name** | `gh-aw-practice` (or any descriptive name) |
   | **Expiration** | 30 days (you can renew later) |
   | **Resource owner** | Your username |
   | **Repository access** | Only selected repositories → choose your repo |

3. Under **Repository permissions**, set:

   | Permission | Access |
   |---|---|
   | Contents | Read-only |
   | Issues | Read-only |
   | Metadata | Read-only (auto-selected, required) |
   | Pull requests | Read and write |

4. Under **Account permissions** (scroll down past Repository permissions), set:

   | Permission | Access |
   |---|---|
   | **GitHub Copilot** (or "Copilot Requests") | Read-only |

   > ⚠️ This is the most commonly missed permission. Without it, the agent fails with `Authentication failed — ensure PAT has Copilot Requests permission`.

5. Click **Generate token**

6. **Copy the token immediately** — GitHub will only show it once. It starts with `github_pat_`.

---

## Step 3 — Store the PAT as a GitHub Actions Secret

### What is a GitHub Actions Secret?

GitHub Actions Secrets are encrypted key-value pairs stored by GitHub. When a workflow runs, GitHub injects the secret as an environment variable inside the runner. The value is:
- Encrypted at rest
- Never shown in logs (masked as `***`)
- Only accessible to jobs in the same repo

### Store the token

Run this command in your terminal:

```bash
gh secret set COPILOT_GITHUB_TOKEN --repo owner/your-repo
```

It will prompt:
```
? Paste your secret:
```

Paste your `github_pat_...` token and press Enter. You won't see the characters — that's normal.

### Verify it was set

```bash
gh secret list --repo owner/your-repo
```

You should see `COPILOT_GITHUB_TOKEN` in the list (the value is never shown).

### The full flow

```
Your terminal
    │  gh secret set COPILOT_GITHUB_TOKEN
    ▼
GitHub encrypts and stores it in repo Settings → Secrets
    │
    ▼
When a workflow runs on GitHub Actions:
    │  GitHub injects it as $COPILOT_GITHUB_TOKEN environment variable
    ▼
The agent uses it to call Copilot API and GitHub API
    │  Value is masked as *** in all logs
    ▼
Your token is never exposed
```

---

## Step 4 — Write the Agentic Workflow

### Scaffold the file

```bash
gh aw new pr-reviewer
```

This creates `.github/workflows/pr-reviewer.md` with a template. Open it in your editor.

### Anatomy of the workflow file

An agentic workflow file is a **Markdown file with YAML frontmatter**. It has two parts separated by `---` markers:

```
---
[YAML frontmatter — configuration]
---

[Markdown body — natural language instructions for the AI]
```

### The YAML frontmatter

Here is the complete frontmatter for our PR reviewer, with every field explained:

```yaml
---
# TRIGGERS: when should this workflow run?
on:
  pull_request:
    types: [opened, synchronize]
  # "opened"      = fires when a new PR is created
  # "synchronize" = fires when new commits are pushed to an existing PR

# PERMISSIONS: what GitHub resources can this workflow READ?
# (Write operations are handled separately by safe-outputs)
permissions:
  contents: read        # can read the repo's files
  pull-requests: read   # can read PR details and diffs

# TOOLS: which GitHub API toolsets does the agent get access to?
tools:
  github:
    toolsets: [context, pull_requests]
    # "context"       = basic repo info, current user, etc.
    # "pull_requests" = list PRs, read diffs, read review comments

# NETWORK: what internet access does the agent container have?
network: defaults
# "defaults" = standard allowed domains (GitHub API, Copilot API)
# You can add extra domains if needed, e.g., network: [defaults, "api.example.com"]

# SAFE-OUTPUTS: what WRITE operations is the agent allowed to do?
safe-outputs:
  add-comment:
    max: 1    # the agent may add AT MOST 1 comment per run
  # Other available outputs (uncomment to enable):
  # add-labels:          # add labels to issues/PRs
  # create-issue:        # create new issues
  # push-to-pull-request-branch:  # push code changes to the PR branch
  # create-pull-request:          # open a new PR
---
```

### The Markdown body (instructions)

After the second `---`, write natural language instructions for the AI. Be specific and give examples. Here is the complete body for our PR reviewer:

```markdown
# PR Code Reviewer

You are a code reviewer. When a pull request is opened or updated, review the
changed files for logic bugs and leave a single, clear review comment on the PR.

## Instructions

1. Fetch the pull request diff to see all changed files and lines.
2. Analyze the changes for logic bugs — pay close attention to:
   - Filter/comparison operators (`===` vs `!==`, `>` vs `<`, etc.) that may
     have the wrong sign
   - Off-by-one errors
   - State mutations that should be immutable
   - Any code that does the opposite of what its function name implies
3. If you find a bug, post a comment on the PR that:
   - Quotes the exact buggy line
   - Explains clearly why it is wrong
   - Shows the corrected version
4. If no bugs are found, post a short comment saying the code looks good.

## Example

If you see:
\`\`\`ts
setTasks(tasks.filter(t => t.id === id))
\`\`\`
inside a `deleteTask` function, flag it — filtering to keep only the matching id
keeps that task instead of removing it. The correct operator is `!==`.
```

### Tips for writing good instructions

- **Be explicit about the output format** — tell the agent exactly what to post
- **Give concrete examples** — the AI responds better to "if you see X, do Y" than vague guidance
- **One responsibility per workflow** — don't ask the reviewer to also triage issues and update docs; split those into separate workflows
- **Use numbered steps** — the agent follows structured instructions more reliably than prose

---

## Step 5 — Compile the Workflow

The `.md` file is the *source of truth*, but GitHub Actions needs a `.yml` file to run. The compile step generates it:

```bash
gh aw compile
```

### What this does

- Reads every `.md` file in `.github/workflows/` that has `gh-aw` frontmatter
- Generates a corresponding `.lock.yml` file (e.g., `pr-reviewer.lock.yml`)
- The `.lock.yml` contains the full GitHub Actions job definitions, container setup, firewall rules, MCP configuration, and safe-outputs validation

### What the `.lock.yml` looks like

The generated file is large (~1000+ lines). It contains:
- `pre_activation` job: team membership check
- `activation` job: secret validation, prompt compilation
- `agent` job: Docker container setup, firewall, Copilot CLI execution
- `safe_outputs` job: reads agent output, makes GitHub API calls
- `conclusion` job: summarizes the run

**Never edit `.lock.yml` manually.** If you change your instructions in `.md`, run `gh aw compile` again to regenerate it.

### Validate without compiling

```bash
gh aw validate
```

This checks your frontmatter for errors without generating files — useful for a quick sanity check.

---

## Step 6 — Commit and Push

You must commit **both** files:

```bash
git add .github/workflows/pr-reviewer.md
git add .github/workflows/pr-reviewer.lock.yml
git commit -m "feat: add PR reviewer agentic workflow"
git push -u origin feature/pr-reviewer-workflow
```

> ⚠️ If you only commit the `.md` and forget the `.lock.yml`, the workflow will not appear in GitHub Actions.

> ⚠️ Push to a **feature branch** first, not directly to `main`. The workflow will only be active on `main` once you merge it there (Step 7).

---

## Step 7 — Merge to Main so the Workflow is Active

The `pull_request` trigger only fires on PRs targeting `main`. For the reviewer to work on future PRs, it must exist on `main`.

Create and merge a PR for your workflow branch:

```bash
# Create a PR
gh pr create \
  --title "feat: add PR reviewer agentic workflow" \
  --body "Adds an agentic workflow that reviews PRs for logic bugs." \
  --base main

# Merge it (once CI passes)
gh pr merge --squash --auto
```

After merging, verify the workflow is active:

```bash
gh aw list
# Should show: pr-reviewer   enabled
```

---

## Step 8 — Open a PR to Trigger the Reviewer

Now create a branch with a code change and open a PR. The reviewer will trigger automatically.

```bash
# Create a branch
git checkout main && git pull origin main
git checkout -b feature/my-change

# Make a code change (edit any file)
# ...

# Commit and push
git add .
git commit -m "feat: my change"
git push -u origin feature/my-change

# Open the PR
gh pr create --title "feat: my change" --body "Description of the change." --base main
```

At this point, GitHub fires the `pull_request: opened` event. The `PR Code Reviewer` workflow starts automatically on GitHub Actions.

---

## Step 9 — Monitor the Run

### See all recent runs

```bash
gh run list --limit 5
```

Output:
```
STATUS  TITLE             WORKFLOW          BRANCH          EVENT         ID
*       feat: my change   PR Code Reviewer  feature/my-...  pull_request  23085605800
*       feat: my change   CI                feature/my-...  pull_request  23085605797
```

`*` means in progress. `✓` means success. `X` means failure.

### Watch a run live

```bash
gh run watch 23085605800
```

This streams job status in real time. You'll see the jobs appear one by one:
- `pre_activation` ✓
- `activation` ✓
- `agent` ⏳ (this is where the AI is working — takes ~1-2 min)
- `safe_outputs` ✓
- `conclusion` ✓

### View the job breakdown

```bash
gh run view 23085605800
```

Shows each job and each step inside it with pass/fail status.

### Deep-debug with audit

```bash
gh aw audit 23085605800
```

This is the most powerful debugging tool. It:
- Downloads the agent's stdio logs locally
- Shows firewall activity (which domains were called)
- Summarizes errors with recommendations
- Saves logs to `.github/aw/logs/run-<id>/`

After running `audit`, you can read the raw agent log:

```bash
cat .github/aw/logs/run-23085605800/agent-stdio.log
```

This shows exactly what the Copilot CLI printed, including any authentication errors.

---

## Step 10 — Read the AI's Review Comment

### On GitHub

Open your PR on GitHub (e.g., `https://github.com/owner/repo/pull/7`). Scroll to the comments section. You should see a comment from `github-actions[bot]`.

### Via the CLI

```bash
gh pr view 7 --comments
```

Example output from our session:
```
github-actions[bot] • just now

## Code Review

The new `markAllDone` function added in this PR looks correct ✅

However, I spotted a pre-existing logic bug in `deleteTask`:

**Buggy line:**
  setTasks(tasks.filter(t => t.id === id))

**Why it's wrong:** `filter` keeps elements where the predicate is true.
Using `t.id === id` keeps only the matching task — the opposite of deleting it.

**Corrected version:**
  setTasks(tasks.filter(t => t.id !== id))
```

🎉 That's the full loop working end-to-end.

---

## 15. Troubleshooting Common Errors

### ❌ `COPILOT_GITHUB_TOKEN is an OAuth token (gho_...)`

**What it means:** You set the secret using your `gh auth token` output, which is an OAuth token — GitHub rejects these for Copilot API calls.

**Fix:** Create a fine-grained PAT (`github_pat_...`) at https://github.com/settings/personal-access-tokens/new and re-set the secret:
```bash
gh secret set COPILOT_GITHUB_TOKEN --repo owner/repo
```

---

### ❌ `Authentication failed — ensure PAT has Copilot Requests permission`

**What it means:** Your fine-grained PAT exists but is missing the Copilot permission.

**Fix:**
1. Go to https://github.com/settings/personal-access-tokens
2. Edit your PAT
3. Under **Account permissions** (not Repository permissions), find **GitHub Copilot** → set to **Read-only**
4. Save and re-set the secret

---

### ❌ `No workflow files found` (from `gh aw list`)

**What it means:** Either no `.md` files exist in `.github/workflows/`, or they haven't been compiled.

**Fix:**
```bash
gh aw new pr-reviewer          # create the .md file
# edit it...
gh aw compile                  # generate the .lock.yml
git add .github/workflows/pr-reviewer.md .github/workflows/pr-reviewer.lock.yml
git commit -m "feat: add pr reviewer"
git push
```

---

### ❌ `workflow 'pr-reviewer' cannot be run — must have workflow_dispatch trigger`

**What it means:** You tried `gh aw run pr-reviewer` but the workflow only has a `pull_request` trigger, so it can't be manually triggered.

**Fix — Option A:** Add `workflow_dispatch` to your triggers during development:
```yaml
on:
  workflow_dispatch:
  pull_request:
    types: [opened, synchronize]
```

**Fix — Option B:** Re-run a previous failed run instead:
```bash
gh run rerun <run-id>
```

---

### ❌ `agent` job fails, `safe_outputs` shows no items, no comment posted

**What it means:** The agent ran but produced no output — it may have crashed silently.

**Fix:** Run `gh aw audit <run-id>` and read `.github/aw/logs/run-<id>/agent-stdio.log`. Look for the actual error message near the bottom of the file. Common causes:
- Authentication error (see above)
- The AI couldn't find the PR (check that `pull_requests` is in `tools.github.toolsets`)
- The prompt was empty or malformed

---

### ❌ `copilot-setup-steps.yml` uses `actions/checkout@v6` — version not found

**What it means:** The checkout action version doesn't exist.

**Fix:** Use a pinned version like `actions/checkout@v4`:
```yaml
- uses: actions/checkout@v4
```

---

## 16. What to Learn Next

### More `safe-outputs`

Your reviewer currently only posts comments. You can extend it to also label PRs:

```yaml
safe-outputs:
  add-comment:
    max: 1
  add-labels:         # also allow adding labels
```

Then in your instructions: "If you find a bug, also add the label `needs-fix`."

### More triggers

| Trigger | Use case |
|---|---|
| `issues: [opened]` | Auto-triage new issues: add labels, assign to team |
| `schedule: daily` | Daily doc freshness check: flag README sections that are out of date |
| `push: [main]` | Post a changelog summary after every merge |

### Other engines

The default engine is GitHub Copilot. You can use others:

```yaml
# In your .md frontmatter:
engine:
  id: anthropic
  model: claude-3-5-sonnet-20241022
```

You'd then set `ANTHROPIC_API_KEY` as the secret instead of `COPILOT_GITHUB_TOKEN`.

### Local testing with `gh aw trial`

Before pushing, you can test your workflow locally:

```bash
gh aw trial pr-reviewer
```

This simulates the agent run on your machine without creating a real GitHub Actions run. Useful for iterating on instructions quickly.

### `push-to-pull-request-branch` output

Instead of just commenting, the agent can push code fixes directly to the PR branch:

```yaml
safe-outputs:
  push-to-pull-request-branch:
```

Then instruct the agent: "Fix the bug directly in the code and push the change." The agent will edit the file and commit it to the PR branch.

---

*Guide written based on a real implementation session using `gh-aw v0.57.0`, GitHub Copilot CLI engine, and a React TypeScript Vite project.*
