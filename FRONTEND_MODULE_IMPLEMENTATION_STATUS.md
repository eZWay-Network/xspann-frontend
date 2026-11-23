# XPN Social frontend module implementation status

**Status date: 12 November 2026.** This handoff follows the six-module structure in [FRONTEND_API_IMPLEMENTATION_PLAN.md](FRONTEND_API_IMPLEMENTATION_PLAN.md). It records the customer-web functionality present in this repository, the API operations connected to each module, the local verification completed, and the remaining work needed before production acceptance.

## Status definitions

| Status | Meaning |
| --- | --- |
| Implemented in frontend | The routes, UI, service calls, state handling, and focused local tests exist in this repository. |
| Partial | The main journey exists, but one or more API-supported lifecycle actions or synchronization paths remain incomplete. |
| Environment verification pending | The frontend compiles and local tests pass, but the journey still needs browser validation against the deployed API or an external provider. |

## Module summary

| Module | Frontend status | Main remaining acceptance work |
| --- | --- | --- |
| 1. Account enrollment, session recovery, and API client | Implemented in frontend | Validate complete registration, restricted-account recovery, export, and deletion journeys against deployed email and identity services. |
| 2. Free video, audio, and social experience | Implemented in frontend | Exercise signed and local uploads, media processing failures, visibility changes, and social actions with multiple real accounts. |
| 3. Artist discovery and owner workspace | Implemented in frontend | Validate plan-limit transitions, public visibility filtering, and playlist conflicts against the deployed API. |
| 4. Billing and private release scheduling | Partial | Complete the remaining release lifecycle gaps and run Stripe and scheduled-worker acceptance tests. |
| 5. Inbox, artist updates, notifications, and Relay | Implemented in frontend | Run real multi-account message, reconnect, consent, and announcement delivery tests. |
| 6. Promotions and placements | Implemented in frontend | Validate staff review, inventory, credit settlement, delivery, and replacement-date flows in staging. |

## 1. Account enrollment, session recovery, and API client

**Status: Implemented in frontend. Environment verification pending.**

### Completed user experience

- Registration collects date of birth and the current required policy versions.
- Email verification has a dedicated pending state and public resend action.
- Password and Google sign-in handle normal authentication, incomplete onboarding, and verification-required responses separately.
- Incomplete accounts can finish onboarding with the one-use onboarding token, date of birth, and current policy acceptance.
- The auth provider restores stored sessions, refreshes expiring tokens, preserves restricted-account state, and clears private session data on logout or an invalid current bearer.
- Settings support profile updates, password changes, communication preferences, current policy acceptance, report-status lookup, moderation decisions, and appeals.
- Privacy settings support password or linked-Google reauthentication, optional MFA, data export polling and download, and authenticated deletion requests.
- The public `/delete-account` flow supports email request and one-time-token confirmation for signed-out users.

### API integration

The frontend connects the following account groups:

- Authentication: login, Google login, registration, onboarding, current user, refresh, logout, verification resend, forgot/reset password, profile update, and password update.
- Policy acceptance: `GET /policies` and `POST /me/policy-acceptances`.
- Sensitive actions: `POST /auth/reauthenticate` with purpose-specific credentials and `X-Reauth-Proof` on export or deletion requests.
- Privacy: create/read/download export requests, authenticated deletion, public deletion request, and public deletion confirmation.
- Moderation: own report status, moderation decisions, moderation appeals, and appeal submission.

Primary implementation files:

- [src/components/common/auth-provider.tsx](src/components/common/auth-provider.tsx)
- [src/components/forms/auth-card.tsx](src/components/forms/auth-card.tsx)
- [src/components/settings/privacy-settings.tsx](src/components/settings/privacy-settings.tsx)
- [src/services/api.ts](src/services/api.ts)
- [src/services/auth.ts](src/services/auth.ts)
- [src/services/account.ts](src/services/account.ts)
- [src/services/moderation.ts](src/services/moderation.ts)

### State and failure handling

- API field errors are preserved through `ApiError`.
- Only a `401` for an authenticated request emits the unauthorized-session event.
- API downloads and private media use separate authenticated response handling.
- Export requests persist per account and continue polling while queued or processing.
- Restricted accounts retain access to the permitted recovery, privacy, appeal, and limited billing surfaces.

### Verification

