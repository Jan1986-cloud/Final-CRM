import admin from 'firebase-admin';

let adminDb: admin.firestore.Firestore;
let isAdminSdkInitialized = false;

// New, simplified method: Use a Base64 encoded JSON string
const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON_BASE64;
let serviceAccount;

if (serviceAccountJson) {
  try {
    const decodedJson = Buffer.from(serviceAccountJson, 'base64').toString('utf-8');
    serviceAccount = JSON.parse(decodedJson);
  } catch (e: any) {
    console.error("!!! Error parsing FIREBASE_SERVICE_ACCOUNT_JSON_BASE64. Make sure it's a valid Base64 encoded service account JSON.", e.message);
  }
}

// Check if all necessary admin credentials are provided either via JSON or individual env vars
if (serviceAccount?.project_id && serviceAccount?.client_email && serviceAccount?.private_key) {
  try {
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      console.log("Firebase Admin SDK initialized successfully.");
    }
    adminDb = admin.firestore();
    isAdminSdkInitialized = true;
  } catch (error: any) {
    console.error("!!! Firebase Admin SDK initialization failed:", error.message);
    isAdminSdkInitialized = false;
  }
} else {
  // Fallback to legacy individual environment variables
  const legacyServiceAccount = {
    project_id: process.env.FIREBASE_PROJECT_ID,
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    private_key: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
  };

  if (legacyServiceAccount.project_id && legacyServiceAccount.client_email && legacyServiceAccount.private_key) {
      try {
        if (!admin.apps.length) {
          admin.initializeApp({
            credential: admin.credential.cert(legacyServiceAccount),
          });
          console.log("Firebase Admin SDK initialized successfully using legacy variables.");
        }
        adminDb = admin.firestore();
        isAdminSdkInitialized = true;
      } catch (error: any) {
        console.error("!!! Firebase Admin SDK initialization failed:", error.message);
        isAdminSdkInitialized = false;
      }
  } else {
    console.warn("********************************************************************************************************");
    console.warn("*** Firebase Admin credentials not set. App is running in OFFLINE MODE. ********************************");
    console.warn("*** TO CONNECT TO FIREBASE: ****************************************************************************");
    console.warn("*** 1. Get your service account JSON file from Firebase Console. ***************************************");
    console.warn("*** 2. Encode its content to Base64 (e.g., at https://www.base64encode.org/). **************************");
    console.warn("*** 3. Add to .env: FIREBASE_SERVICE_ACCOUNT_JSON_BASE64=<your_base64_string> **************************");
    console.warn("********************************************************************************************************");
  }
}


if (!isAdminSdkInitialized) {
    // This proxy will intercept any calls to `adminDb` and throw a helpful error
    // if the SDK is not initialized, preventing the app from crashing.
    adminDb = new Proxy({}, {
        get(target, prop) {
            const err = `Firebase Admin SDK not initialized. Cannot access 'adminDb.${String(prop)}'. Please check your server logs for configuration instructions.`;
            throw new Error(err);
        }
    }) as admin.firestore.Firestore;
}

export { adminDb, isAdminSdkInitialized };
