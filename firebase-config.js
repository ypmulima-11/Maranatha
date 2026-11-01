/* =====================================================================
   FIREBASE CONFIG (Optional Bridge for Firestore / Cloud Messaging)
   ---------------------------------------------------------------------
   By default, the Maranatha Member Portal pushes real-time announcement
   notifications instantly across all connected devices using your
   existing Supabase Realtime (Broadcast + Postgres Changes) setup.

   If you also want to mirror real-time announcement pushes through
   Google Firebase (Cloud Firestore real-time listeners and/or Firebase
   Cloud Messaging Web Push):
   1. Open https://console.firebase.google.com and select/create your project.
   2. Go to Project Settings → General → Your apps → Web app.
   3. Copy your firebaseConfig values into FIREBASE_CONFIG below.
   4. (Optional for FCM Web Push) In Project Settings → Cloud Messaging →
      Web configuration, generate a Web Push certificate and paste the
      key pair into `vapidKey`.
   ===================================================================== */

const FIREBASE_CONFIG = {
  apiKey: 'YOUR-FIREBASE-API-KEY',
  authDomain: 'YOUR-PROJECT-ID.firebaseapp.com',
  projectId: 'YOUR-PROJECT-ID',
  storageBucket: 'YOUR-PROJECT-ID.appspot.com',
  messagingSenderId: 'YOUR-SENDER-ID',
  appId: 'YOUR-APP-ID',
  vapidKey: '',
  databaseId: '(default)'
};

const FIREBASE_READY =
  Boolean(FIREBASE_CONFIG.apiKey) &&
  !FIREBASE_CONFIG.apiKey.includes('YOUR-') &&
  Boolean(FIREBASE_CONFIG.projectId) &&
  !FIREBASE_CONFIG.projectId.includes('YOUR-');

window.FIREBASE_CONFIG = FIREBASE_CONFIG;
window.FIREBASE_READY = FIREBASE_READY;