- Account-safety tests cover required policies, safe return paths, restricted routes, export polling, and minimum-age validation.
- Repository-wide ESLint and TypeScript checks pass.
- The Next.js production build passes.

### Remaining acceptance work

- Test verification and password-reset email links on the deployed customer origin.
- Test linked-Google reauthentication and MFA with real identity-provider responses.
- Confirm export download expiry and refresh behavior against generated archives.
- Confirm accepted deletion immediately revokes the live session and finishes the expected customer redirect.

## 2. Free video, audio, and social experience

**Status: Implemented in frontend. Environment verification pending.**

### Completed user experience

- The feed supports For You and Following content, pagination, playback, visibility-aware deep links, and guest/authenticated states.
- Discover supports video and people search, with profile and video navigation.
- Profiles show owned content and relationship state. My Posts supports metadata editing, pinning, visibility changes, and deletion.
- The upload editor supports MP4, MOV, and WebM selection up to 500 MB, preview, trimming, crop mode, filters, cover position, original audio, library audio, and custom audio.
- Video uploads require the current rights declaration and an explicit reuse choice.
- Signed cloud upload and local multipart/chunk fallback are implemented.
- Immediate uploads remain in processing state until publication is confirmed.
- Sound pages support details, eligible videos, save/unsave, and reuse in upload.
- Social actions include follow/unfollow, like/unlike, save/unsave, view recording, completed-share recording, comments, replies, comment reactions, blocks, and target-specific reports.

### API integration

The frontend connects these operation groups:

- Videos and uploads: public video reads, feed reads, owner list, create, update, delete, view, signed upload negotiation, local upload, chunk upload, and upload completion.
- Audio: list, detail, related videos, owner creation/update/delete, saved audio list, save, unsave, and local audio upload.
- Social: follows, likes, saves, shares, comments, replies, reactions, blocks, blocked-user list, and reports.
- Discovery: videos, people, suggestions, profiles, follower lists, and following lists.

Primary implementation files:

- [src/components/upload/upload-video-form.tsx](src/components/upload/upload-video-form.tsx)
- [src/components/feed/feed-experience.tsx](src/components/feed/feed-experience.tsx)
- [src/components/posts/posts-manager.tsx](src/components/posts/posts-manager.tsx)
- [src/components/video/action-rail.tsx](src/components/video/action-rail.tsx)
- [src/components/comments/comments-panel.tsx](src/components/comments/comments-panel.tsx)
- [src/components/audio/sound-profile.tsx](src/components/audio/sound-profile.tsx)
- [src/services/videos.ts](src/services/videos.ts)
- [src/services/uploads.ts](src/services/uploads.ts)
- [src/services/audio.ts](src/services/audio.ts)
- [src/services/safety.ts](src/services/safety.ts)

### State and failure handling

- A lost video-creation response is treated as uncertain; the user is directed to Studio and My Posts instead of being told to upload again.
- Processing and publication states remain separate, so a ready private draft is not reported as published.
- Failed processing exposes a retry path where the API permits it.
- Private and restricted media are not treated as ordinary public image or video URLs.
- Share totals are recorded only after a completed native handoff or copy action.
- Reports require exactly one supported target type.

### Verification

- Video-processing tests cover immediate publication, private draft readiness, and processing failure.
- Notification tests cover repeated activity grouping and comment payload variations used by social actions.
- Repository-wide lint, TypeScript, and production build checks pass.

### Remaining acceptance work

- Exercise signed storage and every local/chunk upload path against deployment limits.
- Verify media withdrawal between audio selection and video submission.
- Run two-account visibility tests for public, followers-only, private, blocked, and restricted content.
- Confirm counters and list invalidation after repeated likes, saves, views, shares, comment deletion, blocking, and unblocking.

## 3. Artist discovery and owner workspace

**Status: Implemented in frontend. Environment verification pending.**

### Completed user experience

- Eligible users can create and edit an artist identity with stage name, slug, bio, location, image, genres, directory visibility, featured release, and external links.
- The artist directory supports search, genre filtering, latest/popular sorting, pagination, and public profile navigation.
- Public artist pages show profile details, featured release, releases, links, playlists, followers, follow state, and artist-update consent.
- Releases display 12 videos initially and load 12 more per request.
- Public playlists display five items initially. The playlist panel grows naturally for one to four items, caps at five visible items, and scrolls internally after more pages are loaded.
- Playlist detail pages show ordered visible videos.
- The owner workspace contains overview metrics, profile readiness, releases, playlists, fan announcements, and promotions.
- Playlist owners can create, edit, delete, reorder, and replace items. Version conflicts reload the latest record before the user reapplies changes.
- Over-limit playlists remain visible and read-only, with deletion still available.
- The playlist editor uses an accessible close icon button.
- Analytics preserve missing UTC dates as empty points instead of inventing zero values.

