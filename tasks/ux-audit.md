# RxDesk UI/UX audit

**Date:** 04/04/2026
**Auditor:** Senior UI/UX researcher
**Focus:** Mobile-first UX issues and general UI/UX improvements
**Files reviewed:** 22 pages and components

---

## 1. Mobile bottom tab bar touch targets are below WCAG minimum
**Type:** UX
**Priority:** Critical
**Pages affected:** All app pages (app-shell.tsx)
**Current state:** Bottom tab items use `px-3 py-1` padding with `w-5 h-5` icons and `text-[10px]` labels. The resulting tap target is approximately 36x32px, well below the WCAG 2.5.8 minimum of 44x44px. The "More" button uses identical sizing.
**Proposed change:** Increase tab item minimum height to `min-h-[48px]` and width to `min-w-[48px]`. Change icon size to `w-6 h-6` and label to `text-[11px]`. Increase bottom nav height from `h-16` to `h-[72px]` and update `pb-20` to `pb-[88px]` accordingly.
**Why it matters:** Pharmacy staff use RxDesk during shifts with one hand, often while handling prescriptions. Undersized touch targets cause mistaps, especially for the "More" overflow which gates access to Time Tracking, Team, Settings, and Locations.

---

## 2. Landing page hero heading is unreadable on mobile
**Type:** UI
**Priority:** Critical
**Pages affected:** Landing page (page.tsx)
**Current state:** The hero `h1` uses `text-[56px]` with no responsive breakpoint. On a 375px screen, "Know your prescribers." alone is approximately 350px wide, and the second line causes horizontal overflow or cramped multi-line text.
**Proposed change:** Use responsive sizing: `text-[32px] sm:text-[40px] md:text-[56px]`. Apply the same scaling to the subhead (`text-[17px] sm:text-[19px] md:text-[21px]`) and section headings (`text-[28px] sm:text-[36px] md:text-[40px]`).
**Why it matters:** The landing page is the first impression for pharmacy owners evaluating the product. Unreadable text on mobile kills conversion.

---

## 3. Header action buttons overflow and stack poorly on small screens
**Type:** UI/UX
**Priority:** High
**Pages affected:** Providers, Prescriptions, Drug Reps, Time Tracking, Time Off, Locations, Team pages
**Current state:** Every list page uses `flex items-center justify-between` for the header with action buttons on the right. On a 375px screen, the `text-[40px]` heading plus multiple buttons (e.g., Providers has "Search NPI" + "Import CSV") causes horizontal overflow or forces the buttons to wrap awkwardly.
**Proposed change:** Stack the header on mobile: use `flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between`. Reduce the heading to `text-[28px] sm:text-[40px]`. Make action buttons full-width on mobile with `w-full sm:w-auto`.
**Why it matters:** Users cannot access "Upload CSV," "Search NPI," or "Log visit" actions when buttons are cut off or overlapping on mobile.

---

## 4. Provider table has no horizontal scroll wrapper on mobile
**Type:** UX
**Priority:** High
**Pages affected:** Providers directory, Time tracking entries, Upload history
**Current state:** The provider table hides columns via `hidden md:table-cell` and `hidden lg:table-cell`, but on the smallest screens (320-375px), even the visible "Provider" and "Rx count" columns can overflow their container. The time tracking table shows 4 columns (Date, Start, End, Duration) on mobile without any horizontal scroll container.
**Proposed change:** Wrap all tables in `<div className="overflow-x-auto -mx-4 px-4">` for mobile. Alternatively, convert the providers table to a card layout on mobile using `md:hidden` card view and `hidden md:block` table view. For time entries, show a stacked card layout on mobile.
**Why it matters:** Pharmacy techs checking provider data or time entries on their phone during a shift cannot read truncated or clipped table data.

---

