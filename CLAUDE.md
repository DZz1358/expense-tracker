# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Project

Angular 21 SPA (PWA) for personal expense tracking. Standalone components only, no NgModules.
Backend is an external REST API — there is no server code here.

Base URL lives in [src/environments/environment.ts](src/environments/environment.ts)
(`https://test-backend-rho-seven.vercel.app`) next to `googleClientId` (the Google OAuth client
id, same value as the backend's `GOOGLE_CLIENT_ID`). There is no `environment.prod.ts` and no
file replacement configured — a single environment file is used for every build.

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

API endpoints in use: `/auth/register`, `/auth/login`, `/auth/google`, `/auth/forgot-password`,
`/auth/reset-password`, `/users/me` (GET/PATCH/DELETE), `/users/me/avatar`, `/users/me/password`,
`/operations` (+ `/operations/:id`, `QUERY /operations`, `QUERY /operations/summary`); the old
`/expenses` routes answer 404. Every operation carries `type: 'expense' | 'income'` (`OperationType` in
[src/app/models/expense.interface.ts](src/app/models/expense.interface.ts)): `POST` requires it, `PATCH`
may change it, and a `QUERY` body without `type` returns every operation, so the analytics page pins
`type: 'expense'` while the table sends the selected type filter. The backend keeps the historical
names `expenseDate` and `biggestExpense` for both types. The deployed
`DELETE /users/me` route currently ignores the password body, so password verification
must be implemented on the backend rather than assumed by the frontend.

### Google Sign-In

Uses the official Google Identity Services (GIS) browser SDK in the popup flow. The frontend
needs only the client id — no client secret, redirect URI, backend callback URL or Passport
redirect flow. The frontend origin (`http://localhost:4200`, the production origin — origin only,
no path) must be listed under **Authorized JavaScript origins** for that client in Google Cloud
Console (for local development add both `http://localhost` and `http://localhost:4200`), otherwise the
button renders but sign-in fails with `[GSI_LOGGER]: The given origin is not allowed` in the console.

- [google-identity.service.ts](src/app/core/services/google-identity.service.ts) is the only
  code that touches `google.accounts.id`. It injects `https://accounts.google.com/gsi/client` on
  first use (Google forbids self-hosting the script; `index.html` deliberately has **no** static
  `<script>` tag, only a `preconnect`), shares one load promise, wraps the credential callback in
  `NgZone.run` (GIS calls back outside the Angular zone) and exposes `load` / `initialize` /
  `release` / `renderButton` / `disableAutoSelect`. Google's `initialize` must run once per page, so
  the service calls it on the first `initialize(handler)` and later calls only swap the active
  credential handler; components `release(handler)` on destroy. `renderButton` is synchronous and
  clears the host (`replaceChildren`) before every render. Types come from `@types/google.accounts`,
  registered in the `"types"` array of `tsconfig.app.json` and `tsconfig.spec.json`.
- [google-sign-in.component.ts](src/app/features/auth/google-sign-in/google-sign-in.component.ts)
  owns the whole flow. **What the user sees is our own `mat-stroked-button`** (Material tokens, so it
  follows light/dark theme; label from `auth.signInWithGoogle` / `auth.signUpWithGoogle` /
  `auth.continueWithGoogle`, `auth.signingInWithGoogle` while busy). Google's real button is
  rendered by the SDK into `.google-sign-in__native`, an `opacity: 0` overlay on top of it, and
  receives the click — GIS offers no programmatic trigger for the ID-token popup, and its own button
  cannot be themed and ignores `locale` in favour of the user's Google-account language (it showed
  Russian text in an English UI). Hover/focus are mirrored onto the visible button via
  `.google-sign-in__control:hover` / `:focus-within`. Flow: `afterNextRender` → `initialize`; an
  `afterRenderEffect` (re)renders the hidden GIS button on language / width changes (width clamped to
  Google's 200–400 px and matched to the visible button so the overlay covers it exactly); the visible
  button is disabled until `status() === 'ready'`; a hint replaces it when the SDK cannot load. On a
  credential it calls `AuthService.loginWithGoogle`, shows the `auth.loginSuccess` snackbar and
  navigates to `/expenses`. `busy` is a `model()` bound two-way to the page's `isLoading`
  (`[(busy)]="isLoading"`) so the email form and the Google button never run at the same time. Used
  on `/login` (`text="signin_with"`) and `/register` (`text="signup_with"`).
- `AuthService.loginWithGoogle(credential)` posts `{ credential }` to `POST /auth/google` with
  `SKIP_AUTH` (no Bearer header; a 401 from it does not clear the session or redirect) and stores
  the `GoogleLoginResponse` (an alias of `LoginResponse`) exactly like `login` / `register`
  (`storeSession`). The Google ID token is never persisted or used as a Bearer token — only the
  backend `accessToken` is.
- Backend statuses map to i18n keys in the component: 400 → `auth.googleInvalidCredential`,
  401 → `auth.googleTokenExpired`, 409 → `auth.googleEmailAlreadyRegistered` (the email already
  has a password account and is not linked automatically), 503 → `auth.googleNotConfigured`
  (backend has no `GOOGLE_CLIENT_ID`), anything else → `auth.googleSignInFailed`.
- `logout()` and `deleteAccount()` go through `clearSession()`, which also calls
  `disableAutoSelect()`. It is best-effort: the SDK is loaded lazily, so after a page reload it is
  usually not present at logout time and the call is a no-op. That is fine because the app uses
  neither One Tap nor `auto_select`, so there is no automatic re-sign-in to block; it does not
  revoke the Google grant either. Do not load the SDK just to make this call.
- While `busy`, the whole component gets the `inert` attribute so neither mouse nor keyboard can
  trigger Google's hidden button twice.
- Overlay geometry (measured): with an allow-listed origin Google renders an `<iframe>` about 20 px
  wider and 44 px tall, with the clickable button inside exactly `width` × 40 px, centered; the
  overlay's `overflow: hidden` clips the excess, so the clickable area equals the visible button.
  Known limit: when a long label wraps to two lines (ru/uk sign-up below ~330 px) the visible button
  is ~49 px tall and the top/bottom ~5 px do not react to clicks. With a non-allow-listed origin
  Google falls back to a DOM `div[role=button]` and logs `[GSI_LOGGER]` instead.
- Not used on purpose: One Tap / `prompt()`, `use_fedcm_for_button` (the classic popup flow is the
  default; FedCM for the button is optional per Google and can be enabled in `initialize` later),
  a static `<script>` tag. If the app ever sets security headers: `Cross-Origin-Opener-Policy` must
  be `same-origin-allow-popups` (not `same-origin`) and a CSP needs `script-src`/`frame-src`/
  `connect-src`/`style-src` entries for `https://accounts.google.com/gsi/`.

## Settings and categories

`AppSettingsService` ([src/app/core/services/app-settings.service.ts](src/app/core/services/app-settings.service.ts))
is the single source of truth for language, currency, date format, notifications and custom
categories. Settings are **persisted on the backend inside the user object**
(`user.settings` + `user.category`), not in localStorage — they are rehydrated by
`syncWithUser(user)` on every login / `getMe` / profile update, with defensive parsing because
`user.settings` is typed `Record<string, unknown>`.

`categories()` = built-in `EXPENSE_CATEGORY_LIST` from
[src/app/mocks/expense-categories.ts](src/app/mocks/expense-categories.ts) + built-in
`INCOME_CATEGORY_LIST` from [src/app/mocks/income-categories.ts](src/app/mocks/income-categories.ts)
+ user custom categories (id shaped `custom_<slug>_<timestamp>`, flagged `custom: true`). Every option
carries `type: OperationType`; pickers use `categoriesOf(type)` (custom categories are `expense` unless
stored with another type) and lookups by id use `getCategory(id)`. Built-in category
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
Any spec that renders `/login` or `/register` (and therefore `GoogleSignInComponent`) — including
specs that navigate the real `routes` through `RouterTestingHarness`, like
`reset-password.component.spec.ts` — must provide a `GoogleIdentityService` stub
(`jasmine.createSpyObj([...], { isConfigured: true })` with `initialize` resolving); the real service
would inject the Google script into the Karma page.
[google-identity.service.spec.ts](src/app/core/services/google-identity.service.spec.ts) shows how to
fake `window.google` and capture the injected `<script>` when testing the loader itself.

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

## Change log

### 2026-09-27 — expenses became operations (expense + income)

Backend change: `/expenses` was replaced by `/operations` (the old routes answer 404) and every record
got `type: 'expense' | 'income'`. `expenseDate` and `biggestExpense` kept their names, no DB migration
was needed (records without `type` are served and filtered as expenses). Frontend changes made for it:

- **Model.** `OperationType`, `OPERATION_TYPES`, `isOperationType` in
  [src/app/models/expense.interface.ts](src/app/models/expense.interface.ts); `IExpense.type`,
  `ExpenseFilters.type`, `ExpenseSummaryItem.type` (normalized to `expense` when missing or invalid).
- **Service.** `ExpenseTableService` (name kept) now calls `/operations`, `/operations/:id`,
  `QUERY /operations`, `QUERY /operations/summary`.
- **Expense table.** A "Type" `mat-select` (all / expenses / income, `operationTypeOptions`) sits in
  front of the category filter and sends `type` only when one is chosen. The category list follows the
  type (`categoriesOf`); an incompatible category is dropped on type change (`onTypeChange`). Income
  amounts render with a `+` prefix in `--mat-sys-tertiary` (`formatSignedAmount`,
  `.amount-cell--income` / `.amount--income`). `hasSearchOrDateFilter` became `hasNonCategoryFilter`
  (it includes the type filter). The filter grid is 4 fields + clear button; on mobile type, category
  and description span the full width and the date picker shares row 4 with the clear button.
- **Expense modal.** `mat-button-toggle-group` "Expense | Income" bound to `expenseModel().type` with
  `[value]` + `(change)="setType(...)"` rather than `[formField]`, because switching the type also
  resets a category that does not belong to it. `type` is part of the POST / PATCH payload, editing may
  change it, and a stored operation without `type` opens as an expense.
- **Income categories.** [src/app/mocks/income-categories.ts](src/app/mocks/income-categories.ts):
  `salary`, `side_job`, `benefits`, `refund`, `gifts`, `other_income`, translated via `category.<id>`.
  `ExpenseCategoryOption.type` is required; `AppSettingsService.categories()` = expense + income +
  custom, `categoriesOf(type)` filters them. Custom categories parse `type` from `user.settings` and
  default to `expense` (`CustomCategoryInput`); there is no UI yet to create custom income categories.
- **Analytics** stays spending-only: both summary `httpResource`s send `type: 'expense'`
  (`summaryType`), otherwise the backend would fold incomes into "total spent".
- **Settings.** "Clear all" loads and deletes every operation, incomes included; wording updated.
- **i18n.** New keys `operation.all|expense|income|expenses|incomes`, `category.<income ids>`,
  `expenses.chooseType`, `expenseModal.type`. The values of `nav.expenses`, `expenses.*`,
  `expenseModal.*` and `settings.clear*` / `settings.loadFailed` now say "operation(s)" in en / ru / uk
  (keys unchanged). "Add Expense" became "Add operation".
- **Specs.** Fixtures carry `type`, URLs use `/operations`, new tests cover the type filter, income
  rendering, the modal toggle and edit flow, `categoriesOf` and summary `type` normalization.
  `auth.interceptor.spec.ts` uses `/operations` as its sample API URL.
