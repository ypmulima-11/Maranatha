# Choir Website — Implementation Plan (Updated 2026-08-04)

> **Status legend**: ✅ Done · 🟡 Partial · ⬜ Planned

## 1. Current Status — What Is Live

**Live at https://ypmulima-11.github.io/Maranatha/** (GitHub Pages, free)

| Area | Status | Notes |
|------|--------|-------|
| Public site (multi-page) | ✅ | index (home), about, works, events w/ countdown, team, gallery w/ lightbox, members, join (audition + donate + contact) |
| Bilingual EN/SW | ✅ | `i18n.js` `I18n` class, `data-i18n` attributes, persisted choice, portal included |
| Member portal | ✅ | `members.html#portal` — Supabase email+password auth, email confirmation, password reset (embedded on the Members page) |
| Roles | ✅ | `member` / `leader` / `admin` — admin manages roles via portal dropdown |
| Member resources | ✅ | Role-gated text resources (member/leader/admin) via portal |
| Public forms stored | ✅ | Auditions, contact messages, newsletter → Supabase tables with RLS (needs section 8 of SQL run) |
| Admin content CMS | ✅ | `admin.html` — edits `content.json` through the GitHub API (news/events/videos/team/members/gallery/works) |
| Anti-spam | ✅ | Honeypot fields on public forms |
| Add-to-calendar | ✅ | Google Calendar links on event cards |
| SEO | ✅ | Meta/OG/JSON-LD, robots.txt, sitemap.xml, noindex on admin/portal |
| OOP codebase | ✅ | ES6 classes: `SiteApp`, `SectionRenderer`, `I18n`, `MemberPortal`, `AdminApp`, `GitHubClient`, … |
| Leader workspaces (role-specific) | 🟡 | Portal UI live (`supabase-leader-workspaces.sql` needs a run in the SQL Editor); generic `leader_records` fallback for untitled leaders |
| Attendance (QR check-in) | 🟡 | Portal UI live (`supabase-attendance.sql` needs a run in the SQL Editor): sessions with rotating QR/code, 15-min late rule, leader roll + overrides, member history |
| Storage buckets (files) | ⬜ | No file uploads yet (avatars, sheet music, gallery originals) |
| Attendance tracking | ⬜ | Not started |
| Approval-based registration | ⬜ | Not started |
| Member directory | ⬜ | Site has public roster from content.json; no private member directory |

## 2. Key Decisions (Confirmed)

| Decision | Answer | Status |
|----------|--------|--------|
| **Choir type** | Catholic university student choir | ✅ |
| **Registration** | Open signup + email confirmation live. Admin invite + approval-based → future | 🟡 |
| **Member records privacy** | Full records visible to admins and leaders only | 🟡 (schema has no phone/gender yet) |
| **Grouping** | By voice part (SATB). Gender grouping → future | 🟡 |
| **Attendance** | Required — rehearsals & training days | ⬜ |
| **Voice parts** | SATB (Soprano, Alto, Tenor, Bass) | ✅ |
| **Choir size** | 50–80 members | ✅ (target) |
| **Languages** | English + Swahili, user-selectable, persisted | ✅ |
| **Hosting** | GitHub Pages (static) + Supabase (auth + DB) | ✅ |
| **Content management** | Non-technical admin via `admin.html` + portal | ✅ |

## 3. User Roles & Permissions

### Current (live)
| Role | Portal access | Resources | Manage members | Invites | Content CMS |
|------|:---:|:---:|:---:|:---:|:---:|
| **Admin** | ✅ full | all audiences | ✅ (roles + approve/reject) | ✅ | ✅ (`admin.html` + GitHub token) |
| **Leader** | ✅ | member + leader | ❌ | ❌ | ❌ |
| **Section Leader** | ✅ | member + leader | ❌ | ❌ | ❌ |
| **Member** | ✅ (after approval) | member only | ❌ | ❌ | ❌ |
| **Pending** | ⚠️ awaiting-approval screen only | ❌ | ❌ | ❌ | ❌ |
| **Guest** | ❌ (signup form) | ❌ | ❌ | ❌ | ❌ |

Registration model: every new sign-up lands as **Pending**; an admin approves or rejects it (portal → Pending registrations). Admin-issued **invite links** auto-activate the member with the invited role after email confirmation.

> [!IMPORTANT]
> **Privacy rule**: Full member records (phone, email, gender, join date, attendance history) are **only visible to admins and choir leaders**. Regular members see only names, photos, and voice parts in the directory.

## 4. Registration Flows

| Flow | Status |
|------|--------|
| **1. Admin invite** — admin creates invite link → member signs up through it → activated with the invited role after email confirmation | ✅ live (portal → Invite a member; link shared manually) |
| **2. Open signup** — visitor signs up → email confirmation → **pending** until admin approves | ✅ live |
| **3. Approval-based** — admin reviews pending signups and approves/rejects (portal → Pending registrations) | ✅ live |

Future: settings toggle to enable/disable each mode; automatic email to the admin when a signup lands.

## 5. Design Direction (Established)