## 5. Modal dialogs lack scroll safety and keyboard trap on mobile
**Type:** UX
**Priority:** High
**Pages affected:** Drug Reps (add rep, log visit), Time Tracking (add entry), Time Off (request), Locations (create), Team (invite, edit member)
**Current state:** All modals use `fixed inset-0 flex items-center justify-center`. On small screens, long forms (e.g., "Add location" with 8 fields) extend beyond the viewport with no `overflow-y-auto` on the modal content. The modal body has `max-w-md` but no `max-h` constraint. Focus is not trapped -- pressing Tab can navigate behind the modal overlay.
**Proposed change:** Add `max-h-[90vh] overflow-y-auto` to each modal inner `div`. Add `overscroll-behavior-contain` to prevent background scrolling. Implement focus trapping via a `useFocusTrap` hook or use Radix `Dialog` from shadcn/ui which handles this automatically. Add `Escape` key to close.
**Why it matters:** On an iPhone SE (568px tall), the "Add location" modal with 8 inputs (~500px content) is impossible to complete because the submit button is unreachable.

---

## 6. No error boundary or API failure handling on data-fetching pages
**Type:** UX
**Priority:** High
**Pages affected:** Dashboard, Providers, Prescriptions, Drug Reps, Correlations, Time Tracking, Time Off, Schedule, Planner, Team, Settings, Locations
**Current state:** All data-fetching pages use `fetch().then(r => r.ok ? r.json() : null)` with no catch handler or fallback UI. If the API returns a 500, the page silently shows nothing -- no error message, no retry button. Example: Dashboard line 42-50 uses `Promise.all` with no `.catch()`.
**Proposed change:** Add a consistent error state component (icon + "Something went wrong" + retry button). Wrap each fetch in try/catch. Show the error state when all fetches fail, and partial data with a warning banner when some fail.
**Why it matters:** When the backend is slow or down (common during deployments), users see a blank screen with no way to recover. They assume the product is broken.

---

## 7. Prescription analytics page header is cramped on mobile
**Type:** UI
**Priority:** High
**Pages affected:** Prescriptions page, Drug Rep Correlations page
**Current state:** The Prescriptions header row has a title, subtitle, a `<select>` dropdown, and an "Upload CSV" button all in `flex items-center justify-between`. On a 375px screen, the select + button alone are ~230px wide, leaving ~145px for the "Prescriptions" heading -- forcing a line break mid-word or clipping.
**Proposed change:** Move the select and button below the heading on mobile. Use `flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between`. Group the select and button in a row below.
**Why it matters:** The time range selector is a key interaction for analytics -- if it is pushed offscreen or obscured, users cannot change the date range.

---

## 8. "More" overflow menu has no backdrop dismissal indicator
**Type:** UX
**Priority:** Medium
**Pages affected:** All app pages (app-shell.tsx)
**Current state:** The "More" bottom sheet (line 418-435) appears as a white panel sliding up from the bottom tabs, but there is no overlay/backdrop behind it. The only way to close it is to tap a link or tap the "More" button again. There is no swipe-to-dismiss gesture.
**Proposed change:** Add a semi-transparent backdrop (`bg-black/20`) behind the more menu with `onClick={() => setMoreMenuOpen(false)}`. Add a drag handle bar at the top of the sheet for visual affordance. Close on any outside tap.
**Why it matters:** Users who accidentally open "More" have no obvious way to dismiss it, especially if they are unfamiliar with the app. This is a basic mobile pattern expectation.

---

## 9. Sidebar collapse toggle button is too small for touch
**Type:** UX
**Priority:** Medium
**Pages affected:** All app pages (app-shell.tsx, desktop only)
**Current state:** The sidebar collapse button (line 194-199) uses `p-1` with a `w-4 h-4` icon, resulting in a ~24x24px touch target. The sub-nav expand/collapse chevrons (line 231-240) use the same small target.
**Proposed change:** Increase collapse button to `p-2` with `w-5 h-5` icon (40x40px). Increase chevron buttons to `p-1.5` minimum. These are primarily desktop interactions but tablets in landscape are affected.
**Why it matters:** iPad users (a significant pharmacy hardware form factor) interact with the desktop sidebar layout via touch. The current targets are too small for reliable touch interaction.

---

