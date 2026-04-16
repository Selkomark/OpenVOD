# Architecture Rules

## 1. Clean Architecture (Layered)
The server MUST follow strictly enforced Clean Architecture layers with unidirectional dependencies:
**Controller > Service > Repository/Adapter**

### Layers
1. **Router Layer** (`services/api/src/routers`):
   - **Role**: Framework entry point (tRPC, Hono).
   - **Responsibility**: Routing only. Delegates to Controllers.
   
2. **Controller Layer** (`services/api/src/controllers`):
   - **Role**: Interface Adapter.
   - **Responsibility**: Orchestration, DTO validation, converting HTTP/tRPC requests to Service calls.
   
3. **Service Layer** (`services/api/src/services`):
   - **Role**: Business Logic / Use Cases.
   - **Responsibility**: Pure domain logic.
   - **Dependencies**: Depends ONLY on Repositories and Adapters.
   - **Constraint**: MUST NOT depend on Controllers or Routers.
   - **CRITICAL AI RULE**: Files in `services/api/src/services/` MUST NEVER import Kysely, `sql`, or `db.ts`. All database queries MUST be abstracted behind an interface in `services/api/src/repositories/` and injected/called. DO NOT bypass the repository layer.
   
4. **Adapter Layer** (`services/api/src/adapters`):
   - **Role**: Interface to External Systems.
   - **Responsibility**: Wraps 3rd-party SDKs (Stripe, Email, GCP, etc.).
   
5. **Repository Layer** (`services/api/src/repositories`):
   - **Role**: Database Gateway.
   - **Responsibility**: Direct database access via Kysely.

# Database Migrations
- All validation or schema changes to the database MUST be done via a new migration file in `services/api/migrations`.
- Do NOT edit `services/api/src/db.ts` to change the schema.
- Create a new file in `services/api/migrations` with a prefix that ensures ordering (e.g. `0002_add_column.ts` or timestamp).
- Use `export async function up(db: Kysely<any>): Promise<void>` to define the change.
- Use `export async function down(db: Kysely<any>): Promise<void>` to define the rollback.
- Ensure `up` migrations are idempotent (use `ifNotExists`, `try-catch`) if they might run on databases with partial schemas.

# Coding Standards

## 1. Test-Driven Development (TDD)
- **MANDATORY**: All features must be implemented by writing tests first (Red-Green-Refactor).
- **Organization**:
    - **CRITICAL AI RULE**: ALL tests (Unit and Integration) MUST be semantically co-located directly next to the module or component they are testing.
    - **Forbidden**: DO NOT place tests in centralized `test/` directories.
- **CRITICAL AI FRAMEWORK RULE**: For client tests, ALWAYS use `vitest` (`import { vi, describe, it, expect } from 'vitest'`). For server tests, ALWAYS use `bun:test` (`import { test, expect, mock, describe } from 'bun:test'`). NEVER arbitrarily mix the import declarations.
- **Scope**:
    - **Unit Tests**: Required for Business Logic, Services, Adapters, and Utilities.
    - **Integration Tests**: Required for all Repositories and API endpoints (Routers).
- **Strict Coverage**: 100% test coverage is MANDATORY. You MUST NOT use `test.todo()` or empty stub files to bypass coverage checks. All missing tests must be fully implemented with real assertions.

## 2. Testing Constraints
- **NO Third-Party Calls**: Tests MUST NOT make real network calls to external services.
- **Mocking**: External interactions MUST be mocked at the Adapter layer.
- **Idempotency**: Integration tests MUST use idempotent seeding to avoid constraint violations in parallel runs.

## 3. Engineering Principles
- **DRY**: Extract common logic to shared helpers or base classes.
- **KISS**: Avoid over-engineering. Solve the immediate problem.
- **Functional**: Prefer pure functions, key immutability, and composition over deep inheritance.

## 4. Documentation
- **MANDATORY**: A Change Log entry is required for every major decision or planning session.
- **Location**: `/docs/changelog/`

# Tech Stack Rules

## Environment & Runtime
- **Runtime**: Bun (v1.x)
- **Node**: Node.js LTS (managed via `.nvmrc`)
- **Docker (Local Dev)**: ALWAYS prioritize completely volume-based orchestration. DO NOT use `COPY` instructions in Dockerfiles to embed source code during local development. Rely entirely on `docker-compose.yml` volumes to map local source directly to the container, and use anonymous volumes to strictly isolate and protect the auto-generated internal `node_modules` paths.

## Backend
- **Framework**: Hono Server running natively on Bun (`Bun.serve()`).
- **ORM/Query Builder**: Kysely (`pg`).
- **Testing**: Bun Test.

## Frontend
- **Framework**: React + Vite.
- **Styling**: TailwindCSS (SaaS/Snowflake-like aesthetic).
- **Testing**: Vitest.

# UI Responsiveness Guidelines
- **Mobile-First**: Design for mobile screens first, then enhance for larger displays using `sm:`, `md:`, `lg:`, `xl:` modifiers.
- **Fluid Layouts**: Use relative units (`%`, `rem`, `vw`) and `max-width` containers instead of fixed pixel widths.
- **Touch Targets**: Ensure interactive elements are at least 44x44px.
