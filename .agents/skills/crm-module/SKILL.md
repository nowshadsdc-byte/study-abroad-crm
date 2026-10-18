---
name: crm-module
description: "Use when adding a new CRM module or a new resource/entity to Confidence Global Bd CRM (e.g. 'add a Visa module', 'add tasks to candidates', 'new CRUD for agents'), or when adding a new endpoint, page, or permission to an existing module (leads, candidates, opportunities, universities, finance). Covers the full stack: migration, model, permission enum, role seeding, policy, service, form requests, API resources, API controller, routes, Wayfinder, Inertia React page, sidebar navigation, and Pest feature tests."
metadata:
  author: confidenceglobalbd
---

# CRM Module

Build new CRM functionality by copying the shape of the **Leads** module, which is the reference implementation. Read the sibling Lead file before writing each new file and mirror it.

## Reference Files

| Layer | Reference |
| --- | --- |
| Migration | `database/migrations/2026_08_19_082522_create_leads_table.php` |
| Model | `app/Models/Lead.php` |
| Permissions | `app/Enums/PermissionEnum.php`, `database/seeders/RolePermissionSeeder.php` |
| Policy | `app/Policies/LeadPolicy.php` |
| Service | `app/Services/LeadService.php` |
| Form Requests | `app/Http/Requests/StoreLeadRequest.php`, `UpdateLeadRequest.php` |
| Resources | `app/Http/Resources/LeadResource.php`, `LeadDetailResource.php` |
| Controller | `app/Http/Controllers/Api/LeadController.php` |
| Events | `app/Events/LeadCreated.php`, `LeadUpdated.php` |
| Routes | `routes/api.php`, `routes/web.php` |
| Pages | `resources/js/pages/leads/` (`index.tsx`, `columns.tsx`, `show.tsx`, `add-lead-dialog.tsx`, `edit-lead-dialog.tsx`) |
| Nav | `resources/js/components/app-sidebar.tsx` |
| Tests | `tests/Feature/LeadModuleTest.php` |

## Steps

### 1. Permissions first

- Add `<Module>View`, `<Module>Create`, `<Module>Edit`, `<Module>Delete` cases to `PermissionEnum` with values `<module>.view` etc. (TitleCase keys, singular lowercase module prefix).
- Grant them per role in `RolePermissionSeeder::$rolePermissions`. Administrator gets everything automatically. Ask the user which other roles should get which actions if it is not obvious.

### 2. Data layer

- `php artisan make:migration create_<table>_table --no-interaction`, then `php artisan make:model <Model> --no-interaction`.
- Model: `$fillable`, a `casts()` method, typed relationships, `SoftDeletes` if records should be archivable like leads.
- Only `UserFactory` exists in this project. Do not create a factory unless the user asks.

### 3. Authorization

- `php artisan make:policy <Model>Policy --model=<Model> --no-interaction`. Each ability returns `$user->hasPermissionTo('<module>.<action>')`, matching `LeadPolicy`. `forceDelete` is Administrator only.

### 4. Service

- `php artisan make:class Services/<Model>Service --no-interaction`.
- Each write method takes `array $attributes, User $actor`, runs inside `DB::transaction()`, writes an `Activity` row (`type` = module, `action` = `created|updated|assigned|archived`, `entity_id`, `user_id`, optional `meta`), and dispatches a domain event (`php artisan make:event <Model>Created --no-interaction`).
- Put normalization (e.g. `BangladeshPhoneNormalizer::normalize()` for phone fields) in a private `normalize()` method.

### 5. HTTP layer

- `php artisan make:request Store<Model>Request` / `Update<Model>Request`. `authorize()` defers to the policy; use array-style rules; reuse existing enum-like string values via `Rule::in([...])`.
- `php artisan make:resource <Model>Resource` (list rows) and `<Model>DetailResource` (show page). Use `whenLoaded()` for relations.
- `php artisan make:controller Api/<Model>Controller --no-interaction`:
  - `index`: `Gate::authorize('viewAny', ...)`, validate filters inline (`search`, `status`, `per_page` 10–100), eager load, `->latest()->paginate($filters['per_page'] ?? 20)->withQueryString()`, return `Resource::collection(...)->additional(['metrics' => [...], 'status_counts' => ...])`. Metric entries are `['value' => string, 'detail' => string]`.
  - `store` returns `Resource::make(...)->response()->setStatusCode(201)`; `destroy` returns `response()->json(status: 204)`.
  - Writes go through the service — controllers never call `Model::create()` directly.

### 6. Routes

- `routes/api.php`, inside the existing `Route::middleware(['web', 'auth'])` group, one line per route:
  `Route::get('<plural>', [XController::class, 'index'])->middleware('permission:<module>.view')->name('api.<plural>.index');`
  Declare static segments (`/assignable-users`, `/import/template`) **before** `/{model}` routes.
- `routes/web.php`, inside the `['auth', 'verified']` group: `Route::inertia('<plural>', '<plural>/index')` and a `show` closure that passes only the id: `Inertia::render('<plural>/show', ['<model>Id' => $model->id])`.

### 7. Frontend

- Activate the `inertia-react-development` skill and follow `.ai/rules/style-guideline.md`.
- Run `npm run build` (or have `npm run dev` running) so Wayfinder generates `@/routes/api/<plural>` and `@/routes/<plural>`. Never hand-edit those generated files.
- `index.tsx`: `CrmListPage` (title, description, four KPI `metrics` with `lucide-react` icons) + `DataTable` with columns from `columns.tsx`. Fetch with `useHttp` against the Wayfinder API route; keep filters (`status`, `page`, `search`) in the query string.
- Add/edit as dialogs (`add-<model>-dialog.tsx`), submitting with `useHttp<FormType>(api.store(), ...)`, passing `errors.<field>` to each field wrapper with `aria-invalid` on the input, and `toast.success()` / `toast.error()` from `sonner` — copy the form layout from `add-lead-dialog.tsx`.
- Gate buttons with `const { can } = usePermission(); can('<module>.create')`.
- Add a sidebar item in `app-sidebar.tsx` and map its title to `<module>.view` in the `permissions` record there.

### 8. Tests

- `php artisan make:test --pest <Model>ModuleTest --no-interaction`.
- Follow `LeadModuleTest.php`: `uses(RefreshDatabase::class)`, `beforeEach` seeds `RolePermissionSeeder`, a local `<model>User()` helper that creates a user with `User::query()->create()` and `assignRole(RoleEnum::Administrator->value)`.
- Cover: create + filter list, validation errors (`assertJsonValidationErrors`), show/update, delete, **and** a role lacking the permission receiving `403` (e.g. `RoleEnum::Receptionist`).
- If you added permissions, extend `tests/Feature/RbacTest.php` where it asserts role grants.

### 9. Finish

- `vendor/bin/pint --dirty --format agent`
- `php artisan test --compact --filter=<Model>ModuleTest` and `--filter=RbacTest`
- `npm run types:check` and `npm run lint:check` if frontend files changed.