## 10. Mobile menu overlay doesn't prevent body scroll
**Type:** UX
**Priority:** Medium
**Pages affected:** All app pages (app-shell.tsx)
**Current state:** When `mobileMenuOpen` is true (line 326-371), the overlay renders with `fixed inset-0` and an internal `overflow-y-auto`, but the body behind it can still scroll. This is because no `overflow-hidden` is applied to the body or html element.
**Proposed change:** Add `useEffect` that toggles `document.body.style.overflow = 'hidden'` when `mobileMenuOpen` or `moreMenuOpen` is true. Reset on cleanup.
**Why it matters:** Scrolling the body behind an open menu is disorienting and can cause users to lose their position on the page when they close the menu.

---

## 11. Settings billing plan cards are unreadable on mobile
**Type:** UI
**Priority:** High
**Pages affected:** Settings page (billing tab)
**Current state:** The pricing grid uses `grid grid-cols-3 gap-3` with no responsive breakpoint (line 374). Each card on a 375px screen gets ~107px width, making the plan name, price, features list, and "Switch to..." button severely cramped. The button text at `text-[12px]` in a 107px-wide card is nearly unreadable.
**Proposed change:** Change to `grid grid-cols-1 sm:grid-cols-3 gap-3`. On mobile, stack cards vertically with full-width layout. Each card should be a clear, scannable row.
**Why it matters:** Billing/upgrade is a revenue-critical flow. If users cannot read plan details on mobile, they cannot make informed upgrade decisions.

---

## 12. NPI search results have undersized "Add provider" buttons on mobile
**Type:** UX
**Priority:** Medium
**Pages affected:** NPI Search page
**Current state:** Each search result row has an "Add provider" button with `px-3 py-1.5 text-[12px]` (line 178-193). The tap target is approximately 90x28px -- height is well below 44px. The button is also the only actionable element per row, so the entire row should be tappable.
**Proposed change:** Increase button padding to `px-4 py-2.5` and text to `text-[14px]`, yielding ~100x40px. Consider making the entire row tappable to add the provider, with a secondary "Added" state.
**Why it matters:** Adding providers from NPI search is a core onboarding action. Every failed tap attempt slows down the pharmacy owner's initial setup.

---

## 13. Provider detail page loading skeleton assumes 4-column desktop layout
**Type:** UI
**Priority:** Low
**Pages affected:** Provider detail page
**Current state:** The loading skeleton (line 75-80) renders `grid grid-cols-4 gap-4` with no responsive breakpoint. On mobile, four skeleton cards render at ~80px each, which looks broken.
**Proposed change:** Match the actual content layout: `grid grid-cols-2 lg:grid-cols-4 gap-4` (which is what the real stat cards use on line 187).
**Why it matters:** Skeleton loaders should match the actual layout to avoid layout shift and give users an accurate preview of what is loading.

---

## 14. Signup flow skips the pharmacy setup step after email verification
**Type:** UX
**Priority:** High
**Pages affected:** Signup page
**Current state:** After creating an account (step "account"), the flow goes to "verify" which tells the user to check email and sign in. The "pharmacy" step is defined in the `Step` type but there is no path that navigates to it -- the flow goes account -> verify -> login. The `handleSetupPharmacy` function exists but is never reachable.
**Proposed change:** After email verification, redirect to the signup page with a token/state that advances to the "pharmacy" step. Or move pharmacy setup to a post-login onboarding flow that checks if the user has an org.
**Why it matters:** New users who sign up will never complete pharmacy setup through the signup flow. The org setup is presumably handled elsewhere, but the dead code and broken wizard create confusion.

---

## 15. No loading state differentiation -- "Loading..." text vs skeleton patterns
**Type:** UX
**Priority:** Medium
**Pages affected:** Providers, Drug Reps, Time Tracking, Time Off, Team, Locations
**Current state:** Some pages use skeleton pulse animations (Dashboard, Prescriptions, Provider Detail, Schedule, Planner, Settings), while others show plain `"Loading..."` text centered in a white box (Providers line 92, Drug Reps line 147, Time Tracking line 166, Time Off line 129, Team line 267). This inconsistency makes the app feel unpolished.
**Proposed change:** Replace all `"Loading..."` text states with skeleton pulse patterns matching the content layout (card skeletons for card views, row skeletons for lists). Create a reusable `<Skeleton>` component.
**Why it matters:** Consistent loading patterns reduce perceived wait time and make the app feel cohesive. Text-based loaders feel amateurish compared to the skeleton approach already used on other pages.

