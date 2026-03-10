   # Task Manager — gh-aw Practice Project

   A simple React + TypeScript task management app, used as a practice project for learning **GitHub Agentic Workflows (gh-aw)**.

   ## Tech Stack
   - [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
   - [Vite](https://vite.dev/) — build tool and dev server
   - [Vitest](https://vitest.dev/) + [React Testing Library](https://testing-library.com/) — testing
   - [ESLint](https://eslint.org/) — linting
   - [GitHub Actions](https://github.com/features/actions) — CI (build, test, lint)
   - [GitHub Agentic Workflows](https://github.github.com/gh-aw/) — AI-powered repo automation

   ## Getting Started

   ### Install dependencies
   ```bash
   npm install

  Run the dev server

   npm run dev

  Open http://localhost:5173

  Run tests

   npm test

  Lint

   npm run lint

  Build

   npm run build

  Project Structure

   src/
     components/
       TaskList.tsx     # Main Task Manager component
     tests/
       TaskList.test.tsx
       setup.ts
     App.tsx
     main.tsx
   .github/
     workflows/
       ci.yml           # GitHub Actions CI
       copilot-setup-steps.yml
     agents/
       agentic-workflows.agent.md

  About This Project

  This project exists to practice GitHub Agentic Workflows — AI-powered automation that runs inside GitHub Actions. The agentic workflows in .github/workflows/ use natural language instructions to automatically triage issues, review PRs, generate status
  reports, and more.