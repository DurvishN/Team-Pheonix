# LeanMonth Planner

A personalized, responsive financial planner built on the original May 2026–April 2027 LeanMonth sample plan. Ravi is the default browser workspace; authenticated users have separate, cross-device accounts.

## Core features

- Dashboard with period filters, live cash-flow charts, projected buffer, and avoided borrowing.
- Editable monthly income, extra earnings, expenses, savings contributions, and notes.
- What-if savings simulation, income stress tests, recommendations, and financial rules.
- Private profile details, avatar colors, financial goals, named scenarios, and CSV/JSON exports.
- Bottom-left account switching with email registration, password sign-in, Google sign-in, and a return to the default Ravi workspace.

## Data and identity

`lm_templates` contains the public illustrative starter plan. `lm_workspaces` stores each workspace's profile, rules, monthly records, scenarios, modification timestamp, and revision. Initial values are loaded from the database, not from a frontend fixture.

The API resolves identity from a verified Supabase session or a private 256-bit browser credential. It never accepts a caller-supplied user ID. Guest credentials are hashed before use as database identifiers. Account-scoped database policies are complemented by server-side authenticated encryption of every private profile, rule set, monthly record list, and scenario list. The encryption key is derived per workspace from the server-only service key. Preserve or migrate this key before rotating it. Revision checks prevent simultaneous edits from silently overwriting each other.

Ravi's default workspace is private to the browser holding its credential. Clearing site data removes that browser's access. Account workspaces instead follow the signed-in account. A newly created account starts from the public sample template rather than copying another user's information.

## Financial calculations

Monthly surplus = expected income + extra income − expenses. Positive surplus contributes the configured percentage, unless overridden by the user. Deficits draw from the available buffer. Any remaining deficit is projected borrowing. Avoided borrowing is the nonnegative difference from a 10%-savings comparison. The safety line is a warning, not a withdrawal lock.

## Build

Use `npm run lint` and `npm run build`. Vercel serves the Vite build and `api/workspace.js`. The configured Supabase and Google-auth environment variables are required. The Supabase service-role credential belongs only in the server environment.

All sample figures are illustrative and do not constitute financial advice.