---

## 16. Dashboard stat card labels at 12px are difficult to read on mobile
**Type:** UI
**Priority:** Medium
**Pages affected:** Dashboard, Prescriptions, Provider Detail
**Current state:** Stat card labels use `text-[12px] uppercase tracking-wide` (e.g., "TOTAL RX (90D)", "ACTIVE PROVIDERS"). On mobile, 12px uppercase text with letter-spacing is at the lower boundary of readability, especially in bright pharmacy lighting.
**Proposed change:** Increase stat labels to `text-[13px]` with `font-medium` instead of `font-semibold uppercase`. Drop the uppercase treatment which reduces readability at small sizes. Use sentence case: "Total Rx (90d)" instead of "TOTAL RX (90D)".
**Why it matters:** Stat cards are the first thing users see on the dashboard. If labels are unreadable, the numbers lose context.

---

## 17. Drug rep "Log visit" modal has no provider selection
**Type:** UX
**Priority:** High
**Pages affected:** Drug Reps page
**Current state:** The "Log visit" modal (line 233-258) only captures drug rep, date, duration, and notes. There is no field to select which providers the rep met with. The visits list shows `v.providers` data, meaning the API supports provider linking, but the form does not expose it.
**Proposed change:** Add a multi-select provider picker to the visit form, allowing the user to link one or more providers from their directory. This is essential for the correlations feature to work -- without provider links, the correlation engine cannot match visits to prescription volume changes.
**Why it matters:** The entire value proposition of the correlations page depends on visits being linked to providers. Without this field in the form, the correlation feature is effectively non-functional for users who log visits through the UI.

---

## 18. Time tracking schedule management cards break on small mobile screens
**Type:** UI
**Priority:** Medium
**Pages affected:** Time Tracking page
**Current state:** Schedule management links use `grid grid-cols-2 lg:grid-cols-4 gap-3` (line 243). With 5 items, the grid renders as 2-2-1, leaving one orphaned card at half-width. Each card has a 36px icon box, a 14px label, and a 12px description -- workable but tight at ~170px width on a 375px screen.
**Proposed change:** Change to `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3` so cards stack vertically on the smallest screens. Alternatively, use `grid-cols-2 lg:grid-cols-5` and ensure all 5 items fill the grid evenly.
**Why it matters:** The orphaned 5th card looks like a layout bug. Stacking on small screens provides better readability for the card descriptions.

---

## 19. PTO approve/deny buttons lack confirmation
**Type:** UX
**Priority:** Medium
**Pages affected:** Time Off page
**Current state:** The approve (check) and deny (X) buttons (line 169-185) immediately fire the API call with no confirmation dialog. The buttons are `p-1.5` (roughly 28x28px) and placed side by side with only `gap-1` spacing (~4px). A mistap on "deny" when intending "approve" has no undo.
**Proposed change:** Add a lightweight confirmation: either an inline "Are you sure?" state on the row, or use a toast with an "Undo" action that delays the API call by 5 seconds. Increase button size to `p-2.5` and gap to `gap-2`.
**Why it matters:** Denying a time-off request by accident creates a real HR issue. The destructive action (deny) is right next to the constructive action (approve) with no safeguard.

---

## 20. FAQ accordion has no animation and loses scroll position
**Type:** UX
**Priority:** Low
**Pages affected:** FAQ page
**Current state:** FAQ items toggle between open/closed with a hard cut (no height animation). When opening a long answer near the bottom, the content shift can push other items offscreen. The `rotate-180` on the chevron has `duration-200` but the content itself has no transition.
**Proposed change:** Use `max-height` transition or the Radix `Collapsible`/`Accordion` component from shadcn/ui which provides smooth open/close animations. Auto-scroll the opened item into view on mobile.
**Why it matters:** Abrupt content shifts are jarring, especially on small screens where the viewport is limited. Smooth animations provide spatial context for what changed.