### API integration

The frontend connects these artist operations:

- Taxonomy, artist directory, slug lookup, artist detail, public videos, public followers, public playlists, and public playlist detail.
- Owner artist read/write, image upload, ordered links, analytics, and fan summary.
- Artist follow/unfollow and separate update-subscription consent.
- Owner playlist list/detail/create/update/delete and atomic item replacement with version and ordered video IDs.

Primary implementation files:

- [src/components/artists/artist-directory.tsx](src/components/artists/artist-directory.tsx)
- [src/components/artists/artist-profile.tsx](src/components/artists/artist-profile.tsx)
- [src/components/artists/artist-playlist.tsx](src/components/artists/artist-playlist.tsx)
- [src/components/studio/studio-workspace.tsx](src/components/studio/studio-workspace.tsx)
- [src/lib/artists.ts](src/lib/artists.ts)
- [src/services/artists.ts](src/services/artists.ts)

### State and failure handling

- Artist query keys include the current viewer where public responses are personalized.
- Profile updates preserve saved paid fields that may be hidden after downgrade.
- Playlist ordering uses owner items, including metadata-only unpublished entries, instead of rebuilding solely from the public video list.
- Playlist mutations invalidate owner and public playlist queries.
- Artist-update opt-in requires current consent wording and version; opt-out remains available independently.

### Verification

- Artist tests cover slug normalization, immutable playlist reordering, update payloads, downgrade preservation, missing analytics dates, and order-sensitive comparisons.
- Repository-wide lint, TypeScript, and production build checks pass.

### Remaining acceptance work

- Test plan upgrades and downgrades with saved featured releases, external-link limits, and over-limit playlists.
- Verify public playlist cover/count changes when an item becomes private, restricted, or unavailable.
- Run a stale playlist-edit conflict in two real browser sessions.
- Confirm follow counts and relationship state remain synchronized between artist and user-profile surfaces.

## 4. Billing and private release scheduling

**Status: Partial. Core billing and scheduling journeys are implemented.**

### Completed billing experience

- Pricing reads live plan names, amounts, currency, interval, capabilities, disclosures, environment, and checkout availability from the API.
- Checkout attempts use an account-scoped idempotency key and persist the exact selected plan and offer version before redirecting.
- Return and cancel pages recover the saved checkout reference and distinguish pending, expired, completed, and access-reconciliation states.
- Paid tools unlock only after entitlements confirm access.
- Billing settings show effective plan, paid-through date, renewal state, invoices, receipts, hosted portal access, cancellation, and resume actions.
- Conflicting renewal actions are disabled while reconciliation is pending.

### Completed release experience

- The upload page visibly offers **Post now**, **Save draft**, and **Schedule**.
- The Schedule option is gated by `release_scheduling`; accounts without access see the Artist Pro requirement.
- The selected local date and time are converted to an ISO-8601 whole-second instant with the browser’s IANA timezone and matching UTC offset.
- A scheduled upload follows the API lifecycle: upload as a private draft, wait for ready processing, read the current release version, then submit the schedule action.
- If scheduling fails after upload, the video remains a ready private draft and the API error is shown.
- Studio lists processing and publication states separately and supports schedule, reschedule, cancel schedule, immediate draft publication, processing retry, private preview, stale-version recovery, rights reconfirmation, and paused-schedule explanations.
- Release and owner-video caches refresh after upload and owner actions.

### API integration

Billing operations include plans, checkout creation/status, subscription, entitlements, invoices, portal, cancel, and resume. The Stripe webhook remains provider-to-backend and is not called from the browser.

Release operations include owner list/detail, draft update service, schedule/reschedule, cancel schedule, publish, processing retry, and owner preview media.

Primary implementation files:

