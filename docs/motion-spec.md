# Motion Design Specification
_PRD §10A, §16, §32 — P0 Deliverable_

This document specifies all motion patterns used in the Wedding RSVP website. It serves as the single source of truth for the animation system, covering intent, implementation, easing, duration, and reduced-motion fallbacks.

---

## Design Philosophy

Motion in this product is **ceremonial, not decorative**. Every animation exists to:

1. Reinforce a sense of calm, intentional arrival
2. Connect narrative sections through visual continuity
3. Support comprehension by revealing content at the right moment
4. Never delay RSVP completion or obscure information

The emotional register is **slow, poised, and editorial** — closer to a luxury fashion film than a SaaS product.

---

## Global Easing & Duration Tokens

Defined in `src/app/globals.css`:

| Token | Value | Purpose |
|---|---|---|
| `--ease-standard` | `cubic-bezier(0.4, 0, 0.2, 1)` | UI state changes (hover, focus) |
| `--ease-editorial` | `cubic-bezier(0.65, 0, 0.35, 1)` | Cinematic reveals — slower deceleration |
| `--duration-fast` | `200ms` | Micro-interactions (hover color, focus ring) |
| `--duration-normal` | `400ms` | Component transitions (expand, fade) |
| `--duration-slow` | `800ms` | Section reveals |
| `--duration-very-slow` | `1200ms` | Hero entrance |

---

## Pattern Catalogue

### 1. Hero Content Entrance
**Page:** Homepage  
**Element:** `.heroContent`  
**Intent:** Cinematic arrival — the couple's names appear as if the invitation is being presented  
**Implementation:**
```css
animation: fadeIn var(--duration-very-slow) var(--ease-editorial);

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(20px); }
  to   { opacity: 1; transform: translateY(0); }
}
```
**Duration:** 1200ms  
**Trigger:** On page load (CSS animation)  
**Reduced-motion fallback:** Animation collapses to 0.01ms — content appears instantly, no movement

---

### 2. Welcome Text Scroll Reveal
**Page:** Homepage  
**Element:** `.welcomeText` (the editorial introduction paragraph)  
**Intent:** The welcome note arrives as the guest scrolls — connecting the cinematic hero to the RSVP invitation  
**Implementation:** IntersectionObserver in `page.tsx` adds `.visible` class at 20% visibility threshold
```css
.welcomeText {
  opacity: 0;
  transform: translateY(20px);
  transition: opacity 800ms var(--ease-editorial),
              transform 800ms var(--ease-editorial);
}
.welcomeText.visible {
  opacity: 1;
  transform: translateY(0);
}
```
**Duration:** 800ms  
**Trigger:** Scroll (IntersectionObserver, threshold 0.2)  
**Reduced-motion fallback:** `transition-duration: 0.01ms` — appears immediately when scrolled to; no movement

---

### 3. RSVP Layout Page Transition
**Page:** All RSVP pages (lookup, form, confirmation)  
**Element:** `.main` in `rsvp/layout.module.css`  
**Intent:** Smooth context shift from the editorial world into the task-oriented form experience  
**Implementation:**
```css
animation: fadeIn var(--duration-normal) var(--ease-standard);

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: translateY(0); }
}
```
**Duration:** 400ms  
**Trigger:** On page/route mount  
**Reduced-motion fallback:** Instant — no translation

---

### 4. Editorial Page Section Reveals (Schedule, Travel, FAQ)
**Pages:** Schedule, Travel, FAQ  
**Element:** `.section` in `editorial.module.css`  
**Intent:** Staggered entrance creates a reading rhythm — sections arrive sequentially as the guest scans  
**Implementation:**
```css
.section {
  animation: slideUp var(--duration-slow) var(--ease-editorial);
  animation-fill-mode: both;
}
.section:nth-child(2) { animation-delay: 100ms; }
.section:nth-child(3) { animation-delay: 200ms; }
.section:nth-child(4) { animation-delay: 300ms; }

@keyframes slideUp {
  from { opacity: 0; transform: translateY(20px); }
  to   { opacity: 1; transform: translateY(0); }
}
```
**Duration:** 800ms per section  
**Trigger:** On page load (CSS animation with fill-mode: both)  
**Reduced-motion fallback:** All sections appear immediately — no stagger, no movement

---

