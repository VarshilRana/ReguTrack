# ReguTrack Supabase setup

## Connected Supabase project

- Project: ReguTrack
- Project ref: `nngbqxusmdqmfuftauov`
- Region: `ap-southeast-2`
- API URL: `https://nngbqxusmdqmfuftauov.supabase.co`

The browser client is configured in `js/supabaseClient.js`. It contains only the Supabase publishable key, which is intended for browser use. Never add a Supabase secret key or legacy service-role key to frontend code or commit one to GitHub.

## Local development

Serve the project over HTTP (for example, VS Code Live Server at `http://127.0.0.1:5500`). Do not open the HTML files directly with a `file://` URL; ES module imports and the Supabase client require an HTTP origin.

## Supabase Auth configuration

In Supabase Dashboard → Authentication → URL Configuration:

1. Set the Site URL to the application's deployed URL when available.
2. Add the local development origins/redirects you use, such as `http://127.0.0.1:5500/**` and `http://localhost:5500/**`.
3. Add the deployed application's auth page, for example `https://YOUR-DOMAIN/auth.html`.
4. Ensure Email sign-in is enabled. Confirm whether email verification should be required for the demo.

The auth page supports email/password signup, login, email password reset, and reset-link password update. The exact redirect URL must be allow-listed in the Supabase project.

## Initial administrator bootstrap

Self-registration never grants an administrator role. After the first account is created and email-confirmed, run this in Supabase SQL Editor, replacing the email with the account that should administer the project:

```sql
insert into public.user_roles (user_id, role, granted_by)
select id, 'admin', id
from auth.users
where lower(email) = lower('REPLACE-WITH-ADMIN-EMAIL')
on conflict (user_id, role) do nothing;
```

To grant a non-admin role to another existing account, use the same pattern with `'regulatory_affairs'` or `'reviewer'`. Do not grant roles from browser code.

## Current Phase 1 scope

- `profiles`: per-user profile fields, created automatically on signup.
- `user_roles`: trusted role assignments; users can read only their own roles and cannot grant or change roles.
- The protected workspace pages require a valid Supabase Auth session.
- Profile fields (name, job title, department) save to Supabase from Settings.
- Other Settings preferences and the existing products, CTD, regulatory, assessment, calendar, reports, and user-management demo data are still browser-local prototypes. They are not yet database-backed.
- Organization/workspace tables, data modules, Storage buckets, Edge Functions, real admin user management, and server-side business rules are scheduled for later phases.
