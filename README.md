# Expense Tracker

Expense Tracker is an Angular application for tracking personal expenses. The app includes authentication, a protected dashboard layout, expense management, profile settings, theme switching, and integration with a remote REST API.

## What the app does

- Register a new account and log in with email and password.
- Recover an account password through an email reset link.
- Store the access token locally and attach it to protected API requests.
- Protect application routes from unauthenticated users.
- View expenses in a responsive table/card layout.
- Add, edit, and delete expenses through modal dialogs.
- Filter expenses by category.
- Filter, sort, and paginate expenses through the API.
- View spending totals, category breakdowns, and timelines for a selected period.
- Manage expense categories with labels, icons, and colors.
- Update user profile data.
- Upload a user avatar.
- Change account password.
- Switch between light and dark themes.
- Log out or delete the account.

## Tech stack

- Angular 21
- Angular Material
- Angular Router
- Angular Signals and signal forms
- RxJS
- TypeScript
- SCSS
- Karma and Jasmine for unit tests

## API

The frontend uses the API URL from [src/environments/environment.ts](/home/denys/expense-tracker/src/environments/environment.ts):

```ts
https://test-backend-rho-seven.vercel.app
```

Main API areas used by the app:

- `/auth/register`
- `/auth/login`
- `/auth/forgot-password`
- `/auth/reset-password`
- `/auth/account`
- `/users/me`
- `/users/me/avatar`
- `/users/me/password`
- `/expenses`
- `/expenses/summary`

Expense lists use `QUERY /expenses` with JSON filters and return
`{ items, pagination: { page, limit, total, totalPages } }`. The default body is
`{}`: page 1, 20 items, sorted by expense date descending. Changing filters or
sorting resets pagination to page 1. The frontend uses the returned items and
total directly for both tables and mobile cards.

Analytics uses `QUERY /expenses/summary` for current and previous period totals
across the complete selection. In addition to `total`, `totalAmount`, and
`byCategory`, the API must return `byDate` (UTC daily counts and amounts),
`activeDays`, and `biggestExpense`. These fields power the timeline, average per
active day, and largest expense card. Date-only filter boundaries are sent
unchanged and interpreted in UTC; `dateTo` includes the final day.

Password recovery requires SMTP configuration on the backend and
`PASSWORD_RESET_URL` pointing to this frontend's `/reset-password` page.

## Project structure

```text
src/app
├── core
│   ├── guards
│   ├── interceptors
│   ├── models
│   └── services
├── features
│   ├── analytics
│   ├── auth
│   ├── expense-table
│   ├── profile
│   └── settings
├── layout
├── models
├── mocks
└── shared
```

## Getting started

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm start
```

Open the app in your browser:

```text
http://localhost:4200
```

The app reloads automatically when source files change.

## Available scripts

```bash
npm start
```

Runs the local Angular development server.

```bash
npm run build
```

Builds the production version of the app into the `dist/` directory.

```bash
npm run watch
```

Builds the app in watch mode with the development configuration.

```bash
npm test
```

Runs unit tests with Karma and Jasmine.

## Main routes

- `/login` - sign in page.
- `/register` - create account page.
- `/forgot-password` - request a password reset email.
- `/reset-password?token=...` - set a new password using the email link.
- `/expenses` - main expense list.
- `/analytics` - spending summaries, category breakdowns, and timelines.
- `/profile` - user profile and account settings.
- `/settings` - settings placeholder.

Unknown routes redirect back into the application shell.
