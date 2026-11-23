# Admin: Minimum Required Actions

This document defines the minimum admin capabilities required to safely operate XPN social. It intentionally excludes advanced analytics, billing operations, promotion management, bulk automation, and other nonessential administration features.

## 1. Admin dashboard

The dashboard should show:

- Open reports
- Reports awaiting review
- Pending appeals
- Recently suspended or banned users
- Recently restricted or deleted content

## 2. Reports

Admins must be able to:

- List and search reports
- Filter by status and target type
- Open the reported user, video, comment, audio, message, announcement, playlist, or promotion
- Review the report reason and submitted details
- Assign the report to an admin
- Dismiss a report with a reason
- Apply a moderation action
- Mark the report resolved

Minimum report statuses:

- `open`
- `reviewing`
- `resolved`
- `dismissed`

## 3. User accounts

Admins must be able to:

- Search users by ID, username, or email
- View basic profile and moderation history
- Send a warning
- Temporarily suspend a user with an expiry date
- Permanently ban a user
- Unban or end a suspension
- Revoke all active sessions

Minimum account statuses:

- `active`
- `suspended`
- `banned`

Suspending or banning a user must require a reason. An unban must not automatically restore content that was separately removed.

## 4. Videos and releases

Admins must be able to:

- Review a video, caption, owner, visibility, audio, and current status
- Immediately hide or quarantine a reported video
- Remove/unpublish a policy-violating video
- Restore a video removed by mistake
- Soft-delete a video
- Cancel a scheduled release when its content is restricted

Minimum moderation statuses:

- `clear`
- `reviewing`
- `restricted`
- `removed`

Restricting or removing a video must also stop it from appearing in Feed, Discover, public profiles, public playlists, announcements, and promotions.

Permanent file deletion should not be part of the normal moderator workflow. Use soft deletion so evidence and appeals remain available.

## 5. Comments

Admins must be able to:

- View the reported comment and its conversation context
- Hide or remove a comment
- Restore a comment removed by mistake
- Warn, suspend, or ban the comment author when necessary

## 6. Audio

Admins must be able to:

- Review reported audio and its owner
- Withdraw audio for policy or rights violations
- Disable future reuse
- Restore audio after a successful review or appeal
- See which videos depend on the audio before confirming removal

## 7. Messages and announcements

Admins must be able to:

- Review a specifically reported message or announcement
- Mark a violating message unavailable
- Remove or stop an announcement
- Restrict the responsible user when required

Admins should not have unrestricted access to private conversations. Message access must begin from a report and be recorded in the audit log.

## 8. Appeals

Admins must be able to:

- List pending appeals
- Review the original moderation decision
- Approve or reject the appeal
- Uphold or overturn the original decision
- Restore the affected account or content when the decision is overturned
- Record a resolution visible to the affected user

## 9. Required confirmation fields

Every suspension, ban, content restriction, removal, restoration, or appeal decision must record:

- Action
- Reason code
- Admin explanation
- Acting admin
- Target user/content ID
- Previous status
- New status
- Date and time

## 10. Admin roles

The minimum roles are:

- **Moderator:** Review reports, warn users, and restrict or restore content.
- **Senior moderator:** Suspend/unsuspend users, ban/unban users, and decide appeals.
- **Super admin:** Manage admin accounts and permissions.

## 11. Audit log

The system must keep an immutable audit log for every admin action. Admins should be able to search it by admin, user, content ID, report ID, action, and date.

Audit records must not be editable or removable through the admin interface.

## Minimum admin pages

The first admin release only needs these pages:

1. Dashboard
2. Reports
3. Users
4. Content
5. Appeals
6. Audit log
7. Admin roles

