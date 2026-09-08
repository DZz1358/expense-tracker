# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Project

Angular 21 SPA (PWA) for personal expense tracking. Standalone components only, no NgModules.
Backend is an external REST API — there is no server code here.

Base URL lives in [src/environments/environment.ts](src/environments/environment.ts)
(`https://test-backend-rho-seven.vercel.app`). There is no `environment.prod.ts` and no file
replacement configured — a single environment file is used for every build.

## Commands

```bash
npm start          # ng serve -> http://localhost:4200
npm run build      # production build into dist/expense-tracker
npm run watch      # development build in watch mode
npm test           # Karma + Jasmine (opens Chrome)
npx ng test --watch=false --browsers=ChromeHeadless   # single CI-style run
```

There is no linter and no formatter configured. Follow [.editorconfig](.editorconfig):
2 spaces, single quotes in `.ts`, final newline, no trailing whitespace.

## Architecture

```
src/app
├── core/          # app-wide singletons: guards, interceptors, i18n, models, services
├── features/      # routed feature areas (analytics, auth, expense-table, profile, settings)
├── layout/        # app-shell, header, sidebar, footer
├── shared/        # reusable components, pipes, local-storage, snackbar, theme
├── models/        # domain interfaces (IExpense)
└── mocks/         # built-in expense category catalogue (not test mocks)
```

Routing ([src/app/app.routes.ts](src/app/app.routes.ts)): every route is lazy (`loadComponent`).
`/login` and `/register` are behind `guestGuard`; everything else is nested under the
`AppShellComponent` route protected by `authGuard` (`canActivate` + `canActivateChild`).
`/settings` also uses `unsavedChangesGuard`. Unknown routes redirect to `''` → `/expenses`.

Providers are centralized in [src/app/app.config.ts](src/app/app.config.ts): router, HTTP client
with `authInterceptor`, native date adapter, service worker (production only),
`MAT_DATE_LOCALE = 'en-GB'`, `ShowOnDirtyErrorStateMatcher`. Locales `en-GB`, `ru`, `uk` are
registered in [src/main.ts](src/main.ts).

## Conventions to follow

**Signals first.** State is signals (`signal`, `computed`, `effect`, `linkedSignal`), not
BehaviorSubjects. Services expose `readonly x = this.#xSignal.asReadonly()`.

**Signal forms.** Forms use the experimental `@angular/forms/signals` API — a `signal()` model
plus `form(model, (f) => { required(...); email(...); disabled(...); })`, bound in templates with
`[formField]`, submitted through `submit(...)`. See
[login.component.ts](src/app/features/auth/login/login.component.ts) and
[expense-modal.component.ts](src/app/shared/expense-modal/expense-modal.component.ts).
Do not introduce `ReactiveFormsModule`/`FormBuilder`; `FormsModule` is only imported where
Material components need `ngModel`-style bindings.

**Components:** `inject()` (no constructor DI), `ChangeDetectionStrategy.OnPush`,
`input()`/`output()` functions, separate `.html`/`.scss` files, `app-` selector prefix.
New-style control flow only (`@if` / `@for` with `track` / `@else`) — no `*ngIf` / `*ngFor`.
Prefer importing single symbols (`MatIcon`) or the module (`MatIconModule`) as the file already does.

**Data access.** Reads that just feed the view use `httpResource<T>()` with
`dataResource.value()` / `.isLoading()` / `.error()` / `.reload()`
(see [expense-table.component.ts](src/app/features/expense-table/expense-table.component.ts) and
[analytics.component.ts](src/app/features/analytics/analytics.component.ts)).
Mutations go through injectable services returning `Observable` and are followed by
`dataResource.reload()`. Subscriptions in components are piped through
`takeUntilDestroyed(this.destroyRef)`.

