# AGENTS.md

## Repository Overview
- Laravel 12 backend with Inertia + React (TypeScript) frontend.
- Frontend source lives in `resources/js` and `resources/css`.
- Tests use Pest with Laravel helpers.
- Styling uses Tailwind CSS with Prettier’s Tailwind plugin.

## Build, Lint, and Test Commands

### Frontend (Node/Vite)
- Install deps: `npm install`
- Dev server: `npm run dev`
- Production build: `npm run build`
- SSR build: `npm run build:ssr`
- Type check: `npm run types`
- Lint (autofix): `npm run lint`
- Prettier format: `npm run format`
- Prettier check: `npm run format:check`

### Backend (Laravel/PHP)
- Install deps: `composer install`
- App dev server (with queue/logs/vite): `composer dev`
- Lint PHP (Pint): `composer lint`
- Lint PHP check-only: `composer test:lint`
- Full test suite: `composer test`

### Run a Single Test
- Pest by file: `./vendor/bin/pest tests/Feature/ExampleTest.php`
- Pest by filter: `./vendor/bin/pest --filter "Dashboard"`
- Artisan test by filter: `php artisan test --filter DashboardTest`
- Artisan test by file: `php artisan test tests/Feature/ExampleTest.php`

### Run a Single Lint/Format Target
- ESLint one file: `npx eslint resources/js/pages/welcome.tsx`
- Prettier one file: `npx prettier --write resources/js/pages/welcome.tsx`
- Pint one file: `./vendor/bin/pint app/Models/User.php`

## Code Style Guidelines

### General
- Use 4-space indentation (per `.editorconfig`).
- Keep lines at ~80 chars where possible (Prettier `printWidth: 80`).
- Prefer small, focused changes aligned with existing patterns.
- Avoid introducing new tools or dependencies unless requested.

### TypeScript / React
- Use function components and React hooks.
- TypeScript is strict; avoid `any` unless absolutely necessary.
- Use `type` imports for types and keep them separate.
- Prefer explicit return types for exported helpers when helpful.
- Keep JSX readable; avoid deeply nested ternaries.
- Avoid prop-types; rely on TypeScript types.

### Import Ordering (ESLint)
- Groups order: builtin, external, internal, parent, sibling, index.
- Alphabetize within groups (case-insensitive).
- Keep `type` imports separated (enforced by ESLint).

### Formatting (Prettier)
- Single quotes and semicolons are required.
- Tab width: 4 spaces.
- Tailwind class order is auto-sorted by Prettier.
- Use `clsx`, `cn`, or `cva` for conditional class names.

### Aliases and Paths
- Use `@/` alias for `resources/js` imports when possible.
- Keep relative imports for same-folder files only.

### Naming Conventions
- React components: `PascalCase`.
- Hooks and functions: `camelCase`.
- Types/interfaces: `PascalCase`.
- Constants: `UPPER_SNAKE_CASE` when truly constant.

### Error Handling
- Prefer Laravel validation (`FormRequest` or `request()->validate`) on inputs.
- Use `abort()` / `abort_if()` for access control failures.
- Log unexpected errors with `report()` or `logger()` as needed.
- In frontend, handle server errors via Inertia error props or form helpers.

### PHP / Laravel
- Follow Laravel conventions for controllers, requests, and policies.
- Use Eloquent relationships over manual joins where appropriate.
- Keep controllers thin; move complex logic to services or actions.
- Use `pint` (Laravel preset) for PHP formatting.

### Testing
- Place feature tests in `tests/Feature` and unit tests in `tests/Unit`.
- Prefer Pest style tests consistent with existing files.
- Use factories and `RefreshDatabase` when touching DB (already enabled for Feature tests).

## Editor and Tooling Notes
- `.editorconfig` enforces LF, UTF-8, final newline, 4-space indent.
- Prettier uses `prettier-plugin-tailwindcss`.
- ESLint config is in `eslint.config.js` (React, hooks, import ordering).

## Cursor / Copilot Rules
- No `.cursor/rules`, `.cursorrules`, or `.github/copilot-instructions.md` found.
