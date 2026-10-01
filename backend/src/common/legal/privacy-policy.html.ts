/** Full Privacy Policy HTML served at GET /api/v1/privacy */
export const PRIVACY_POLICY_HTML = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="description" content="NRI Shaadi Privacy Policy" />
  <title>Privacy Policy | NRI Shaadi</title>
  <style>
    :root {
      color-scheme: dark;
      --bg: #12090b;
      --text: #fff7ec;
      --muted: #cbb5bb;
      --gold: #d4a017;
      --border: rgba(212, 160, 23, 0.25);
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: linear-gradient(145deg, #590d22 0%, var(--bg) 45%);
      color: var(--text);
      font-family: Inter, system-ui, -apple-system, Segoe UI, sans-serif;
      font-size: 16px;
      line-height: 1.7;
    }
    a { color: var(--gold); }
    .wrap { width: min(100% - 32px, 880px); margin: 0 auto; padding: 48px 0 72px; }
    .brand { font-size: 1.35rem; font-weight: 800; letter-spacing: 0.02em; text-decoration: none; color: var(--text); }
    .brand span { color: var(--gold); }
    h1 { margin: 28px 0 8px; font-size: clamp(2rem, 6vw, 3.4rem); line-height: 1.1; letter-spacing: -0.03em; }
    .meta { color: var(--muted); margin: 0 0 28px; }
    .notice {
      border: 1px solid var(--border);
      border-radius: 14px;
      padding: 16px 18px;
      margin: 0 0 32px;
      background: rgba(212, 160, 23, 0.08);
    }
    h2 { margin: 36px 0 12px; font-size: 1.35rem; }
    h3 { margin: 22px 0 8px; color: #f3d98a; font-size: 1.05rem; }
    p, ul { margin: 0 0 14px; }
    li + li { margin-top: 8px; }
    table { width: 100%; border-collapse: collapse; margin: 12px 0 20px; }
    th, td { text-align: left; vertical-align: top; padding: 12px; border-bottom: 1px solid var(--border); }
    th { color: var(--gold); font-size: 0.85rem; }
    footer { margin-top: 48px; padding-top: 20px; border-top: 1px solid var(--border); color: var(--muted); font-size: 0.9rem; }
  </style>
</head>
<body>
  <div class="wrap">
    <a class="brand" href="https://nri-api.sugarbf.club/api/v1/privacy">💍 NRI <span>Shaadi</span></a>
    <h1>Privacy Policy</h1>
    <p class="meta"><strong>Effective date:</strong> 29 September 2026 &nbsp;·&nbsp; <strong>Last updated:</strong> 29 September 2026</p>

    <div class="notice">
      <strong>For marriage-minded adults only.</strong> NRI Shaadi is a matrimony service for people
      who are at least 18 years old (and of legal marriageable age where they live) and are seeking a
      life partner. Profiles may be created by the member or by a parent, sibling, relative or friend
      on their behalf with their consent.
    </div>

    <p>
      This Privacy Policy explains how NRI Shaadi (“NRI Shaadi,” “we,” “us,” or “our”) collects, uses,
      shares, stores, and protects information when you use the NRI Shaadi mobile application and
      related services (the “Services”).
    </p>

    <h2>1. Information we collect</h2>

    <h3>Account and identity</h3>
    <p>
      We collect information used to create and secure your account, including phone number and,
      depending on how you sign in, name, email address, profile picture, and identifiers from
      Google, Apple, or Firebase Authentication.
    </p>

    <h3>Matrimony profile</h3>
    <p>
      You may provide who created the profile, name, gender, date of birth, height, marital status,
      children, religion, community/caste, sub-community, gotra, mother tongue, manglik status and
      horoscope details (birth time, birth place, rashi), country and city of residence, citizenship,
      residency/visa status, where you grew up, native place, willingness to relocate, education,
      occupation, employer, annual income, diet, smoking and drinking habits, hobbies, family details
      (family type, values, status, parents’ occupations, siblings, family location), an “about me”
      and “about family” description, and partner preferences. Some of these details (such as
      religion or caste) can be sensitive; you choose whether to provide them and they are used only
      to show and match profiles.
    </p>

    <h3>Photos and face verification</h3>
    <p>
      We collect profile photos you upload. If you verify your profile, we also collect a selfie
      and use Amazon Rekognition to compare faces between your selfie and profile photo. We store
      the verification status and confidence score. This may involve biometric-related data under
      applicable law and is used only for authenticity, trust, fraud prevention, and safety.
    </p>

    <h3>Communications and activity</h3>
    <p>
      We process interests sent, received, accepted and declined, messages, shortlists, profile
      visits, blocks, reports, and related timestamps. Messages are not end-to-end encrypted. Do not
      send passwords, payment card details, or government IDs in chat, and never send money to
      someone you have not met.
    </p>

    <h3>Contact details</h3>
    <p>
      Your phone number and email are never shown on your public profile. If you allow it in your
      settings, they are shown only to members you are connected with (both of you accepted each
      other’s interest) and who hold an active free trial or Premium membership.
    </p>

    <h3>Purchases and subscriptions</h3>
    <p>
      New members receive a 30-day free trial. After that, sending interests and messages requires
      NRI Shaadi Premium (₹300 per month). Purchases are processed by Google Play; we do not receive
      your card details. We receive product ID, purchase token, order ID, amount, currency, and
      subscription status/dates to verify purchases and unlock Premium.
    </p>

    <h3>Device and technical data</h3>
    <p>
      We collect platform, device model, app version, push notification token, IP address, request
      logs, authentication tokens, and security or error information. The app stores a login token
      and a local copy of your profile on your device so you stay signed in. NRI Shaadi does not
      require your GPS location.
    </p>

    <h3>Support and safety</h3>
    <p>
      If you contact us or report a member, we collect the information you submit, related account
      details, and moderation records such as warnings, blocks, and bans.
    </p>

    <h2>2. How we use information</h2>
    <ul>
      <li>create, authenticate, maintain, and secure accounts;</li>
      <li>build matrimony profiles and recommend matches based on your partner preferences;</li>
      <li>provide interests, connections, messaging, shortlists, profile visitors, and referrals;</li>
      <li>verify authenticity and help prevent impersonation, fraud, and romance scams;</li>
      <li>manage your free trial and process Premium subscriptions;</li>
      <li>send service, security, and push notifications;</li>
      <li>investigate reports and enforce our rules;</li>
      <li>provide support and improve reliability; and</li>
      <li>comply with legal obligations.</li>
    </ul>
    <p>
      We do not sell your personal information. We do not use private messages or verification
      selfies for third-party advertising.
    </p>

    <h2>3. Legal bases</h2>
    <p>Where required by law (including India’s DPDP Act, GDPR/UK GDPR, and applicable US/Canadian/Australian law), we rely on:</p>
    <ul>
      <li><strong>Contract</strong> — to provide the Services and manage purchases;</li>
      <li><strong>Consent</strong> — for optional and sensitive profile details, notifications, and face verification;</li>
      <li><strong>Legitimate interests</strong> — to operate, secure, and protect NRI Shaadi and members; and</li>
      <li><strong>Legal obligations</strong> — to comply with applicable law and lawful requests.</li>
    </ul>

    <h2>4. How information is shared</h2>

    <h3>Other members</h3>
    <p>
      Your profile details, photos, verification badge, and city/country of residence are visible to
      other registered members. Contact details are shared only as described above. Messages are
      shared with their recipients.
    </p>

    <h3>Service providers</h3>
    <table>
      <thead>
        <tr><th>Provider</th><th>Purpose</th><th>Data involved</th></tr>
      </thead>
      <tbody>
        <tr><td>Amazon Web Services</td><td>Hosting, database, photo storage, face comparison</td><td>Account data, photos, verification selfie/result</td></tr>
        <tr><td>Google Firebase</td><td>Phone auth and push notifications</td><td>Auth identifiers, device/push token</td></tr>
        <tr><td>Google Play</td><td>Premium subscriptions</td><td>Order, product, token, amount, status</td></tr>
        <tr><td>Google or Apple</td><td>Social sign-in (when you choose it)</td><td>Name, email, profile details, account ID</td></tr>
      </tbody>
    </table>

    <h3>Legal and safety</h3>
    <p>
      We may disclose information to comply with law, protect members and NRI Shaadi, investigate
      fraud or abuse, or in connection with a merger, financing, or sale of assets, subject to
      appropriate safeguards.
    </p>

    <h2>5. Profile visibility</h2>
    <p>
      You can hide your profile in Account Settings (for example, once you find your match);
      existing connections and messages remain available. Blocking limits future interaction but
      cannot remove copies another member already saved outside the app.
    </p>

    <h2>6. Data retention</h2>
    <ul>
      <li>messages are generally deleted after 90 days;</li>
      <li>when you delete your account, the profile is disabled and identifying details are anonymized;</li>
      <li>profile photos are removed when deletion is requested;</li>
      <li>the remaining account record is generally permanently purged after about 30 days; and</li>
      <li>purchase, fraud-prevention, ban, security, backup, or legal records may be kept longer where required.</li>
    </ul>

    <h2>7. Your rights and choices</h2>
    <p>Depending on where you live, you may request access, correction, deletion, restriction, objection, or portability. You can also:</p>
    <ul>
      <li>edit your profile, photos, and partner preferences in the app;</li>
      <li>hide contact details from connections, hide your profile, block members, or delete your account;</li>
      <li>revoke camera, photo, and notification permissions in device settings; and</li>
      <li>manage or cancel your Premium subscription in Google Play.</li>
    </ul>
    <p>
      Privacy requests: email <a href="mailto:support@sugarbf.club">support@sugarbf.club</a>.
      We may verify your identity before acting.
    </p>

    <h2>8. Security</h2>
    <p>
      We use reasonable technical and organizational safeguards, including encrypted connections,
      access controls, and secure cloud infrastructure. No system is fully secure. Keep your
      device and login secure, and report suspected unauthorized access promptly.
    </p>

    <h2>9. International transfers</h2>
    <p>
      NRI Shaadi serves Indians living around the world. We and our providers may process information
      in India and other countries, which may have different privacy laws. Where required, we use
      appropriate transfer safeguards.
    </p>

    <h2>10. Children’s privacy</h2>
    <p>
      The Services are not directed to anyone under 18. If you believe a minor created an account,
      contact us and we will investigate and delete it as appropriate.
    </p>

    <h2>11. Changes</h2>
    <p>
      We may update this policy as the Services or law change. The updated version will be posted
      at this URL with a revised “Last updated” date.
    </p>

    <h2>12. Contact</h2>
    <p>
      <strong>NRI Shaadi Privacy Team</strong><br />
      Email: <a href="mailto:support@sugarbf.club">support@sugarbf.club</a>
    </p>

    <footer>© 2026 NRI Shaadi. All rights reserved.</footer>
  </div>
</body>
</html>`;
