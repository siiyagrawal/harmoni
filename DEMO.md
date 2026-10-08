# Harmoni demo walkthrough

## Run the app

1. Configure `NEXT_PUBLIC_CONVEX_URL` for the development Convex deployment.
2. Start the app with `npm run dev`.
3. Open the app in three separate browser profiles so each person has an independent demo session.

## Click-through: cards, exchange, intro, matching, access log

1. In browser A, choose **Create my card**, create a username and password, fill in the card, then finish onboarding so the card is published.
2. Open **Design my card**. Under **Haves and wants**, add `seed fundraising connections`, approve it, and set visibility to **Circle**.
3. In browser B, create another account and publish a card. Add `Seed fundraising introductions` as a **have**, approve it, and set visibility to **Circle**.
4. Copy browser B's public URL (`/c/<slug>`). Open it in browser C while signed out, choose **Share yours back**, create the third account, and publish its card. The pending exchange request will be sent after publishing.
5. From browser A, open browser B's public URL while signed in and choose **Share yours back**. This sends A's exchange request to B.
6. In browser B, open **Circle** and accept both pending exchange requests. The exchanges create mutual contacts and add the members to each other's circles.
7. In browser A, open **Circle** and confirm the match suggestion. Refresh runs automatically when the Circle tab opens. The suggestion reason should use B's approved, permitted `have` item.
8. In browser C, open B from **Contacts**, choose **Ask for intros**, select A, and send the request.
9. In browser B, open **Circle > Intro requests** and choose **Make the introduction**.
10. In browser C, confirm A now appears as a contact. In browser B, open the menu and choose **Who has seen my context**. A's matching read should be listed with the item, purpose, and time. A custom-grant entry also has a **Revoke access** action.

Each account uses a username and password. Password reset codes appear on screen; this demo sends no email and performs no email verification.

## Optional seed data

The menu's **Load demo data** item is hidden. Tap the Harmoni wordmark in the menu five times to reveal it. The mutation creates three real Convex sample users, published cards, circles, contacts, and approved persona items. It does not create sign-in accounts for those sample people. The seed is idempotent per account; **Start the demo over** clears the seed marker and data.

## Existing-data migrations

Keep the temporary optional legacy fields in `convex/schema.ts` while migrating an existing deployment. Run these internal mutations in order, repeating each paginated mutation with its returned cursor until `isDone` is true:

1. `migrations.backfillLegacyData` copies card contact fields into `fields`, creates circles, and migrates legacy wants and haves to approved circle-visible persona items.
2. `migrations.backfillContactSnapshots` copies old denormalized contact values into `snapshot`.
3. `migrations.backfillIntroducedBy` fills in introducer IDs for existing approved intro requests.
4. `migrations.hashLegacySessions` hashes any stored raw session tokens.
5. `migrations.clearLegacyCardFields` and `migrations.clearLegacyContactFields` remove the copied legacy values.

After the migration reports completion, remove the temporary legacy validators and indexes from the schema in a follow-up deployment. New writes already use canonical card fields, contact snapshots, and hashed sessions.

## Manual responsive checklist

### Phone: 375px wide

- Sign up, sign in, restore a session after refresh, sign out, and reset a password.
- Complete onboarding, edit a field, upload a photo/cover/logo, and confirm the saved state.
- Open a public card signed out; save it and share back through the account gate.
- Scan a card link with camera support; test the paste-link fallback.
- Review contacts, edit tags/notes/meeting place, accept an exchange, request an intro, and approve it.
- Open the persona editor and access log; verify controls remain tappable and no content overflows horizontally.

### Desktop: 1280px wide

- Confirm the app stays centered in the phone-style frame.
- Repeat the sign-in, card, public-link, scanner, contact, circle, persona, and access-log flows.
- Confirm the menu, sheets, card back QR, and account deletion confirmation fit within the viewport.

### Intro membership regression

- Have A and B exchange cards, then A and C exchange cards.
- B asks A for an introduction to C; A approves it.
- B opens C under Contacts. Confirm the detail loads, shows **Introduced by A**, and does not offer intros through C unless B separately joined C's circle.
- B opens A under Contacts. Confirm A's circle targets remain available.

## Demo limitations

- Authentication is demo-only username/password; there is no email verification, email delivery, Google sign-in, or OTP.
- Reset codes are shown on screen and expire after 15 minutes.
- Persona matching is deterministic overlap scoring, not an AI clone; no LLM calls are made.
- Convex migrations and deployment must be run in the connected development deployment before relying on existing data.
