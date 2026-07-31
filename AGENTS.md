# Repository Guidelines

## Project Overview & Architecture
Regional investment-management platform (investment projects, industrial zones,
SEZs, prom zones, subsoil users, region ratings) built on Laravel 12 with an
Inertia v2 + React 19 (TypeScript) frontend. UI text is Kazakh/Russian (`lang/kk`).

- **Backend**: thin controllers in `app/Http/Controllers`; domain logic lives in
  `app/Services` (chat, issue/completion workflows, Gemini and Telegram
  integrations, private file access). Auth is Laravel Fortify; routes are in
  `routes/web.php` and `routes/settings.php`.
- **Frontend**: Inertia pages in `resources/js/pages` (one folder per domain
  entity), shared components in `resources/js/components`, Radix-based
  primitives in `resources/js/components/ui`. Maps use Leaflet; 3D via
  react-three-fiber. React Compiler is enabled via Babel plugin.
- **Generated code — do not hand-edit**: `resources/js/actions`,
  `resources/js/routes`, and `resources/js/wayfinder` are produced by Laravel
  Wayfinder (Vite plugin). Import routes/actions from these instead of
  hardcoding URLs.

## Build, Test, and Development Commands
- `composer setup` — full install (composer, .env, migrate, npm, build)
- `composer dev` — serve + queue + logs (pail) + Vite, concurrently
- `npm run build` / `npm run build:ssr` — production / SSR build
- `npm run types` — TypeScript check (strict mode, `@/*` → `resources/js/*`)
- `npm run lint` / `npm run format` — ESLint autofix / Prettier
- `composer lint` / `composer test:lint` — Pint fix / check-only
- `composer test` — clears config, runs Pint check + full Pest suite
- Single test: `php artisan test --filter DashboardTest` or
  `./vendor/bin/pest tests/Feature/ExampleTest.php`

## Coding Style & Naming Conventions
- 4-space indent, LF, final newline (`.editorconfig`); Prettier: single quotes,
  semicolons, 80-char width, Tailwind class sorting plugin.
- ESLint enforces import ordering (builtin→external→internal→parent→sibling→index,
  alphabetized) and separated `type` imports.
- Pint uses the `laravel` preset. Components/types `PascalCase`, hooks/functions
  `camelCase`, use `cn`/`cva` for conditional Tailwind classes.
- Prefer `FormRequest` validation and Eloquent relationships; keep controllers thin.

## Testing Guidelines
Pest 4 with Laravel plugin. Feature tests (`tests/Feature`) use `RefreshDatabase`;
CI runs against Postgres 16 on PHP 8.4 and 8.5.

## Commit & Pull Request Guidelines
Work merges to `main` via PRs from feature branches. CI must pass: `linter`
workflow (Pint + Prettier, auto-commits fixes) and `tests` workflow (Pest on
PHP 8.4/8.5 with Postgres). Git history shows no enforced commit-message
convention; write descriptive messages anyway.
