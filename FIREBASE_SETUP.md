# Starry Wall Firebase setup

The site uses the existing Firebase Realtime Database, Anonymous Authentication, and optional App Check. No admin credential belongs in this folder.

## Required console setup

1. Create or select the Firebase project that will own `hamin.com` data.
2. Add a Web app and copy its public configuration values, including `databaseURL`, into `firebase-config.js`.
3. Keep the existing Realtime Database in `asia-southeast1`.
4. In Authentication > Sign-in method, enable Anonymous sign-in.
5. Publish `database.rules.json` in Realtime Database > Rules, or deploy it with the Firebase CLI from this directory after linking the correct project.
6. Add the production domain and any preview domain to Authentication > Settings > Authorized domains.

## Recommended before public launch

1. Create a score-based reCAPTCHA Enterprise Web key for the production domains.
2. Register the Web app in Firebase App Check with that key.
3. Put the public site key in `appCheckSiteKey` inside `firebase-config.js`.
4. Deploy first, monitor App Check metrics, then enable enforcement for Realtime Database and Authentication.

The rules allow public reads under `/wishes` and allow an anonymously authenticated visitor to create immutable wishes with server-generated push IDs. Each creation must atomically update the private `/wishCooldowns/<uid>` record, which Rules validate against Firebase's server clock to enforce a 30-second gap. Browser clients cannot read cooldown records or update/delete wishes, and every other database path is denied. Moderation must happen in the Firebase Console or through a trusted server/Admin SDK environment.
