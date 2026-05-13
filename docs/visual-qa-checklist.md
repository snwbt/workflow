# Visual QA Checklist
_PRD §24 — Required for launch sign-off_

> This checklist must be reviewed and approved by the couple or designated approver before the site is considered launch-ready.

---

## 1. Typography & Hierarchy

- [ ] Couple names (hero h1) render in Playfair Display at correct scale
- [ ] Body copy uses Inter with comfortable line-height and weight contrast
- [ ] Type scale feels editorial — generous spacing, not cramped
- [ ] At 200% browser zoom, hierarchy remains intact with no horizontal overflow
- [ ] All page titles (`<h1>`) are visually dominant on their respective pages

---

## 2. Color & Contrast

- [ ] Text contrast meets WCAG AA (≥ 4.5:1 for body, ≥ 3:1 for large text)
- [ ] Input field borders are visible against background (#E5E0D8 on #FAF9F6)
- [ ] Focus rings are clearly visible on all interactive elements (keyboard test)
- [ ] Error states use both red color AND text — not color alone
- [ ] Admin status badges (Attending / Declined / Pending) are distinguishable beyond color (text label present)

---

## 3. Homepage & Hero

- [ ] Hero fills viewport on mobile without horizontal scroll or cut-off CTA
- [ ] Couple names and RSVP button visible above the fold on a 375px screen
- [ ] Welcome note fade-in is smooth and does not cause layout shift
- [ ] Nav links are legible and appropriately subtle
- [ ] Hero background gradient creates depth without competing with content
- [ ] Page communicates a premium, romantic tone within the first screenful

---

## 4. Motion & Transitions

- [ ] Hero content fades in on load — slow, cinematic, non-jarring
- [ ] Welcome section reveals only when scrolled into view (IntersectionObserver)
- [ ] Editorial pages (schedule, travel, FAQ) animate sections in with staggered delay
- [ ] RSVP layout container fades in on page load
- [ ] Confirmation page entrance animation (`elegantFadeIn`) feels meaningful, not flashy
- [ ] No animation causes visible jank or layout shift on desktop or mobile
- [ ] No animation delays access to the RSVP CTA or form controls

---

## 5. Reduced Motion

- [ ] With `prefers-reduced-motion: reduce` set in OS:
  - [ ] Hero fade-in is instant (0.01ms)
  - [ ] Welcome text appears without sliding up
  - [ ] Editorial page sections appear without stagger or slide
  - [ ] Confirmation entrance animation is instant
  - [ ] All functionality remains fully accessible

---

## 6. RSVP Flow

- [ ] Lookup form inputs are ≥ 44px tall on mobile (comfortable tap target)
- [ ] "Finding…" loading state appears immediately on submit
- [ ] Generic error message shown on failed lookup (no name leak)
- [ ] Form pre-fills existing RSVP data when editing
- [ ] Declining an attendee immediately hides their meal section (no stale display)
- [ ] Plus-one field requires a name when status is "attending"
- [ ] Review panel appears correctly with all attendee details
- [ ] "Edit" button on review returns user to form with data intact
- [ ] Confirmation page shows accurate RSVP summary on first load
- [ ] Confirmation page shows accurate RSVP summary on refresh
- [ ] "We Will Miss You" messaging appears for fully declined parties
- [ ] Add-to-Calendar download produces a valid `.ics` file that opens in Apple Calendar and Google Calendar

---

## 7. Schedule & Travel

- [ ] Schedule shows only events the guest is invited to (test with a guest who has `e3` vs one who does not)
- [ ] Schedule shows events for guests not logged in (fallback public events)
- [ ] Travel page includes venue, hotels, shuttles, airport, AND accessibility section
- [ ] Accessibility section includes venue notes, parking, elevator, seating contact, transport

---

## 8. Admin Dashboard

- [ ] Stats load correctly (invited, attending, declined, pending, response rate)
- [ ] Meal counts and dietary restriction count display correctly
- [ ] Guest list table renders without horizontal overflow on a 1280px screen
- [ ] Guest list table wraps cleanly with `overflow-x: auto` on narrow screens
- [ ] All 7 filter controls have visible labels (not just placeholder text)
- [ ] Filtering by dietary, event, plus-one status, and last-updated all work correctly
- [ ] Edit modal opens with keyboard focus inside the dialog
- [ ] Edit modal closes on Escape key and returns focus to the Edit button
- [ ] Edit modal is keyboard-navigable (Tab cycles within the modal, Shift+Tab reverses)
- [ ] Saving an edit updates the guest list without page reload
- [ ] CSV export downloads and opens cleanly in Excel/Numbers

---

## 9. Accessibility Baseline

- [ ] All form inputs have associated `<label>` elements
- [ ] All error messages have `role="alert"` for screen reader announcement
- [ ] Remove plus-one button has `aria-label="Remove plus-one"`
- [ ] Edit modal has `role="dialog"`, `aria-modal="true"`, `aria-labelledby`
- [ ] Full keyboard navigation works end-to-end through the RSVP flow
- [ ] No content is conveyed by color alone

---

## 10. Mobile Specific

- [ ] Test on iPhone (Safari) — full RSVP flow completes without layout issues
- [ ] Test on Android Chrome — full RSVP flow completes without layout issues
- [ ] Admin dashboard is usable on a tablet (768px+)
- [ ] No horizontal overflow on any guest-facing page at 375px viewport
- [ ] Animations do not cause dropped frames (test with Performance tab in DevTools)

---

## Sign-Off

| Reviewer | Role | Status | Date |
|---|---|---|---|
| | Couple | ☐ Approved / ☐ Changes Needed | |
| | Designer / QA | ☐ Approved / ☐ Changes Needed | |
| | Wedding Planner | ☐ Approved / ☐ Changes Needed | |
