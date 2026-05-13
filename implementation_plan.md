# Final Precision-Polish Pass — Luxury Wedding Microsite

A targeted polish pass across 10 priority areas. Each issue is classified as content/config fix, CSS/design fix, or structural code fix, with the exact files and changes identified.

---

## User Review Required

> [!IMPORTANT]
> **Missing venue image**: The venue reveal section references `/media/1778482861433.png` which does **not exist** in `public/media/`. This is why the venue box appears blank. I will create a styled fallback location card so the section never looks broken, and ensure the admin can upload a real venue image.

> [!IMPORTANT]
> **Closing image**: The current `couple-closing.jpg` is described as generic stock. I cannot source a personal/couple photo — the admin will need to upload one via the CMS. I will ensure the upload field is prominent and the fallback state is elegant.

> [!WARNING]
> **Email hardcodes "Amelia & Matteo"**: `src/lib/email.ts` (line 35, 40) and `src/lib/calendar.ts` (line 49) still reference placeholder couple names from a template. I will fix these to pull from CMS config or use the correct couple names.

> [!WARNING]
> **Scroll snap `mandatory` with `always`**: Current `page.module.css` uses `scroll-snap-type: y mandatory` with `scroll-snap-stop: always`. Long sections (FAQ with many items, schedule with multiple days) will trap users. I will change to `proximity` snap behavior.

---

## Open Questions

> [!IMPORTANT]
> **Venue reveal image**: Do you have a venue/Westin image to upload, or should I generate a placeholder? For now I will build an elegant fallback card that works without an image.

> [!IMPORTANT]
> **Closing background image**: Do you have a personal couple/venue/Singapore photo to replace `couple-closing.jpg`? I will make the admin upload field prominent, but the current image will remain until you upload a replacement.

---

## Assessment Summary

| # | Issue | Type | Risk | Impact |
|---|-------|------|------|--------|
| 1 | RSVP deadline shows "1 November 2026" (after wedding) | **Content/Config bug** | Low | High |
| 2 | Venue reveal blank image box | **Broken asset + code** | Low | High |
| 3 | Closing image feels generic | **Content/Config** | Low | Medium |
| 4 | Hero photos too washed out | **CSS fix** | Low | High |
| 5 | At-a-glance excessive empty space | **CSS fix** | Low | Medium |
| 6 | FAQ section underfilled | **Content + CSS** | Low | Medium |
| 7 | Travel labels over-stylized | **Code fix** | Low | Low |
| 8 | Schedule readability | **CSS fix** | Low | Medium |
| 9 | Monogram/signature motif refinement | **CSS + code** | Low | Low |
| 10 | Mobile/responsive QA | **CSS fixes** | Low | High |

---

## Proposed Changes

### Priority 1 — RSVP Deadline Logic/Content

**Root cause**: `RsvpSection.tsx` line 117 uses `globalConfig?.RSVP_DEADLINE_DISPLAY || '1 November 2026'`. The field `RSVP_DEADLINE_DISPLAY` does **not exist** in `db.json` config, so the hardcoded fallback "1 November 2026" always shows. Additionally, `FaqSection.tsx` line 14 has a hardcoded default FAQ "Please RSVP by 1 November 2026".

The actual `RSVP_DEADLINE` in config is `"2026-10-01T00:00:00Z"` (1 October) — which is correct. But it's never formatted for display.

#### [MODIFY] [RsvpSection.tsx](file:///e:/Antigravity-Workflow/workflow/src/components/sections/RsvpSection.tsx)
- Remove `RSVP_DEADLINE_DISPLAY` lookup
- Format `RSVP_DEADLINE` date for display using `Intl.DateTimeFormat` (e.g. "1 October 2026")
- Remove hardcoded "1 November 2026" fallback