- **Palette (live)**: deep liturgical green `#0d2a04`, gold `#BA7517`/`#FAC775`, warm off-white backgrounds — reflects the church-choir identity
- **Typography**: Playfair Display (headings) + DM Sans (body) — Google Fonts
- **Logo**: SVG "M" monogram favicon (data URI); PNG/social variant → future asset
- **Tone**: reverent, warm, contemporary church
- **i18n UI**: EN | SW toggle in top bar + portal header

## 6. Database Schema

### Live (in `supabase-setup.sql`, project `ojgutyougbyfbdoobtue`)
- `profiles` — id, email, full_name, voice_part, role (member/leader/section_leader/admin), **status (active/pending/inactive/rejected)**, title, phone, gender, year_of_study, course_program, preferred_language, avatar_url, bio, created_at
- `resources` — title, body, date, audience (member/leader/admin) — read requires status = active
- `events` — bilingual title/description, type, start/end, location, is_mandatory
- `event_rsvps` — one row per member per event (attending / not_attending / maybe), unique (event_id, member_id)
- `announcements` — bilingual, pinned flag, author
- `invites` — code, email, role, status (open/used/revoked), expiry 30 days
- `auditions` — name, email, voice_part, experience, message, status
- `contact_msgs` — name, email, subject, message, is_read
- `newsletter_subs` — email (unique)
- RLS on all; `handle_new_user` trigger (sets status pending); `admin_set_role`, `admin_set_status`, `claim_invite` RPCs

### Planned additions (next phases)

**Role-specific leader workspaces** (`supabase-leader-workspaces.sql`, written 2026-08-24, pending run): one table per role, each row typed by `record_type` and owned via `owner_id` (RLS: owner manages, admins read; subcommittee tables also readable by active leaders). The portal picks the workspace from the member's admin-assigned **title** (EN/SW aliases) and renders a matching form:

| Title match | Table | Record types |
|-------------|-------|--------------|
| Chairperson / Mwenyekiti | `chairperson_workspace` | meetings · sub-committee appointments · bank/official documents |
| Choir Master / Mwalimu Mkuu | `choirmaster_workspace` | rehearsals · song repertoire · ministry calendar · assistants |
| Secretary / Katibu | `secretary_workspace` | minutes · asset register · correspondence · membership records |
| Assistant Secretary / Katibu Msaidizi | `asst_secretary_workspace` | meeting support · backup minutes · communication drafts |
| Treasurer / Mtunza Hazina | `treasurer_workspace` | semester reports · bank transactions · contributions · expenses |
| Nidhamu / Liturujia / Media / Kijamii | `subcommittee_workspace` | meetings · activity reports · member issues · liturgy plans · media · social events |

Plus a `get_my_workspace()` RPC summarizing all of a leader's records. Leaders with no matching title keep the generic `leader_records` notes workspace.

```sql
-- ATTENDANCE (Phase 6)
CREATE TABLE attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  member_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT CHECK (status IN ('present','absent','late','excused')),
  check_in_time TIMESTAMPTZ, notes TEXT,
  marked_by UUID REFERENCES profiles(id), created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, member_id)
);

-- TRANSLATIONS (dynamic bilingual content)
CREATE TABLE translations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE, en TEXT NOT NULL, sw TEXT NOT NULL,
  context TEXT, created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Storage buckets (Phase 6)
1. `avatars` — member photos (public read, owner write)
2. `resources` — sheet music PDFs, recordings (auth read, admin write)
3. `gallery` — choir photos (public read, admin write)

## 7. Internationalization

| Piece | Status |
|-------|--------|
| `i18n.js` — `I18n` class, static dictionaries, `data-i18n`/`data-i18n-ph`/`data-i18n-aria`, localStorage persistence | ✅ |
| Site dict (~140 keys) + portal dict (~40 keys) | ✅ |
| Language toggle (site top bar + portal header) | ✅ |
| Per-user `profiles.preferred_language` + server-side fallback | ⬜ |
| `translations` table for bilingual dynamic content (events, announcements) | ⬜ |
| Split dictionaries into `en.json`/`sw.json` files | 🟡 optional |

## 8. Pages & Navigation

### Public (live — one-page site + portal pages)
| Page | Status |
|------|--------|
| Home (hero, next event countdown, CTA) | ✅ |
| About / Values / Stories | ✅ |
| Works (recordings + demo audio player) | ✅ |
| Events (public, from content.json + Add to calendar) | ✅ |
| News | ✅ |
| Team | ✅ |
| Members (public roster by voice part) | ✅ |
| Gallery + lightbox | ✅ |
| Join Us (form → Supabase) | ✅ |
| Donate (tiers; payment button → needs user's PayPal/M-Pesa) | 🟡 |
| contact (form → Supabase) | ✅ |
| Member portal (`members.html#portal`) | ✅ |
| Admin CMS (`admin.html`) | ✅ |

### Member pages (planned)
Dashboard (welcome, next event, pinned announcements, attendance summary) · My Profile (edit) · Events w/ RSVP · Resources (files) · Announcements · Directory (names + voice parts only)