- [src/components/billing/pricing-page.tsx](src/components/billing/pricing-page.tsx)
- [src/components/billing/checkout-result.tsx](src/components/billing/checkout-result.tsx)
- [src/components/billing/billing-settings.tsx](src/components/billing/billing-settings.tsx)
- [src/components/upload/upload-video-form.tsx](src/components/upload/upload-video-form.tsx)
- [src/components/studio/releases-panel.tsx](src/components/studio/releases-panel.tsx)
- [src/lib/billing.ts](src/lib/billing.ts)
- [src/lib/releases.ts](src/lib/releases.ts)
- [src/services/billing.ts](src/services/billing.ts)
- [src/services/releases.ts](src/services/releases.ts)

### State and failure handling

- Checkout identity is scoped to account, plan, and offer version.
- A completed redirect does not independently grant paid capabilities.
- Schedule conversion rejects invalid input, past times, and nonexistent daylight-saving times.
- A `409` release conflict directs the owner to reload the current version.
- A stale rights response requires the current declaration and version before another scheduling attempt.
- A `403` paid-action response refreshes entitlements.

### Verification

- Billing tests cover checkout reconciliation and exact checkout-attempt replay.
- Release tests cover whole-second offsets, IANA timezone preservation, past-time rejection, nonexistent DST times, and stale-rights classification.
- The visible upload scheduling flow passes ESLint, TypeScript, focused tests, and the production build.

### Remaining implementation work

- Connect the existing `updateRelease` service to a dedicated draft-edit UI and reconcile its payload fields with the current API reference.
- Show **Publish now** for eligible scheduled releases as well as drafts, because the API supports explicit publication from either state.
- When a release is deleted in My Posts, invalidate the release list and active release detail in addition to the owner-video list.
- On `release.updated`, invalidate the active release-detail query so an open editor immediately shows worker publication or a return to draft.
- Add explicit handling or tests for repeated daylight-saving times where the same wall clock has two valid offsets.

### Remaining environment acceptance

- Run Stripe test-mode purchase, cancellation return, delayed invoice, renewal failure, cancel/resume, expiry, and portal-return journeys.
- Confirm a ready draft stays private until explicit publication or its eligible due time.
- Confirm the backend worker publishes a due release and returns an ineligible release to draft with `paused_reason` and a notification.
- Test stale versions, rights changes, moderation changes, entitlement loss, and API downtime during schedule execution.

## 5. Inbox, artist updates, notifications, and Relay

**Status: Implemented in frontend. Environment verification pending.**

### Completed user experience

- Inbox combines direct-message conversations and delivered artist updates.
- Users can open the canonical conversation, paginate older messages, send text with a client message ID, mark displayed messages read, and mute or unmute a conversation.
- Message history merges older pages, newer catch-up pages, REST snapshots, and replayed sends without duplicating message IDs.
- Communication settings control direct messages, message alerts, new-conversation muting, and artist updates.
- Fans can opt in or out of one artist’s updates using current consent wording and version.
- Pro artists can create, edit, delete, preview, and send announcements with an optional eligible video.
- Announcement sending uses a durable idempotency key scoped to account, announcement, and version.
- Recipients can read announcement details, mark delivery read, open the attached release, or report the announcement.
- Activity supports paginated notifications, grouping, read/read-all/clear-read actions, and distinct destinations for conversations, announcements, and paused releases.
- Relay establishes one authenticated browser-session connection and uses events as hints to refresh REST state.

### API integration

The frontend connects conversation list/detail/open, message history/send, read cursor, conversation preferences, communication preferences, update subscription, fan announcement reads, owner announcement CRUD/send, notification list/read/read-all/unread-count/clear, realtime session, and channel authorization.

Primary implementation files:

- [src/components/messaging/inbox-page.tsx](src/components/messaging/inbox-page.tsx)
- [src/components/messaging/conversation-page.tsx](src/components/messaging/conversation-page.tsx)
- [src/components/messaging/announcement-page.tsx](src/components/messaging/announcement-page.tsx)
- [src/components/studio/announcements-panel.tsx](src/components/studio/announcements-panel.tsx)
- [src/components/activity/activity-page.tsx](src/components/activity/activity-page.tsx)
- [src/components/common/realtime-bridge.tsx](src/components/common/realtime-bridge.tsx)
- [src/services/messaging.ts](src/services/messaging.ts)
- [src/services/notifications.ts](src/services/notifications.ts)
- [src/services/realtime.ts](src/services/realtime.ts)

### State and failure handling