#### [MODIFY] [FaqSection.tsx](file:///e:/Antigravity-Workflow/workflow/src/components/sections/FaqSection.tsx)
- Fix hardcoded default FAQ answer from "1 November 2026" to derive from config, or remove the RSVP FAQ from defaults (it's not in CMS data)

#### [MODIFY] [db.json](file:///e:/Antigravity-Workflow/workflow/src/data/db.json)
- Add `RSVP_DEADLINE_DISPLAY` field as `"1 October 2026"` for explicit admin control
- Add `WEDDING_DATE` field as `"2026-10-23T00:00:00Z"` for validation

#### [MODIFY] [editor page.tsx](file:///e:/Antigravity-Workflow/workflow/src/app/admin/editor/page.tsx)
- Add `WEDDING_DATE` field to Site Settings
- Add validation warning if RSVP deadline ≥ wedding date
- Add `RSVP_DEADLINE_DISPLAY` field (formatted display text)

#### [MODIFY] [email.ts](file:///e:/Antigravity-Workflow/workflow/src/lib/email.ts)
- Replace "Amelia & Matteo" with "Russell & Siaw Min" (or pull from config)
- Fix `from` email name

#### [MODIFY] [calendar.ts](file:///e:/Antigravity-Workflow/workflow/src/lib/calendar.ts)
- Replace "Amelia and Matteo" PRODID with "Russell and Siaw Min"

---

### Priority 2 — Venue Reveal Blank Visual Area

**Root cause**: `mediaUrl` in db.json points to `/media/1778482861433.png` which doesn't exist on disk. The component checks `config.mediaUrl` before rendering Image — so it renders an empty container.

#### [MODIFY] [VenueRevealSection.tsx](file:///e:/Antigravity-Workflow/workflow/src/components/sections/VenueRevealSection.tsx)
- Add a designed fallback location card when no image loads / no `mediaUrl`
- Fallback shows: venue name, address, monogram watermark, map pin icon, fine dividers
- Add venue address from `globalConfig.VENUE_ADDRESS`
- Add alt text support from config

#### [MODIFY] [VenueRevealSection.module.css](file:///e:/Antigravity-Workflow/workflow/src/components/sections/VenueRevealSection.module.css)
- Add styles for fallback location card
- Ensure mobile layout works for both image and fallback states

#### [MODIFY] [db.json](file:///e:/Antigravity-Workflow/workflow/src/data/db.json)
- Remove the broken `mediaUrl` pointing to nonexistent file
- Add `venueImageAlt` field

#### [MODIFY] [editor page.tsx](file:///e:/Antigravity-Workflow/workflow/src/app/admin/editor/page.tsx)
- Enhance venue_reveal editor with dedicated image upload, alt text, and description fields (currently uses generic editor)

---

### Priority 3 — Closing Image Personal Feel

#### [MODIFY] [ClosingSection.tsx](file:///e:/Antigravity-Workflow/workflow/src/components/sections/ClosingSection.tsx)
- Add venue text display (currently missing from rendering)
- Move inline styles to CSS module classes
- Add `alt` from config instead of hardcoded "Couple"
- Ensure date/venue pulled from config are rendered

#### [MODIFY] [ClosingSection.module.css](file:///e:/Antigravity-Workflow/workflow/src/components/sections/ClosingSection.module.css)
- Add `.signOff` and `.venueText` classes
- Add `.ctaGroup` class for button container

#### [MODIFY] [editor page.tsx](file:///e:/Antigravity-Workflow/workflow/src/app/admin/editor/page.tsx)
- Add alt text field to closing editor
- Add venue text field

---

### Priority 4 — Reduce Hero Image Wash/Fade

**Root cause**: Three overlapping opacity layers:
1. `.collageItem::after` — champagne multiply overlay at `opacity: 0.15`
2. `.contentOverlay` — gradient from `rgba(250,248,244, 0.2)` to `rgba(250,248,244, 0.8)`
3. `.content` card — `background: rgba(255, 253, 248, 0.65)` + `blur(16px)`

The bottom gradient at 80% opacity heavily washes out photos.

#### [MODIFY] [HeroSection.module.css](file:///e:/Antigravity-Workflow/workflow/src/components/sections/HeroSection.module.css)
- Reduce `.collageItem::after` opacity from `0.15` → `0.08` (warmer but subtler)
- Change overlay tint from grey-white to warm ivory: `rgba(250, 245, 235, ...)`
- Reduce `.contentOverlay` bottom gradient from `0.8` → `0.55`
- Reduce `.contentOverlay` top from `0.2` → `0.05`
- Slightly increase `.content` card background opacity to `0.72` to maintain text readability
- Add subtle `filter: contrast(1.04) saturate(1.06)` to `.image` for warmth

---

### Priority 5 — At-a-Glance Section Composition

**Root cause**: Container has `padding: var(--spacing-24)` and sits in a `min-height: 100vh` snap section. The 500px-wide card floats in the centre of a full viewport.

#### [MODIFY] [AtAGlanceSection.module.css](file:///e:/Antigravity-Workflow/workflow/src/components/sections/AtAGlanceSection.module.css)
- Remove `min-height: 100vh` (inherited from snap section wrapper)
- Reduce container padding to act as a transition
- Widen card to `max-width: 560px`
- Add padding to card
- Add faint monogram watermark as `::before` pseudo element
- Add a top/bottom fine rule

#### [MODIFY] [page.module.css](file:///e:/Antigravity-Workflow/workflow/src/app/page.module.css)
- Change `scroll-snap-type` from `mandatory` to `proximity`
- Remove `scroll-snap-stop: always` (allow scrolling through short sections)
- Keep `scroll-snap-align: start` on sections

#### [MODIFY] [AtAGlanceSection.tsx](file:///e:/Antigravity-Workflow/workflow/src/components/sections/AtAGlanceSection.tsx)
- Add monogram watermark from config if `ENABLE_MOTIF` is true

---

### Priority 6 — FAQ/Details Section Fills

#### [MODIFY] [db.json](file:///e:/Antigravity-Workflow/workflow/src/data/db.json)
- Add 6 more FAQ items (disabled by default isn't needed — just add them):
  - "What time should I arrive?"
  - "Where should I park?"
  - "Can I bring a plus-one?"
  - "Who should I contact on the day?"
  - "Is there wheelchair access?"
  - "Are photos allowed during the ceremony?"

#### [MODIFY] [FaqSection.tsx](file:///e:/Antigravity-Workflow/workflow/src/components/sections/FaqSection.tsx)
- Add detail cards row above accordion (Dress Code, Gifts, Contact, Arrival)
- Update default FAQs to remove hardcoded dates

#### [MODIFY] [FaqSection.module.css](file:///e:/Antigravity-Workflow/workflow/src/components/sections/FaqSection.module.css)
- Remove `min-height: 100vh` (allow natural content height)
- Add detail cards grid styles
- Adjust spacing for fuller feel

---

### Priority 7 — Travel Card Labels

#### [MODIFY] [TravelSection.tsx](file:///e:/Antigravity-Workflow/workflow/src/components/sections/TravelSection.tsx)
- Change labels:
  - `'M · R · T'` → `'MRT'`
  - `'B · U · S'` → `'BUS'`
  - `'D R I V E'` → `'DRIVING'`
  - `'H O T E L'` → `'HOTEL'`
  - `'A C C E S S'` → `'ACCESS'`
- Keep `letter-spacing: 0.35em` in CSS for small-caps feel

---

### Priority 8 — Schedule Readability

#### [MODIFY] [ScheduleSection.module.css](file:///e:/Antigravity-Workflow/workflow/src/components/sections/ScheduleSection.module.css)
- Increase `.time` font-size from `0.75rem` → `0.8125rem`
- Darken `.time` color from `--color-text-tertiary` → `--color-text-secondary`
- Increase `.eventName` clamp minimum from `1.25rem` → `1.375rem`
- Widen `.content` max-width from `900px` → `960px`
- Remove `min-height: 100vh` (let content breathe naturally for multi-day schedules)

#### [MODIFY] [ScheduleSection.tsx](file:///e:/Antigravity-Workflow/workflow/src/components/sections/ScheduleSection.tsx)
- Add optional intro sentence from `config.bodyCopy`

---

### Priority 9 — Monogram/Signature Motif Refinement

#### [MODIFY] [SignatureMotif.module.css](file:///e:/Antigravity-Workflow/workflow/src/components/SignatureMotif.module.css)
- Reduce opacity to `0.5` for subtlety
- Reduce font size to `1.125rem`
- Add `user-select: none`

#### [MODIFY] [AnchorNav.tsx](file:///e:/Antigravity-Workflow/workflow/src/components/AnchorNav.tsx)
- Add subtle "R & S" monogram as nav logo/brand element (left-aligned before nav links)
- Only show when motif is enabled

#### [MODIFY] [AnchorNav.module.css](file:///e:/Antigravity-Workflow/workflow/src/components/AnchorNav.module.css)
- Add `.brand` styles for left-aligned monogram

---

### Priority 10 — Mobile & Responsive QA

#### [MODIFY] [page.module.css](file:///e:/Antigravity-Workflow/workflow/src/app/page.module.css)
- Change snap from `mandatory` → `proximity` (fixes trapped scroll on long sections)
- Remove `scroll-snap-stop: always`

#### [MODIFY] Various section CSS files
- Audit and fix any `min-height: 100vh` on sections where content is shorter (FAQ, At-a-glance, Schedule)
- Ensure no horizontal overflow on mobile (travel cards, gallery)
- Verify CTA buttons have adequate touch targets (min 44px)
- Check text readability on small screens

---

## CMS/Admin Field Changes Summary

| Field | Location | Action |
|-------|----------|--------|
| `WEDDING_DATE` | `config` | **NEW** — ISO date for validation |
| `RSVP_DEADLINE_DISPLAY` | `config` | **NEW** — formatted display string |
| `COUPLE_NAMES` | `config` | **NEW** — for email/calendar templates |
| `venueImageAlt` | `venue_reveal` section | **NEW** — alt text for venue image |
| `venueText` | `closing` section | Already exists, ensure rendered |
| `imageAlt` | `closing` section | **NEW** — alt text for closing image |
| FAQ items | `faq` section | **EXPAND** — add 6 more default items |

---

## Verification Plan

### Automated / Dev Server Testing
1. `npm run build` — ensure no type errors or build failures
2. Dev server visual check of every section on desktop (1440px) and mobile (375px)
3. Verify RSVP deadline displays "1 October 2026" across RSVP section and at-a-glance
4. Verify venue reveal shows fallback card (no blank box)
5. Verify FAQ has 8 items and accordion works
6. Verify travel labels are readable
7. Verify hero photos are clearer
8. Verify scroll is not trapped on any section
9. Test RSVP form submission still works end-to-end
10. Admin editor: verify new fields save and persist

### Manual Verification
- Scroll through entire site on mobile viewport
- Check venue reveal, closing, hero visual quality
- Confirm admin can upload venue image and closing image
- Confirm RSVP deadline validation warning appears if deadline > wedding date

---

## Risks & Edge Cases

| Risk | Mitigation |
|------|------------|
| Reducing hero overlay too much makes text unreadable | Content card has backdrop-filter blur + increased card opacity |
| Snap proximity may feel less polished than mandatory | Can revert if user prefers; proximity is standard for variable-height content |
| FAQ with many items makes section very tall | Accordion keeps it compact; removed min-height ensures natural sizing |
| Venue fallback card without image looks intentional? | Designed with monogram, address, fine rules — premium look |
| Email template changes break if Resend not configured | Existing guard clause handles this gracefully |

---

## Implementation Order (Step-by-Step)

1. **P1: RSVP deadline** — config + display + validation + email fixes
2. **P2: Venue reveal** — fallback card + broken image fix
3. **P3: Closing section** — clean up inline styles, add venue text, admin fields
4. **P4: Hero wash** — CSS overlay adjustments
5. **P5: At-a-glance** — reduce section height, widen card
6. **P6: FAQ** — add content, detail cards, natural height
7. **P7: Travel labels** — simple string changes
8. **P8: Schedule** — font/color refinements
9. **P9: Monogram** — nav brand, reduced opacity
10. **P10: Scroll snap + mobile QA** — proximity snap, audit all sections