**Facades.** Heavy feature logic goes into a component-provided facade
(`@Injectable()` listed in the component's `providers`), see
[settings.facade.ts](src/app/features/settings/settings.facade.ts). Widely shared state goes in
`core/services` with `providedIn: 'root'`.

**Feedback.** User-facing messages go through `SnackbarService`
(`success` / `error` / `warning` / `info`), never `alert()`. Destructive actions open
`ConfirmationModalComponent`. Dialog config used across the app:
`{ disableClose: true, width: 'calc(100% - 30px)', maxWidth: '520px' | '600px' }`.

## i18n

Home-grown, not `@angular/localize`. All strings live in one dictionary,
[src/app/core/i18n/translations.ts](src/app/core/i18n/translations.ts), keyed
`en` / `ru` / `uk` with flat dotted keys (`settings.saved`, `category.housing`,
`validation.emailRequired`). Use:

- templates: `{{ 'expenses.title' | translate }}`, params: `{{ 'x.y' | translate: { name: n } }}`
- TypeScript: `this.languageService.t('key', params)`

Every new user-visible string must be added to **all three** languages. Missing keys fall back to
English, then to the raw key. `TranslatePipe` and the category pipes are `pure: false` so they
re-render on language change. Active language comes from `AppSettingsService.settings().language`;
`LanguageService.dateLocale()` maps it to the Angular locale for `formatDate`.

## Auth

`AuthTokenStorageService` keeps the JWT in `localStorage` under the raw key `access_token`.
`AuthService.currentUser` is a signal hydrated from `localStorage` (`StorageKey.User`).
`authInterceptor` ([src/app/core/interceptors/auth.interceptor.ts](src/app/core/interceptors/auth.interceptor.ts))
adds `Authorization: Bearer` to requests whose URL starts with `environment.apiUrl`, unless the
request sets the `SKIP_AUTH` `HttpContextToken` (login/register do). On a 401 it clears the token
and user and navigates to `/login`.

API endpoints in use: `/auth/register`, `/auth/login`, `/auth/account` (DELETE),
`/users/me`, `/users/me/avatar`, `/users/me/password`, `/expenses` (+ `/expenses/:id`).

## Settings and categories

`AppSettingsService` ([src/app/core/services/app-settings.service.ts](src/app/core/services/app-settings.service.ts))
is the single source of truth for language, currency, date format, notifications and custom
categories. Settings are **persisted on the backend inside the user object**
(`user.settings` + `user.category`), not in localStorage — they are rehydrated by
`syncWithUser(user)` on every login / `getMe` / profile update, with defensive parsing because
`user.settings` is typed `Record<string, unknown>`.

`categories()` = built-in `EXPENSE_CATEGORY_LIST` from
[src/app/mocks/expense-categories.ts](src/app/mocks/expense-categories.ts) + user custom
categories (id shaped `custom_<slug>_<timestamp>`, flagged `custom: true`). Built-in category
labels are translated via `category.<id>` keys; custom labels are shown verbatim — the pipes in
`shared/pipes` already handle that split, so use `| categoryLabel`, `| categoryIcon`,
`| categoryColor` instead of reading the catalogue directly.

Settings changes are local until **Save**: the facade flips `hasUnsavedChanges`, and
`unsavedChangesGuard` + `canDeactivate()` (returning `null` to trigger the confirm dialog) block
navigation away with pending edits.

## Theming and styles

Material 3 theme configured in [src/styles.scss](src/styles.scss) via `mat.theme()` with the
generated palettes in [src/styles/theme/palettes.scss](src/styles/theme/palettes.scss).
Dark mode = `ThemeService` toggling the `dark_mode` class on `<body>` (`Theme` enum values are
`light_mode` / `dark_mode`, doubling as Material icon names) and persisting to localStorage;
the theme is also mirrored into backend user settings by `SettingsFacade`.

In SCSS always use Material system tokens (`var(--mat-sys-surface)`,
`--mat-sys-on-surface-variant`, `--mat-sys-primary`, …) rather than hard-coded colors, so both
themes work. `src/styles` is on the Sass include path (`stylePreprocessorOptions`), so
`@use "styles/theme/palettes"` resolves. Component styles have a 10 kB warning / 20 kB error budget.

## PWA

Service worker enabled only in production builds; assets configured in
[ngsw-config.json](ngsw-config.json). `AppUpdateService` (kicked off from `AppComponent`) checks
for updates when the app becomes stable and then every 6 hours, and prompts with
`window.confirm` before reloading on `VERSION_READY`.

## Tests

Karma + Jasmine, spec files next to sources. Most are generated "should create" smoke tests;
[auth.service.spec.ts](src/app/core/services/auth.service.spec.ts) and
[auth.interceptor.spec.ts](src/app/core/interceptors/auth.interceptor.spec.ts) are real tests and
show the intended style (`provideHttpClient()` + `provideHttpClientTesting()`, `HttpTestingController`,
`provideRouter([])`). Components that hit `httpResource` need the HTTP testing providers in
`TestBed`. `localStorage` is real in tests — clear it in `beforeEach` when a spec touches auth or theme.

## Known rough edges (do not treat as the pattern to copy)

- [expense-table.service.ts](src/app/features/expense-table/expense-table.service.ts) is fully
  untyped (`any`); everything else uses typed models. Prefer `IExpense`/typed generics in new code.
- A stray `console.log` sits in `openEditExpenseModal` in
  [expense-table.component.ts](src/app/features/expense-table/expense-table.component.ts).
- Dialog titles `'Add new expense'` / `'Edit expense'` are passed untranslated from
  `expense-table.component.ts`.
- `SnackbarService` accepts a `variant` but currently only uses it to pick a duration — no
  `panelClass` / styling is applied yet.
- `StorageKey.Token` is unused; the token key is the literal `'access_token'`.
- [src/styles/theme/mixins.scss](src/styles/theme/mixins.scss) is dead code and would not compile
  (`@use './functions'` while the file is named `function.scss`).
- `formatAmount` in the expense table and `AnalyticsService.formatCurrency` hard-code the
  `'en-US'` `Intl` locale while respecting the selected currency.

## Git

Branch: `master`. Commit messages are short, lowercase, imperative-ish (`added snackbar`,
`refactor settings`). Do not commit or push unless asked.
