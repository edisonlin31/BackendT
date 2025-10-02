# Backend Test Suite Documentation

This document explains the purpose and coverage of all **backend** (Jest / Supertest / Mongoose) test files.

Each section below uses HTML `<details>` dropdowns so you can expand to see a concise breakdown of what each individual test case validates.

---
## Authentication & Authorization

<details>
<summary><strong>src/__tests__/auth.test.ts</strong></summary>
<ul>
<li><em>valid credential login (L1/L2/L3):</em> Each role can authenticate, receives token + user object.</li>
<li><em>invalid password:</em> Wrong password returns 401 with message.</li>
<li><em>non-existent user:</em> Unknown email path returns 401.</li>
<li><em>validation errors:</em> Missing fields return 400 with errors array.</li>
</ul>
</details>

<details>
<summary><strong>src/__tests__/middleware.test.ts</strong></summary>
<ul>
<li><em>valid token access:</em> Protected route returns user context when JWT valid.</li>
<li><em>missing token:</em> 401 for requests without Authorization header.</li>
<li><em>invalid token signature:</em> 403 for malformed/invalid JWT.</li>
<li><em>malformed header format:</em> Rejects improperly structured Authorization header.</li>
<li><em>expired token placeholder:</em> Reserved test illustrating potential path (skipped logic comment).</li>
<li><em>user not found:</em> Token referencing deleted/non-existent user yields 401.</li>
</ul>
</details>

## Models

<details>
<summary><strong>src/__tests__/basic.test.ts</strong></summary>
<ul>
<li><em>User happy path:</em> Creation with valid data persists and hashes password.</li>
<li><em>Required field validation:</em> Username/email/password/role omissions rejected.</li>
<li><em>Email format validation:</em> Invalid email formats rejected.</li>
<li><em>Password length:</em> Enforces minimum length.</li>
<li><em>Role enum & uniqueness:</em> Invalid role + duplicate username/email produce validation errors.</li>
<li><em>Password hashing:</em> Confirms stored hash differs from plain text.</li>
</ul>
</details>

<details>
<summary><strong>src/__tests__/models.test.ts</strong></summary>
<ul>
<li><em>User creation & validation:</em> Mirrors and extends <code>basic.test.ts</code> with additional uniqueness and enum checks.</li>
<li><em>User methods (comparePassword):</em> Ensures bcrypt comparison correctness for good/bad passwords.</li>
<li><em>Ticket creation:</em> Valid ticket persists with defaults (status New, level L1).</li>
<li><em>Ticket field validation:</em> Category/priority enums & required fields enforced.</li>
<li><em>Priority changes:</em> Updating ticket priority persists new value.</li>
<li><em>Action log placeholder:</em> Minimal assertion showing status update triggers persistence (log length shape indirectly covered elsewhere).</li>
</ul>
</details>

## Ticket Controller & Workflow

<details>
<summary><strong>__tests__/tickets.test.ts</strong></summary>
<ul>
<li><em>Create ticket (L1 only):</em> L1 allowed, non‑L1 rejected, validation errors & unauthorized path covered.</li>
<li><em>List tickets:</em> Authenticated listing, priority and status filters, unauthorized rejection.</li>
<li><em>Get ticket:</em> Found, 404 (non-existent), and 400 (invalid ID) paths.</li>
<li><em>Update ticket:</em> Status change & action log growth on update.</li>
<li><em>Escalation (L1→L2 & L2→L3 with C1/C2):</em> Valid paths succeed; forbidden paths (L1→L3, L2→L3 with C3) fail.</li>
<li><em>Escalation validation:</em> Empty reason, non-existent ticket, unauthorized (missing token) covered.</li>
<li><em>Resolution role rules:</em> Matrix of who can resolve which level (L1 only L1, L2 only L2, L3 only L3 with correct level) including all forbidden combinations.</li>
<li><em>Resolution edge cases:</em> Non-existent ticket, unauthorized attempt, action log presence after resolution.</li>
</ul>
</details>

## Supporting / Test Utilities

<details>
<summary><strong>src/__tests__/helpers.ts</strong></summary>
<ul>
<li><em>Factory utilities:</em> Provide helpers to create users, tickets, and JWT tokens for isolation and readability in other test files.</li>
</ul>
</details>

<details>
<summary><strong>src/__tests__/setup.ts</strong></summary>
<ul>
<li><em>Global Jest setup:</em> Connects to in-memory MongoDB, clears collections before each test, and disconnects afterward to ensure isolation.</li>
</ul>
</details>

---
## Testing Philosophy (Backend)

Focused on:
- Authentication and role-based access control
- Ticket lifecycle correctness (creation → escalation → resolution)
- Data validation & model integrity
- Error and edge-case handling

Excluded / intentionally light:
- Performance benchmarking
- Redundant permutations once a guard/validation pattern is proven

---
## How to Run Backend Tests

From the `backend/` directory:
```bash
npm test
```
Run once without watch:
```bash
npm test -- --run
```

Ensure you have seeded data if tests require predefined users:
```bash
npm run seed
```

---
If you add new backend tests, append a new `<details>` block above following the same structure.
