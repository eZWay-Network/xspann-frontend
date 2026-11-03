# XPN Social website lifecycle and workflow

**Customer journey for the current release · 3 November 2026**

A visitor can watch a public video immediately. To participate, they create one free XPN account. After sign-in they can go straight to the feed, finish what they came to do, or choose **Become an artist**. Creating an artist profile is free. An artist keeps the same login, followers, videos and access to the community.

This document describes the **intended experience of the upgraded customer website**. The Next.js checkout at `8afe6db` already has feed, search, profile, upload, posts, activity and account screens. Artist setup, billing, releases, messaging and promotions are destinations for the upgrade. Button names and the optional first-sign-in choice below describe proposed navigation. The business rules were checked against backend `3b547a9`. Its checked-in billing configuration disables live sales, and promotion bookings and pilot enrollment have separate readiness gates. [Web implementation plan](FRONTEND_API_IMPLEMENTATION_PLAN.md) · [Product scope](XPN_SOCIAL_IMPLEMENTATION_STEPS.md) · [Billing configuration](../config/billing.php) · [Promotion configuration](../config/promotions.php)

## The journey at a glance

```text
Visit the site or open a shared video → browse the public feed
    Choose a member action → register or sign in → complete account enrollment if required
        Continue as a fan → return to the video, profile or feed
        Become an artist → choose stage name and slug → save free artist profile
            → view artist page, open workspace or continue to the feed

From then on, the same person can move between:
    Feed and Discover → watch → follow, react, save, share or make a video
    Artist workspace → manage profile, playlists, releases, fans and analytics
    Inbox and Activity → mutual-follow conversations and opted-in artist updates
    Settings → account, communication preferences, web billing, safety and privacy
```

## 1. Arrive, register and enter the right screen

| Entry | What the person sees or does | Where they go next |
| --- | --- | --- |
| Guest visit | The customer site opens at `/feed`. A shared `/video/{id}` opens that video if it is visible. Guests can watch, search, explore public profiles, artists, playlists and sounds, read visible comments and share. | Keep browsing. When an action needs an account, preserve the intended destination and offer sign-in or registration. An unavailable shared video should offer a route back to browsing. |
| Email registration | Enter username, email, password and confirmation, plus an eligible date of birth. The pilot is 18+. Show the current terms, privacy and community policies and collect their versioned acceptances. Marketing is optional. | Registration leads to **Check your email**. Offer resend. The signed email link verifies the address on the backend, then the person signs in on the customer site. Registration and verification alone do not start a session. |
| Google sign-in or incomplete enrollment | Submit the Google credential. If the API returns `onboarding_required`, collect DOB and required acceptances and complete onboarding with the one-use token. An existing email login can also return this outcome. | Enter the site only after the API issues the account session. An expired onboarding token sends the person back through sign-in. A fully enrolled returning user skips these questions. |
| Active sign-in | Resume the original internal destination if there was one. If the person started artist enrollment, resume artist setup. On a first visit without a destination, offer **Continue to feed** and **Become an artist**. | A person can skip artist setup and return to it later from their own profile. An ordinary returning visit defaults to the feed. Never automatically post, follow, send or purchase on the strength of a pre-login click. |
| Restricted sign-in | A verified suspended account may receive a restricted session. Open recovery with the person’s own moderation decisions, appeals, privacy tools, policy actions and permitted billing controls. | They can review their own subscription/invoices and cancel renewal. Posting, artist tools, new purchases, portal access and resume require active access. |

**Account onboarding** establishes eligibility and policy acceptance. **Artist setup** creates an optional public identity on that account. A fan who only wants to watch, follow or post can complete the entire account journey without choosing a stage name or seeing checkout. [Account enrollment](../app/Http/Controllers/Api/V1/AccountController.php) · [Registration, verification and session responses](../app/Http/Controllers/Api/V1/AuthController.php) · [Customer access rules](../routes/api.php)

## 2. Become an artist, then return to the community

