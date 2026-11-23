# Handoff — v1.9.7-final

**Date:** 2026-11-23
**Branch:** v2.0
**Tag:** v1.9.7-final
**Commit:** c8ead25

## Summary

Fixes the broken login template and adds a self-service registration flow. Also whitelists the new public routes in the auth guard so unauthenticated users can reach them.

## Changes in this release

### 1. Fixed LOGIN_TEMPLATE (Jinja corruption)
The login template had three separate Jinja errors causing a 500 on /login:
- Missing {% endif %} closing the outer if-require_2fa block
- Missing {% endif %} on the inline button
- Unclosed error div with missing {% endif %}

All three are fixed. /login renders normally.

### 2. Added /register route
New sections in web/app.py:

- REGISTER_TEMPLATE — standalone HTML template matching the dark theme of the login page.
- GET /register -> register_page() — redirects to / if already logged in, else renders the form.
- POST /register -> register_submit() — validates username (3-32 chars) and password (>=8 chars, must match), inserts into users.db with role="user", auto-logs-in on success.

### 3. Auth whitelist update
_enforce_auth() (around line 428) had a tuple of endpoints allowed without login. Updated to include register_page and register_submit. Without this, /register was being intercepted and redirected to /login?next=/register.

### 4. Login page link
Added below the sign-in button:
<a href="/register">Don't have an account? Register</a>

## Known caveats / follow-ups

- Public registration is open. Anyone who reaches the port can create an account. If exposed beyond LAN/Tailscale, consider an invite code or a REGISTRATION_ENABLED flag.
- Role assignment: new accounts always get role="user". Promotion to admin requires editing users.db directly.
- PWA cache: The iPad PWA caches aggressively. Testing in Safari (not the home-screen icon) and/or clearing Safari website data is the reliable workaround.
- 2FA is not enforced at registration. Users may enable TOTP later from their profile.

## Files touched

- web/app.py — main changes
- HANDOFF-v1.9.7-final.md — this file

## Verification performed

- python3 -m py_compile web/app.py — clean
- /login loads without a 500
- /register loads and creates a user (testuser was created and auto-logged in)
- Existing admin login still works
- Backup: web/app.py.bak.v1.9.7-final (local)

## Restore instructions

If anything breaks, roll back locally:
  sudo cp /opt/mediagrabber/web/app.py.bak.v1.9.7-final /opt/mediagrabber/web/app.py
  sudo systemctl restart mediagrabber

Or from git:
  git checkout v1.9.6 -- web/app.py
