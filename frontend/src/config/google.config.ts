/**
 * Google Sign-In OAuth clients from the SugarBF Firebase project's google-services.json
 * (android/app/google-services.json, app entry for package com.nriconnectshaadi.app).
 *
 * webClientId     → oauth_client entry with client_type 3 (required for idToken on Android)
 * androidClientId → oauth_client entry with client_type 1 (created when you add your SHA-1)
 *
 * The backend must accept the same web client id: GOOGLE_CLIENT_ID in backend/.env.
 */
export const GOOGLE_WEB_CLIENT_ID = '887817604127-62iml2nfpdmcfl5b100riok8iepuo58l.apps.googleusercontent.com';

export const GOOGLE_ANDROID_CLIENT_ID = '887817604127-rr6ll0vki1569ihk9uuqqaomt2e9dphu.apps.googleusercontent.com';

export const isGoogleSignInConfigured = !GOOGLE_WEB_CLIENT_ID.startsWith('REPLACE_');
