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
- Mobile viewport pass on all pages
- Screen-reader / keyboard pass on portal + admin

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

Run **sections 8 and 9** of `supabase-setup.sql` in the Supabase SQL Editor (public form tables + events/RSVP/announcements/invites/status columns). Then the portal's events, RSVPs, announcements, pending approvals and invite links all go live.