- Replayed message sends merge once by message ID.
- Message catch-up cannot skip a server gap and REST snapshots can replace redacted rows.
- Relay hints are deduplicated by opaque event ID and separated by resource domain.
- Connection failure preserves REST messaging and enables foreground polling.
- Token rotation retires the old Relay connection and its expiry timer.
- Notification grouping retains every unread notification ID so grouped items are marked correctly.

### Verification

- Messaging and Relay tests cover message merging, announcement send identity, hint deduplication, session expiry, token rotation, wire shapes, gap recovery, and snapshot replacement.
- Notification tests cover grouping, unread preservation, generic event classification, and nested/flat comment payloads.
- Repository-wide lint, TypeScript, and production build checks pass.

### Remaining acceptance work

- Test mutual-follow messaging permissions and block/unfollow transitions with two accounts.
- Test Relay reconnect, background-tab return, token refresh, and REST catch-up against the deployed provider.
- Verify announcement quota and oversized-audience errors using realistic recipients.
- Confirm opting out after queueing suppresses delivery and opting back in does not revive that suppressed delivery.

## 6. Promotions and placements

**Status: Implemented in frontend. Environment verification pending.**

### Completed user experience

- Discover renders eligible sponsored videos with disclosure, sponsor identity, render/click telemetry, and separate placement reporting.
- Featured artists render the complimentary-pilot disclosure and placement end date.
- The artist workspace shows promotion offers, credit balance, ledger history, boost campaigns, and complimentary placements.
- Artists can create and edit a campaign draft with an eligible public video, offer, future start time, and affirmative advertising-rights confirmation.
- Campaign submission uses a durable idempotency key and distinguishes unsaved edits, closed booking, conflicts, insufficient credit, inventory, and spending holds.
- Cancellable campaign states expose the versioned cancel action.
- Placement cards show scheduled dates, evidence, interruption reasons, and proposed replacement dates.
- Artists can accept or decline extension proposals with the current placement version.

### API integration

The frontend connects public offers, promoted inventory, promotion telemetry, featured artists, boost balance, boost ledger, campaign list/detail/create/update/submit/cancel, artist placements, and extension consent.

Primary implementation files:

- [src/components/studio/promotions-panel.tsx](src/components/studio/promotions-panel.tsx)
- [src/components/promotions/sponsored-strip.tsx](src/components/promotions/sponsored-strip.tsx)
- [src/components/promotions/featured-artists-strip.tsx](src/components/promotions/featured-artists-strip.tsx)
- [src/lib/promotions.ts](src/lib/promotions.ts)
- [src/services/promotions.ts](src/services/promotions.ts)

### State and failure handling

- Campaign starts must be future whole-second UTC instants no more than 90 days ahead.
- Submission identity is scoped to owner, campaign, and version.
- Telemetry storage keys do not expose signed placement tokens.
- Booking closure and version/state conflicts produce different recovery messages.
- Realtime boost and placement hints invalidate campaign, credit, inventory, and public placement queries.

### Verification

- Promotion tests cover start-time validation, submission identity, telemetry token privacy, and distinct campaign recovery messages.
- Repository-wide lint, TypeScript, and production build checks pass.

### Remaining acceptance work

- Submit a real campaign, approve it through the staff workspace, and verify scheduled, active, completed, rejected, cancelled, and interrupted states.
- Confirm reservation, charge, release, hold, refund, and replacement-date behavior against the deployed credit ledger.
- Verify render and click events deduplicate correctly with issued placement tokens.
- Test rights restriction during active delivery and confirm promotion serving stops without suppressing an otherwise eligible organic video.

## Cross-module verification record

The current frontend passes the following local checks:

- `node --test test/*.test.mjs`: 41 tests passed.
- `npm run lint`: passed.
- `npx tsc --noEmit`: passed.
- `npm run build`: passed with Next.js 16.3.4 using the repository’s webpack build command.

The Node test runner reports module-type warnings because `package.json` does not declare `"type": "module"`. The warnings do not fail the tests.

## Production release decision

Modules 1, 2, 3, 5, and 6 have complete frontend surfaces and local contract-focused validation, but still require deployed-environment acceptance. Module 4 should remain open until its release-detail synchronization, draft-editing, scheduled immediate-publication, and deletion-cache gaps are closed. Paid sales and promotion spending should remain gated until the Stripe, release-worker, inventory, credit, and staff-review journeys pass in staging.
