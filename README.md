# MCP Context Lab

An empty TypeScript project for learning MCP.

## Requirements

Node.js 20 or newer and npm.

## Setup

```sh
npm install
```

## Commands

```sh
npm run dev        # Run the entry point and restart when files change
npm run typecheck  # Check types without emitting files
npm run build      # Compile src/ into dist/
npm start          # Run the compiled entry point (build first)
```

Start writing in `src/index.ts`. It is intentionally empty, so running
the project initially produces no output. No MCP implementation is included yet.

This project uses ES modules. With NodeNext, use `.js` extensions for relative
imports in TypeScript, for example `import { searchNotes } from "./notes.js"`.