### 5. Page Title Fade
**Pages:** Schedule, Travel, FAQ  
**Element:** `.pageTitle` in `editorial.module.css`  
**Intent:** The page title introduces itself quietly before the content  
**Implementation:**
```css
animation: fadeIn var(--duration-normal) var(--ease-editorial);

@keyframes fadeIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}
```
**Duration:** 400ms  
**Trigger:** On page load  
**Reduced-motion fallback:** Instant appearance

---

### 6. RSVP Form — Attendee Details Expansion
**Page:** RSVP Form  
**Element:** `.detailsSection` in `rsvp/form/page.module.css`  
**Intent:** Meal and dietary fields expand smoothly when a guest selects "Attending" — progressive disclosure  
**Implementation:**
```css
animation: expand var(--duration-normal) var(--ease-standard);

@keyframes expand {
  from { opacity: 0; transform: translateY(-10px); }
  to   { opacity: 1; transform: translateY(0); }
}
```
**Duration:** 400ms  
**Trigger:** Conditional render — when `attendance_status === 'attending'`  
**Reduced-motion fallback:** Instant appearance — no translation

---

### 7. RSVP Review Panel Entrance
**Page:** RSVP Form (review state)  
**Element:** `.reviewCard` in `rsvp/form/page.module.css`  
**Intent:** The review summary arrives with a sense of completion — a quiet moment before final confirmation  
**Implementation:**
```css
animation: expand var(--duration-normal) var(--ease-editorial);
```
*(Reuses the `expand` keyframe)*  
**Duration:** 400ms  
**Trigger:** On `showReview` state change  
**Reduced-motion fallback:** Instant appearance

---

### 8. Confirmation Entrance
**Page:** RSVP Confirmation  
**Element:** `.container` in `rsvp/confirmation/page.module.css`  
**Intent:** The most expressive moment in the RSVP flow — a gentle scale-and-fade creates a ceremonial arrival  
**Implementation:**
```css
animation: elegantFadeIn var(--duration-slow) var(--ease-editorial);

@keyframes elegantFadeIn {
  from { opacity: 0; transform: translateY(20px) scale(0.98); }
  to   { opacity: 1; transform: translateY(0)   scale(1);    }
}
```
**Duration:** 800ms  
**Trigger:** On page mount  
**Reduced-motion fallback:** Instant — no scale or translation

---

### 9. Hover & Focus Micro-interactions
**All interactive elements:** links, buttons, inputs  
**Intent:** Responsive, tactile feedback — the interface acknowledges the user without demanding attention  
**Implementation:** CSS `transition` on `color`, `background-color`, `border-color`, `transform` properties
```css
transition: background-color var(--duration-fast) var(--ease-standard);
transition: border-color var(--duration-fast) var(--ease-standard);
```
**Duration:** 200ms  
**Trigger:** `:hover`, `:focus`  
**Reduced-motion fallback:** Transitions collapse to 0.01ms — state changes are instant but still occur

---

## Restricted Patterns (Not Used — Per PRD §10A)

The following patterns are explicitly prohibited and must not be introduced in future development without design review:

- ❌ Scroll hijacking (`overflow: hidden` on body, custom scroll drivers)
- ❌ Large animations before every interaction
- ❌ Autoplaying video or canvas sequences on guest pages
- ❌ Fast, bouncy, or spring-based easing on guest-facing elements
- ❌ Animations that hide or delay critical content
- ❌ Parallax depth effects (reserved for P1 consideration after perf testing)
- ❌ Animations that move keyboard focus unexpectedly

---

## Reduced Motion Implementation

All animations are globally suppressed via `src/app/globals.css`:

```css
@media (prefers-reduced-motion: reduce) {
  *,
  ::before,
  ::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

This single rule covers all CSS animations and transitions site-wide. The IntersectionObserver scroll reveal (item 2) still fires, but the transition that applies visibility collapses to 0.01ms, making it effectively instant.

**Verification:** Test with macOS System Settings → Accessibility → Display → Reduce Motion enabled (Safari/Chrome on macOS) or Android Developer Options → Animator Duration Scale set to 0.

---

## P1 Motion Roadmap

These patterns are deferred but should follow this specification's emotional register when implemented:

| Pattern | Notes |
|---|---|
| Pinned editorial homepage moment | `position: sticky` + scroll-progress opacity — reserved |
| Page transition animator | Route-level crossfade, 400ms max |
| Personalized confirmation animation | Brief particle or flourish, must complete < 1s |
| Image-led narrative parallax | Gentle (max 20px offset), GPU-only, must have static fallback |
