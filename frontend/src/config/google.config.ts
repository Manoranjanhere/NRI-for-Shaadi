/**
 * Google Sign-In OAuth clients from the NRI Shaadi Firebase project's google-services.json
 * (android/app/google-services.json, package com.nrishaadi.app).
 *
 * webClientId     → oauth_client entry with client_type 3 (required for idToken on Android)
 * androidClientId → oauth_client entry with client_type 1 (created when you add your SHA-1)
 *
 * The backend must accept the same web client id: GOOGLE_CLIENT_ID in backend/.env.
 */
export const GOOGLE_WEB_CLIENT_ID = '204663092059-p15o49d5pmceufe064ja2tbbs6f1sv18.apps.googleusercontent.com';

export const GOOGLE_ANDROID_CLIENT_ID = '204663092059-c4ehu92tar1h0m53f6v8ctncfqvrrfo4.apps.googleusercontent.com';

export const isGoogleSignInConfigured = !GOOGLE_WEB_CLIENT_ID.startsWith('REPLACE_');
