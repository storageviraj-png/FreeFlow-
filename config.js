rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // FreeFlow only ever reads/writes under artifacts/freeflow-live/public/data/**.
    // Anonymous auth is enough to write (this is a trusted-operator tool, not a
    // public app) — anyone with the controller URL is assumed to be your team.
    match /artifacts/freeflow-live/public/data/{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
