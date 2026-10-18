---
name: crm-permissions
description: "Use when adding, renaming, or changing permissions or roles in Confidence Global Bd CRM, deciding which role can do what, protecting a route/endpoint/button, or debugging a 403 or a hidden menu item. Covers PermissionEnum, RoleEnum, RolePermissionSeeder, route permission middleware, policies, Gate::before for Administrators, the shared auth.user.permissions Inertia prop, the usePermission hook, and RbacTest."
metadata:
  author: confidenceglobalbd
---

# CRM Permissions

Authorization uses `spatie/laravel-permission` with three layers that must stay in sync. A change in one layer almost always needs the others.

## Layers

1. **Definition** — `app/Enums/PermissionEnum.php` (`<module>.<view|create|edit|delete>`, plus `dashboard.view`, `settings.access`) and `app/Enums/RoleEnum.php` (`Administrator`, `Manager`, `Counselor`, `Finance Officer`, `Receptionist`).
2. **Grants** — `database/seeders/RolePermissionSeeder.php` `$rolePermissions` maps each role to its permissions. Administrator receives all cases. It also assigns `Receptionist` to any user without a role.
3. **Enforcement**
   - Route: `->middleware('permission:<module>.<action>')` on every web and API route.
   - Policy: `app/Policies/<Model>Policy.php` returns `$user->hasPermissionTo('<module>.<action>')`; controllers call `Gate::authorize()` or Form Request `authorize()`.
   - `Gate::before` in `app/Providers/AppServiceProvider.php` returns `true` for Administrators, so Administrator-only tests do not prove a permission works.
   - UI: `HandleInertiaRequests` shares `auth.user.roles` and `auth.user.permissions`; components call `usePermission().can('<module>.<action>')`. The sidebar maps nav titles to `<module>.view` in `app-sidebar.tsx`.

## Adding a Permission

1. Add the enum case (TitleCase key, dotted lowercase value).
2. Grant it to roles in `RolePermissionSeeder`. If the grant matrix is not specified, ask the user — do not guess which staff roles may delete or see finance data.
3. Attach the `permission:` middleware to the route(s) and the check in the policy.
4. Gate the UI control with `can()`.
5. Apply to existing databases with `php artisan db:seed --class=RolePermissionSeeder --no-interaction` (it is idempotent: `firstOrCreate` + `syncPermissions`). Tell the user this is needed in each environment.

## Known Quirks

- Universities have no permissions of their own; they reuse `opportunity.*`.
- Manager is granted create/edit for candidates, finance, and opportunities but **not** their `view` permissions in the seeder. Confirm with the user before "fixing" this — it may be deliberate.
- Permission names are cached; the seeder calls `forgetCachedPermissions()`. In tinker/tests after manual changes, call `app(\Spatie\Permission\PermissionRegistrar::class)->forgetCachedPermissions()`.

## Testing

- Seed in `beforeEach`: `$this->seed(RolePermissionSeeder::class)`.
- Test both directions with a **non-Administrator** role: a role with the grant gets `2xx`, a role without it gets `403` (`assertForbidden()`).
- Update `tests/Feature/RbacTest.php` when the grant matrix changes, then run `php artisan test --compact --filter=RbacTest`.