1. **Open artist setup.** Check the signed-in owner’s artist profile. If it already exists, open their workspace. If the owner lookup returns 404, offer **Create artist profile**. Each eligible account can own one profile.
2. **Choose the public identity.** Require a stage name and unique slug. Show the slug as the shareable identifier and keep the entered details if it is taken. Offer a bio, location, artist image, genres from the current taxonomy and a directory-listing choice. A listed, eligible artist appears in the directory. An unlisted, otherwise visible artist can still be reached by direct lookup.
3. **Save the profile before optional extras.** A successful save makes the free workspace available. Offer to add a labeled HTTPS link, such as a music or merchandise link, and to create a first playlist. Artists can publish from an empty workspace and organize videos later. Their existing eligible videos already belong to the same account.
4. **Give the artist a clear exit.** Offer **View artist page**, **Create a video** and **Continue to feed**. Returning via their own profile opens the saved workspace. On a public artist page, fans can browse releases and playlists or follow the artist. Following the artist updates the same relationship as following the underlying account.

The owner editor loads all saved values. The public artist page shows only the links, featured release and presentation currently available to that viewer and artist. Saving an unrelated edit must preserve content hidden after downgrade. [Artist profile and eligibility](../app/Services/Artists.php) · [Directory and public lookup](../app/Http/Controllers/Api/V1/ArtistController.php) · [Public and owner presentations](../app/Http/Resources/ArtistResource.php)

## 3. Watch, discover and participate

| Starting point | User action and outcome |
| --- | --- |
| **For You / Following** | Scroll through eligible published videos. For You supports guests. The Following feed requires sign-in and shows eligible videos from followed accounts. An empty Following feed should lead to Discover. Respect public, followers-only and private visibility when opening a feed item or shared link. |
| **Discover** | Search videos by caption, hashtag or creator, browse popular/latest videos, or search people. In Artists, search by stage name or slug, filter by genre and open the artist page. From a playlist, play the ordered items visible to this viewer. |
| **Video** | Open the creator’s profile or an available sound page. Like or save the video, comment, reply, change/remove a comment reaction, or share. Saved and liked collections belong to the viewer. A copied link or completed share handoff can record a share. Dismissing the share dialog leaves the count unchanged. |
| **Sound page** | Preview an available XPN sound, see eligible videos using it, save it, or choose it in Studio. Creation supports original and user-uploaded audio. If reuse is withdrawn, remove the option for new uses while allowing an otherwise available, previously rendered video to play. |
| **Profile / My Posts** | Edit the account avatar, name, username and bio. Review owned videos and their processing/publication states. Edit supported post metadata, change visibility, pin/unpin or confirm deletion. A public user profile omits private email and verification details. |

Visibility follows the viewer across feed, profile, sound, playlist and direct playback. If a creator restricts a video after someone saved it, the saved entry or an old link cannot override the new visibility. [Feed](../app/Services/VideoFeed.php) · [Discover](../app/Http/Controllers/Api/V1/DiscoverController.php) · [Video visibility](../app/Models/Video.php) · [Audio lifecycle](../app/Http/Controllers/Api/V1/AudioController.php)

## 4. Create a post or prepare an artist release

**Post now.** Any active, eligible member can select a video, add a caption, choose visibility and use original audio or an eligible library sound. A custom sound is uploaded and registered in the audio library with its own rights confirmation and reuse choice. The video also needs the current rights declaration and an explicit reuse choice. After upload, show **Processing**. Move to **Published** only when processing and publication succeed. The selected visibility determines who can watch. For a failure, show the owner the recorded state and an eligible retry action. If a create response is lost, check My Posts before offering another submission.

**Save a private draft.** In the artist workspace, the owner chooses **Save as draft** before upload begins. The file, cover and original-audio preview stay private while processing. A successfully encoded draft is **Ready to publish**. The owner can review it, edit allowed metadata, delete it, or publish it immediately at any artist tier. A published post cannot be moved back into the private draft workflow.

**Schedule a release.** A Pro artist with scheduling access chooses a future local time and time zone for a ready, eligible draft. Show the confirmed time and zone. The artist can reschedule, cancel back to draft, or explicitly publish an eligible ready release. Cancel the schedule before editing its content. At the due time, the backend rechecks access, rights, moderation and media availability. If eligibility lapses, the scheduled release can return to draft with a reason and an owner notice. The artist resolves the problem and makes a fresh publication decision.

**Organize and measure.** Add owned videos to a playlist, reorder them, set the playlist’s public/private visibility, and review the public result. Deleting a playlist leaves the videos intact. The artist workspace shows current followers and content totals, with collected 30-day trends on eligible plans. Display when collection began and leave missing days empty. A view count measures recorded views and should never be labeled as unique people reached. [Publication rules](../app/Services/Releases.php) · [Private media](../app/Services/ReleaseMedia.php) · [Playlists](../app/Services/ArtistPlaylists.php) · [Analytics](../app/Services/ArtistStatistics.php)

