# WCAG 2.2 AA manual review

Review date: 10 August 2026. Scope: all public routes, authenticated dashboard and management routes, detail/create/edit workflows, navigation shells, tables, pagination, forms, selectors, state messages, confirmation dialogs, QR/PDF actions, and responsive states listed for Phase 10.

## Method and tools

The review combined source/semantic inspection, deterministic Chromium rendering, Playwright keyboard input and focus assertions, axe-core automation, computed colour-contrast calculations, responsive screenshots, 320-pixel reflow checks, and reduced-motion emulation. Visual baselines used synthetic names, IDs, hashes, and dates only.

The in-app browser connection was unavailable. NVDA and Windows Narrator were not available, so no claim is made that a real screen reader was operated. Robustness was assessed through browser semantics, accessible-name/role assertions, landmarks, ARIA relationships, and axe's accessibility-tree analysis. A future release acceptance session should still include NVDA or Narrator with a human user.

## Findings and corrections

| Issue | WCAG 2.2 criterion | Severity | Correction |
|---|---|---|---|
| Confirmation dialogs did not move/trap/restore focus or close with Escape | 2.1.1, 2.1.2, 2.4.3 | High | Dialog now focuses its first meaningful control, cycles Tab/Shift+Tab, closes with Escape, and restores the trigger. |
| Closed mobile sidebar links remained focusable off-screen | 2.1.1, 2.4.3, 2.4.11 | High | Closed drawer is `visibility:hidden`; Escape/close returns focus to the menu trigger. |
| Verification tabs exposed tab roles without arrow/Home/End behavior or a named panel | 2.1.1, 4.1.2 | Medium | Implemented roving tabindex, arrow/Home/End navigation, `aria-controls`, and labelled tabpanel. |
| Tables lacked an accessible name and explicit column scope | 1.3.1, 2.4.6 | Medium | Added route-specific table names, `scope="col"`, and meaningful sort-button names. |
| Authentication validation text was not programmatically associated | 1.3.1, 3.3.1, 4.1.3 | Medium | Added `aria-invalid` and conditional `aria-describedby` relationships without changing messages. |
| Authenticated page headings used dark green on the dark workspace background (1.41:1) | 1.4.3 | High | Headings now use white (17.48:1); workspace eyebrow text uses light green (13.21:1). |
| Gold-only focus indication was weak against white surfaces | 1.4.11, 2.4.7 | Medium | Added a dark-green 3px focus outline plus a gold outer ring for light and dark contexts. |
| Lazy-page axe checks could scan before the final landmark mounted | Test reliability, not product failure | Low | Browser accessibility tests now wait for the routed page's existing H1 before analysis. |

No page title, navigation label, content wording, route, role rule, or section order changed.

## Perceivable review

- Informative Coat of Arms instances retain the meaningful `Zimbabwe Coat of Arms` alternative; CSS watermark images are decorative and absent from the accessibility tree.
- Lucide icons accompanying text are hidden from accessibility APIs by the library. QR evidence has a meaningful alternative.
- Status badges contain text in addition to colour. Alerts and empty/loading states contain readable text.
- Pages contain no important text only in images.
- One H1 exists on each audited route. Cards use H2 headings beneath page H1s without nonsensical jumps.
- Native labels wrap controls; required controls expose the native `required` state. Authentication errors now reference their inputs.

## Operable and keyboard review

Playwright drove Tab, Shift+Tab, Enter/click activation, arrow keys, Home, End, and Escape. Header links, login/recovery forms, verification tabs/form, workspace sidebar, management links/tables, selectors, pagination, credential PDF/revocation actions, and confirmation controls use native keyboard-operable elements.

Dialog tests confirm focus entry, forward/reverse trapping, Escape dismissal, and restoration. Mobile navigation confirms hidden links cannot receive focus and Escape restores the menu trigger. The authenticated shell's skip link targets `#main` and becomes visible on focus. No keyboard trap was found.

Route transitions preserve a usable loading status. Focus is not forcibly moved on ordinary navigation, matching standard browser navigation behavior; users can invoke the skip link in the persistent workspace shell.

## Contrast measurements

Calculated using WCAG relative luminance:

| Pair | Ratio | Result |
|---|---:|---|
| Brand green `#07543f` / white | 8.94:1 | AA/AAA normal text |
| Muted `#61706b` / canvas `#f4f6f5` | 4.79:1 | AA normal text |
| Error `#761919` / `#fcebec` | 9.48:1 | AA/AAA |
| Success `#165b39` / `#e0f5e9` | 7.11:1 | AA/AAA |
| White / danger `#a1242a` | 7.50:1 | AA/AAA |
| White / primary green `#064534` | 11.00:1 | AA/AAA |
| Gold `#e5b94f` / sidebar green `#063f33` | 6.44:1 | AA |
| Previous authenticated H1 `#063c30` / `#011e19` | 1.41:1 | Fail, corrected |
| Corrected white H1 / `#011e19` | 17.48:1 | AA/AAA |
| Corrected eyebrow `#b9eadc` / `#011e19` | 13.21:1 | AA/AAA |

The two-colour focus treatment provides a contrasting edge on both white and dark-green surfaces.

## Zoom, reflow, responsive, and motion

Reflow was exercised at 640 CSS pixels (a 200% equivalent for a 1280-pixel layout) and 320 CSS pixels (a practical 400% equivalent). Primary content and actions remained available without document-level horizontal scrolling. Tables intentionally scroll inside `.table-wrap`.

Reviewed viewports were 320×568, 375×667, 768×1024, 1024×768, 1280×720, and 1440×900. Cards stack, the mobile menu replaces the sidebar, dialogs remain viewport-bounded, the Coat of Arms preserves aspect ratio, and no unexpected page overflow was found.

With `prefers-reduced-motion: reduce`, smooth scrolling becomes `auto`, animations run once at effectively zero duration, and transitions reduce to 0.01ms. Loading text remains available independently of animation.

## Component results

- Landmarks: public banner/navigation/main/contentinfo and workspace navigation/main are present.
- Tables: named, scoped columns, native rows/cells, bounded horizontal scrolling, stable keys for returned records.
- Dialogs: modal role/name, focus containment/restoration, Escape handling, logical Cancel/Confirm order.
- Forms: visible labels; no placeholder-only names; native types/autocomplete; linked authentication errors.
- Alerts/status: errors use `role="alert"`; loading uses `role="status"`; success/status text does not depend on colour.
- Navigation: names and ordering are consistent across responsive states.

## Remaining limitations

- Real NVDA/Narrator speech output and browse-mode behavior still require a human-assisted Windows acceptance session.
- Automated contrast calculations and screenshot review do not replace testing every anti-aliased state on every physical display.
- Browser-native validation bubbles differ by platform and were not screen-reader-tested.
- Complex chart content has an accessible image name but not an equivalent data table; the numeric summary remains available. A future analytics-accessibility enhancement may add data-table alternatives without removing charts.
