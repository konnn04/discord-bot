# Contributing to Discord Bot

First off, thank you for considering contributing to Discord Bot! It's people like you that make open source such a great community.

## 1. Where do I go from here?

If you've noticed a bug or have a feature request, make sure to check our [Issues](../../issues) tab to see if someone else has already created an issue. If not, go ahead and make one!

## 2. Setting up your environment

1. Fork the repo and create your branch from `main` or `dev`.
2. Ensure you have `Node.js` (v20+) and `pnpm` (v10) installed.
3. Run `pnpm install` in the repository root.
4. Set up your `.env` variables inside `apps/api` (You'll need a test Discord Bot Token and a local PostgreSQL instance).
5. Run `cd apps/api && npx prisma generate && npx prisma db push` to initialize your local database.

## 3. Development Workflow

This is a monorepo. Please adhere to the following architecture rules:
- **Shared logic & Types**: If your changes affect both the API and Web, place the code in `packages/shared`.
- **Bot Logic**: Modify `apps/api/src/...`.
- **Frontend**: Modify `apps/web/src/...`.

To start the dev server, simply run:
```bash
pnpm dev
```

## 4. Linting and Testing

Before submitting your PR, make sure your code passes our linting rules. 
```bash
pnpm lint
```
*(Optionally run `pnpm lint:fix` or `pnpm lint --fix` to auto-format).*

If you added any new functionality, please ensure there are no TypeScript compilation errors by running `pnpm build`.

## 5. Submitting a Pull Request

1. Make sure your changes are well-tested and documented.
2. Update the README.md with details of changes to the interface or architecture, if applicable.
3. Open a Pull Request! We will review your changes as soon as possible.

## Code of Conduct

Please note that this project is released with a Contributor Code of Conduct. By participating in this project you agree to abide by its terms. Be respectful and constructive!