---

## 21. Team management dropdown menu can render offscreen
**Type:** UI
**Priority:** Medium
**Pages affected:** Team page
**Current state:** The per-user action dropdown (line 311-339) uses `absolute right-0 top-full` positioning. For users at the bottom of the list, the dropdown (with 4 items at ~160px height) renders below the trigger and can overflow below the viewport. There is no upward-flip logic.
**Proposed change:** Use a Radix `DropdownMenu` (already available via shadcn/ui) which auto-positions based on available space. Or add a check: if the trigger is in the bottom 200px of the viewport, position the menu above with `bottom-full` instead.
**Why it matters:** Actions like "Deactivate" being offscreen for the last user in the list means the admin cannot manage that user without scrolling mid-interaction, which closes the menu.

---

## 22. Form inputs in modals use h-9 (36px) which is below iOS minimum
**Type:** UX
**Priority:** Medium
**Pages affected:** Drug Reps (add rep, log visit), Time Off (request), Time Tracking (add entry), Locations (create)
**Current state:** Modal form inputs use `className="h-9"` (36px height). iOS Safari applies a zoom on focus for inputs shorter than 16px font size. While `text-[14px]` avoids the zoom, the 36px height makes inputs feel cramped and harder to tap accurately on mobile.
**Proposed change:** Standardize all form inputs to `h-11` (44px) to match the login/signup forms which already use this height. This is consistent with Apple HIG minimum touch target guidelines.
**Why it matters:** Inconsistent input heights between auth pages (h-11) and in-app modals (h-9) creates a jarring experience. The h-9 inputs are harder to interact with on mobile.

---

## 23. Landing page CTA buttons are not full-width on mobile
**Type:** UI
**Priority:** Medium
**Pages affected:** Landing page
**Current state:** Hero CTA buttons use `flex gap-3 justify-center` (line 55-66) with `px-6 py-3` fixed padding. On a 375px screen, the two buttons ("Start free trial" and "Sign in") sit side by side at ~170px each, which works but provides a small tap target. The pricing section CTA is an inline-block with similar sizing.
**Proposed change:** Stack buttons vertically on mobile: `flex flex-col sm:flex-row gap-3`. Make "Start free trial" full-width on mobile (`w-full sm:w-auto`) as the primary action, with "Sign in" as a secondary text link underneath.
**Why it matters:** The primary conversion action should be the most prominent, easiest-to-tap element on the page. A full-width button on mobile is standard for high-intent CTAs.

---

## 24. No visual indicator of which "More" menu items are active
**Type:** UX
**Priority:** Low
**Pages affected:** All app pages (app-shell.tsx)
**Current state:** The "More" overflow panel (line 418-435) renders all items with identical `text-sm text-[#1d1d1f]` styling. If the user is currently on a page accessible through "More" (e.g., Time Tracking, Settings), there is no active state highlight to show which page they are on. The bottom tab "More" button gets a blue highlight, but the specific page within "More" does not.
**Proposed change:** Add active state styling to the more menu items: check `pathname.startsWith(item.href)` and apply `bg-[#0071e3]/10 text-[#0071e3] font-medium` to the active item.
**Why it matters:** Users opening "More" to navigate should immediately see where they currently are. Without this, wayfinding requires reading every item.

---

## 25. Signup password field has no strength indicator or requirements display
**Type:** UX
**Priority:** Medium
**Pages affected:** Signup page
**Current state:** The password field (line 188-199) has `minLength={8}` and a placeholder "8+ characters" but no real-time strength indicator, no character counter, and no display of specific requirements. The login page has a show/hide toggle but the signup page does not.
**Proposed change:** Add a password strength meter below the field (weak/fair/strong with color bar). Show requirements checklist: 8+ characters, at least one number, etc. Add the same show/hide password toggle from the login page. Show validation errors inline as the user types, not just on submit.
**Why it matters:** Users who set a weak password will hit server-side validation rejection after waiting for the API call, creating frustration. Users who cannot see what they typed are more likely to forget their password immediately.