### Admin pages (planned)
Admin dashboard (stats) · Manage members (grouped view, approve/reject) · Manage events (bilingual) · Take attendance · Attendance reports · Manage resources (files) · Manage announcements · Settings (registration modes)

## 9. File Structure (Actual vs Planned)

```
Maranatha/                          # live repo
├── index.html                      # Home (hero, features, news, CTA) ✅
├── about.html                      # about + values + stories ✅
├── works.html                      # music/recordings + demo player ✅
├── events.html                     # events + countdown + media highlights ✅
├── team.html                       # leadership ✅
├── gallery.html                    # gallery + lightbox ✅
├── members.html                    # public roster by voice part + member portal (login/signup/dashboard) ✅
├── join.html                       # audition form + donate + contact ✅
├── admin.html                      # content CMS (GitHub API) ✅
├── maranatha.css / admin.css / members.css ✅
├── maranatha.js                    # SiteApp, SectionRenderer, NavUI, DemoPlayer, … ✅
├── admin.js                        # AdminApp, GitHubClient ✅
├── members.js                      # MemberPortal ✅
├── i18n.js                         # I18n class + dictionaries ✅
├── supabase-config.js              # live Supabase credentials ✅
├── supabase-setup.sql              # schema + RLS (sections 1–8) ✅
├── content.json                    # editable site content ✅
├── robots.txt / sitemap.xml ✅
└── images/                         # ⬜ empty — real photos needed
```

## 10. Verification

### Done
- Auth: signup → confirm email → sign in → sign out; password reset flow wired
- RLS verified live: tables readable, `admin_set_role` enforces admin-only
- i18n EN↔SW toggle + restore verified in headless browser
- Portal boot + all three pages render without JS errors (headless Edge tests)
- Form submit path verified (graceful failure before tables exist)

### Pending
- RLS privacy test for future phone/gender columns
- Attendance CRUD tests
- Screen-reader / keyboard pass on portal + admin

### Mobile + bilingual pass (2026-08-25)
Verified all pages at a true 390px viewport in EN and SW via headless Edge screenshots (iframe harness at real CSS width — `--window-size` alone is unreliable on Windows DPI). Layout was already sound; fixes made:
- **Auth-state bug**: `INITIAL_SESSION` was treated as signed-in, hiding the public roster and auto-scrolling everyone to the portal. Now branches on the actual session.
- **Mojibake**: 46 double-encoded characters (`â€"`, `Â·`) across 7 HTML files restored to proper `—` and `·`.
- **Anchor offsets**: `scroll-margin-top` on `#portal`/`#members` so deep links don't hide headings under the fixed header.

## 11. Roadmap

| Phase | Features | Status |
|-------|----------|--------|
| **1** | Supabase setup, auth, portal, roles, resources | ✅ done |
| **2** | Public site + content CMS + SEO | ✅ done |
| **2b** | i18n EN/SW (site + portal) | ✅ done |
| **2c** | Forms → DB (auditions/contact/newsletter), admin inbox, spam, calendar links, sitemap/robots | ✅ done (SQL section 8 pending run) |
| **3** | Events + RSVP + announcements (bilingual) — member side | 🟡 done; leader-side create/edit forms for events & announcements still needed |
| **5** | Registration modes: invite links, pending approval flow, section_leader role | ✅ done (SQL section 9 pending run) |
| **4** | Member directory (privacy-limited) + profile editing + `preferred_language` | ⬜ High |
| **6** | Attendance tracking + reports | ⬜ High |
| **7** | Resources v2: file uploads (Storage buckets), sheet music by voice part | ⬜ Medium |
| **8** | Donate payment (needs PayPal/M-Pesa details) + GA4 (needs ID) + real photos | ⬜ Medium |

## 12. Immediate Next Step

1. Run `supabase-leader-workspaces.sql` in the Supabase SQL Editor (idempotent — includes an upgrade path if the first draft was already run). Role-specific leader workspace cards then go live; verify with a test leader per role.
2. Run `supabase-attendance.sql` (idempotent; requires the events table from sections 8/9). Then: leader opens a session → members scan the QR (`members.html?code=XXXX`) or type the code → present/late auto-set (15-min grace), leader can override, codes rotate/expiring after 20 min.

## 13. Verification (leader workspaces, 2026-08-24)

Headless-Edge harness against the live portal code: title→workspace mapping for 17 EN/SW titles, config integrity (all fields/selects), form render + record-type switching, required-field validation, insert payload (types coerced, `owner_id`/`record_type`, subcommittee `committee_name` injection), delete routing, and generic fallback all pass. `members.html` loads with zero console errors.

## 14. Verification (attendance, 2026-08-25)

Headless-Edge harness (21 checks): check-in result messages (present/late/already/closed/invalid/error), code passthrough + input clearing, history rendering with status badges, session creation args, live-session card (QR canvas drawn, code shown, roll counts, unmarked quick-buttons), mark/unmark RPC routing, rotate/close RPCs. Caught and fixed a real bug during testing: unmark now goes through a `leader_unmark_attendance` RPC instead of a direct delete (no direct write grants on `attendance` by design). `members.html` loads with zero console errors.