## 5. Build a fan relationship and communicate

| Choice | What it enables | How it ends or changes |
| --- | --- | --- |
| **Follow** | Adds an account relationship, updates follower totals and makes eligible posts available in Following. | Unfollow removes that relationship. Blocking removes follows in both directions. Unblocking allows a new follow. |
| **Message** | Two mutual followers who both allow direct messages can open their shared one-to-one text conversation. Opening it again returns the same thread. | Turning off DMs, unfollowing or blocking stops new sends. Available participant history remains subject to moderation and retention. Muting changes that participant’s alerts. |
| **Receive artist updates** | A fan explicitly opts in to that artist’s in-app updates using current consent wording. A fan may opt in without following. A follow, DM, purchase or marketing acceptance alone never enrolls them. | The fan can opt out for one artist or suppress updates globally. Queued delivery rechecks eligibility. Opting back in does not revive a suppressed delivery. |
| **Send an announcement** | An eligible Pro artist drafts plain text with an optional eligible owned public video, reviews the audience estimate, then sends. The current allowance is four accepted sends per paid period and at most 1,000 eligible recipients per send. | Show **Queued** on acceptance, then delivered/suppressed counts. A send retry must reuse its operation identity. The artist sees aggregates. Recipient identities and contact lists stay private. |

**Inbox and Activity serve different tasks.** Inbox holds conversations. Activity leads to the relevant post, comment, profile, message, delivered announcement or paused release. Opening a conversation marks only displayed messages read. Marking all alerts read leaves chat read positions intact. Relay prompts the website to fetch updated state. After a broken connection or a background tab returns, the website catches up from the API and deduplicates messages. [Conversations](../app/Services/Conversations.php) · [Consent and preferences](../app/Services/Communications.php) · [Announcements](../app/Services/Announcements.php) · [Read state](../app/Services/NotificationReads.php)

## 6. Subscribe, use paid tools and manage renewal

Fans can stay free. When an enrolled artist visits pricing or chooses a paid tool, the **customer website** shows the current offers, disclosures and availability from the API. The launch catalog is monthly in USD. [Catalog and sales gate](../app/Http/Controllers/Api/V1/BillingController.php) · [Artist capabilities](../config/artists.php)

| Artist access | What changes in the workspace |
| --- | --- |
| Free | Basic artist profile and directory listing when listed, one external link, one playlist and current totals. |
| Starter · $4.99/month | Enhanced profile, up to five links, one featured release, ten playlists and collected 30-day trends. |
| Pro · $19.99/month | Starter benefits, fifty playlists, enhanced directory card, scheduling, consent-based announcements and $5 of monthly boost credit per verified Pro paid period. |

**Purchase.** Artist selects an enabled offer → confirms the monthly terms → website creates one checkout attempt → Stripe hosts payment → customer returns to the website. The website saves the attempt reference before redirecting. A cancelled tab, double-click or network timeout should reopen or check the same attempt. If the artist returns before the invoice is reconciled, show **Confirming payment**. Unlock tools when the backend confirms the paid service period and returns effective capabilities. The browser’s success URL alone cannot grant access.

**Manage or leave a plan.** In Billing, the owner can view subscription status, paid-through date, invoices and available receipts, access the hosted portal, cancel renewal, or resume an eligible subscription before it ends. Cancellation preserves the verified paid period. A failed renewal creates no new period. To switch plans, let the old subscription and its paid access end, then start a new checkout. A return from the portal refreshes the workspace’s actual access.

**Downgrade.** Published videos remain subject to their existing visibility. Paid profile values stay saved and public presentation falls back to current limits. Over-limit playlists stay visible under their visibility rules and become read-only, with deletion available to bring the count down. Scheduled releases can pause and announcements require current eligibility. Existing undisputed promotion credit can survive downgrade. Purchases, billing screens, payment links and credit spending belong to web. An existing subscriber can use entitled features on another signed-in device through the same account. [Checkout lifecycle](../app/Services/Billing/Checkouts.php) · [Renewal actions](../app/Services/Billing/SubscriptionActions.php) · [Credit handling](../app/Services/Promotions/Credits.php)

## 7. Promote a release or take part in the complimentary pilot

**Sponsored video.** A listed, eligible artist chooses an owned public, published video, the current offer and a future start time. They review the advertising terms and separately confirm advertising rights. A draft can be prepared while booking is closed. Submission requires an enabled surface, sufficient available credit and a slot. The backend reserves credit and inventory together and sends the creative to staff for review.

**Draft → Pending review → Scheduled → Active → Completed** is the successful campaign path. A rejection, cancellation, interruption or loss of rights changes that outcome. During delivery, the designated web discovery surface shows **Sponsored**, sponsor identity and the creative together. The current offer reserves $5 of credit for a 24-hour rotation with up to five concurrent slots. Activation charges the reserved credit. Delivery measures eligible time on the observed surface. Render/click counts are informational. The artist can review delivery and available, reserved, used or held credit. For a shortfall, review the returned credit or explicitly accept/reject proposed replacement dates. A viewer can report the sponsored placement separately from its underlying video.

**Complimentary artist feature.** Staff first confirm pilot capacity. For each enrolled artist they schedule and record delivery of a seven-day featured-artist placement and one post on a named network account as separate monthly obligations. The artist sees the dates, status and available evidence for each. The public feature carries its complimentary disclosure. Buying Pro does not enroll an artist in this pilot. Spotlight, EPK and TV airings remain outside the current offer. [Campaign lifecycle](../app/Services/Promotions/Boosts.php) · [Pilot scheduling and evidence](../app/Services/Promotions/Placements.php) · [Release scope](XPN_SOCIAL_IMPLEMENTATION_STEPS.md)

## 8. Return, recover, report or close the account

| Situation | Website outcome |
| --- | --- |
| Return or log out | Restore a valid session and current capabilities, then resume browsing or the intended destination. If the session expires, offer sign-in. Logout returns to guest browsing, releases private browser previews, clears cached account and inbox data, and closes the realtime connection. Saved server releases remain in the owner’s workspace. |
| Forgot password or changed policies | The customer requests a reset email, opens the customer-site reset page and submits the token with the new password and confirmation. Resend and recovery responses protect account privacy. Where a fresh policy acceptance is requested, show the current version before recording it. |
| Block or report | Blocking immediately changes the relationship and communication permissions. Reporting records one specific target with a reason and returns a report ID the reporter can use to check its status. An authorized staff reviewer decides the report. A restriction can affect a video and dependent releases, playlists, announcements or campaigns. The affected owner can read their own decision and submit an eligible appeal for independent review. |
| Export data | In Settings, reauthenticate for export and request the archive. Show its status while it is prepared. When ready, only the owner can download through the expiring signed link. Refresh status if the link expires while the archive is still available. |
| Delete the account | In Settings, explain the consequences, reauthenticate specifically for deletion, and confirm. A signed-out path at `/delete-account` sends an email and requires explicit confirmation with its one-use token. On acceptance, show the reference and end the session immediately. Background work handles account, media and billing cleanup and applicable record retention. An accepted request is distinct from completed cleanup. |

Customer-facing decisions and fulfillment notices come back through the customer website. Staff use a separate authenticated workspace for moderation, independent appeals, promotion review, fulfillment evidence and operational recovery. [Moderation and appeals](../app/Services/Moderation.php) · [Privacy request lifecycle](../app/Services/PrivacyRequests.php) · [Staff handoff](ADMIN_STEP_3_REVIEW.md)

## One walkthrough from both sides

Maya opens a shared video and registers to save it. After verifying her email and signing in, she returns to the video and saves it. Later, from her profile, she chooses **Become an artist**, saves her stage name and slug, adds a music link, and goes back to the feed. She can publish her first public clip and put it in a playlist with Free access.

Leo discovers Maya’s clip, follows her and separately opts in to artist updates. Maya follows Leo back, so they can message if both allow DMs. When a Pro offer is enabled, Maya completes web checkout. Once her capabilities refresh, she schedules a ready private release. At the confirmed time the backend publishes it if it is still eligible. Maya can then attach the public release to an announcement. Leo receives it only if he remains eligible when delivery runs. If Maya later cancels renewal, paid tools last through her verified period and her published release remains available to eligible viewers. [Integrated journey tests](../tests/Support/ReleaseJourneys.php)
