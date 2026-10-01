/**
 * Seeds realistic NRI matrimony profiles (completed onboarding + one photo each).
 *
 *   node scripts/seed-test-users.js [count]
 *   node scripts/seed-test-users.js --prod --confirm-prod 40
 */
const {
  loadEnv,
  createPgClient,
  requireProductionConfirmation,
  randomFrom,
  randomReferralCode,
} = require("./lib/db");

const argv = process.argv.slice(2);

loadEnv(process.argv);
requireProductionConfirmation(argv);

const DEFAULT_COUNT = 24;

const MALE_NAMES = ["Aarav", "Arjun", "Rohan", "Karan", "Vikram", "Siddharth", "Harpreet", "Aditya", "Nikhil", "Rahul", "Imran", "Varun", "Pranav", "Gurpreet", "Ankit"];
const FEMALE_NAMES = ["Ananya", "Priya", "Kavya", "Simran", "Ishita", "Neha", "Meera", "Riya", "Aisha", "Pooja", "Divya", "Sneha", "Harleen", "Tanvi", "Shreya"];
const SURNAMES = ["Sharma", "Patel", "Singh", "Reddy", "Iyer", "Gupta", "Mehta", "Nair", "Kapoor", "Joshi", "Rao", "Chopra", "Desai", "Khan", "Menon"];

const PLACES = [
  { country: "United States", state: "California", city: "San Jose" },
  { country: "United States", state: "New Jersey", city: "Edison" },
  { country: "United States", state: "Texas", city: "Dallas" },
  { country: "Canada", state: "Ontario", city: "Toronto" },
  { country: "Canada", state: "British Columbia", city: "Vancouver" },
  { country: "United Kingdom", state: "England", city: "London" },
  { country: "Australia", state: "Victoria", city: "Melbourne" },
  { country: "United Arab Emirates", state: "Dubai", city: "Dubai" },
  { country: "Singapore", state: "Singapore", city: "Singapore" },
  { country: "Germany", state: "Bavaria", city: "Munich" },
  { country: "New Zealand", state: "Auckland", city: "Auckland" },
];

const RELIGION_PROFILES = [
  { religion: "hindu", communities: ["Brahmin", "Agarwal", "Kayastha", "Maratha", "Nair", "Reddy"], tongues: ["Hindi", "Gujarati", "Marathi", "Telugu", "Tamil", "Malayalam"] },
  { religion: "sikh", communities: ["Jat", "Khatri", "Arora", "Ramgarhia"], tongues: ["Punjabi"] },
  { religion: "muslim", communities: ["Sunni", "Shia"], tongues: ["Urdu", "Hindi"] },
  { religion: "christian", communities: ["Catholic", "Syrian Christian", "Protestant"], tongues: ["Malayalam", "Konkani", "English"] },
  { religion: "jain", communities: ["Shwetambar", "Digambar"], tongues: ["Gujarati", "Hindi"] },
];

const NATIVE_STATES = ["Punjab", "Gujarat", "Maharashtra", "Kerala", "Tamil Nadu", "Delhi", "Karnataka", "Telangana", "Uttar Pradesh", "West Bengal"];
const OCCUPATIONS = [
  { occupation: "Software Engineer", field: "Computer Science", sector: "private" },
  { occupation: "Doctor", field: "Medicine", sector: "private" },
  { occupation: "Data Scientist", field: "Statistics", sector: "private" },
  { occupation: "Chartered Accountant", field: "Finance", sector: "private" },
  { occupation: "Product Manager", field: "Business Administration", sector: "private" },
  { occupation: "Pharmacist", field: "Pharmacy", sector: "private" },
  { occupation: "Entrepreneur", field: "Business", sector: "business" },
  { occupation: "Research Scientist", field: "Biotechnology", sector: "government" },
];
const EMPLOYERS = ["Google", "Microsoft", "Amazon", "Deloitte", "NHS", "Infosys", "Accenture", "Own business", "University Hospital"];
const COLLEGES = ["IIT Bombay", "Delhi University", "Stanford University", "University of Toronto", "Anna University", "NIT Trichy", "University of Melbourne"];
const HOBBIES = ["Travelling", "Cooking", "Reading", "Music", "Cricket", "Yoga", "Hiking", "Photography", "Dancing", "Movies"];

const pick = (list, n) => [...list].sort(() => Math.random() - 0.5).slice(0, n);
const between = (min, max) => Math.floor(min + Math.random() * (max - min + 1));

function dateOfBirthForAge(age) {
  const d = new Date();
  d.setFullYear(d.getFullYear() - age);
  d.setDate(d.getDate() - between(0, 360));
  return d.toISOString().split("T")[0];
}

function buildProfile(i) {
  const gender = i % 2 === 0 ? "female" : "male";
  const first = randomFrom(gender === "female" ? FEMALE_NAMES : MALE_NAMES);
  const faith = randomFrom(RELIGION_PROFILES);
  const place = randomFrom(PLACES);
  const job = randomFrom(OCCUPATIONS);
  const age = gender === "female" ? between(24, 33) : between(26, 36);
  const nativeState = randomFrom(NATIVE_STATES);
  const motherTongue = randomFrom(faith.tongues);

  return {
    name: `${first} ${randomFrom(SURNAMES)}`,
    gender,
    age,
    dateOfBirth: dateOfBirthForAge(age),
    heightCm: gender === "female" ? between(152, 172) : between(168, 188),
    profileCreatedBy: randomFrom(["self", "self", "parent", "sibling"]),
    maritalStatus: Math.random() > 0.9 ? "divorced" : "never_married",
    religion: faith.religion,
    community: randomFrom(faith.communities),
    casteNoBar: Math.random() > 0.6,
    motherTongue,
    manglik: faith.religion === "hindu" ? randomFrom(["no", "no", "yes", "dont_know"]) : null,
    ...place,
    citizenship: randomFrom(["India", place.country]),
    residencyStatus: randomFrom(["citizen", "permanent_resident", "work_visa"]),
    grewUpIn: randomFrom(["India", place.country]),
    nativeState,
    willingToRelocate: randomFrom(["yes", "maybe", "no"]),
    educationLevel: randomFrom(["bachelors", "masters", "masters", "doctorate", "professional"]),
    educationField: job.field,
    college: randomFrom(COLLEGES),
    occupation: job.occupation,
    employer: randomFrom(EMPLOYERS),
    workSector: job.sector,
    annualIncome: randomFrom(["50k_75k", "75k_100k", "100k_150k", "150k_200k", "undisclosed"]),
    diet: randomFrom(["vegetarian", "non_vegetarian", "eggetarian"]),
    smoking: "no",
    drinking: randomFrom(["no", "occasionally"]),
    hobbies: pick(HOBBIES, 3).join(","),
    familyType: randomFrom(["nuclear", "joint"]),
    familyValues: randomFrom(["traditional", "moderate", "liberal"]),
    familyStatus: randomFrom(["middle_class", "upper_middle_class", "rich"]),
    fatherOccupation: randomFrom(["Retired government officer", "Businessman", "Doctor", "Engineer"]),
    motherOccupation: randomFrom(["Homemaker", "Teacher", "Doctor", "Banker"]),
    brothers: between(0, 2),
    sisters: between(0, 2),
    familyLocation: `${nativeState}, India`,
    bio: `${job.occupation} settled in ${place.city}, ${place.country}. Family-oriented, love ${pick(HOBBIES, 2).join(" and ").toLowerCase()}. Looking for a kind, educated partner who values both Indian roots and a global outlook.`,
    aboutFamily: `We are a close-knit ${randomFrom(["moderate", "traditional", "liberal"])} family from ${nativeState}.`,
    partnerPreferences: {
      minAge: gender === "female" ? age : age - 7,
      maxAge: gender === "female" ? age + 6 : age,
      religions: [faith.religion],
      motherTongues: Math.random() > 0.5 ? [motherTongue] : [],
      countries: pick(PLACES.map((p) => p.country), 3),
      maritalStatuses: ["never_married"],
      manglik: "any",
    },
  };
}

const COLUMNS = [
  "name", "gender", "age", "dateOfBirth", "heightCm", "profileCreatedBy", "maritalStatus", "religion",
  "community", "casteNoBar", "motherTongue", "manglik", "country", "state", "city", "citizenship",
  "residencyStatus", "grewUpIn", "nativeState", "willingToRelocate", "educationLevel", "educationField",
  "college", "occupation", "employer", "workSector", "annualIncome", "diet", "smoking", "drinking",
  "hobbies", "familyType", "familyValues", "familyStatus", "fatherOccupation", "motherOccupation",
  "brothers", "sisters", "familyLocation", "bio", "aboutFamily", "partnerPreferences",
];

async function seedUsers(count) {
  const client = createPgClient();
  await client.connect();
  let inserted = 0;

  try {
    for (let i = 0; i < count; i += 1) {
      const profile = buildProfile(i);
      const values = COLUMNS.map((c) =>
        c === "partnerPreferences" ? JSON.stringify(profile[c]) : profile[c],
      );
      const placeholders = COLUMNS.map((_, idx) => `$${idx + 1}`).join(",");
      const quoted = COLUMNS.map((c) => `"${c}"`).join(",");
      const n = COLUMNS.length;

      const userResult = await client.query(
        `INSERT INTO users (${quoted}, "referralCode", "profileStage", "isActive", "isBanned", "photoVerifiedStatus", "trialEndsAt", "lastActiveAt")
         VALUES (${placeholders}, $${n + 1}, 2, true, false, $${n + 2}, NOW() + INTERVAL '30 days', NOW() - ($${n + 3} || ' hours')::interval)
         RETURNING id`,
        [...values, randomReferralCode(), Math.random() > 0.5 ? "verified" : "unverified", String(between(1, 240))],
      );

      const userId = userResult.rows[0].id;
      const seed = `nri_${Date.now()}_${i}`;
      await client.query(
        `INSERT INTO user_photos ("userId", url, "s3Key", "order", "isPrimary", "isApproved")
         VALUES ($1,$2,$3,0,true,true)`,
        [userId, `https://picsum.photos/seed/${seed}/600/900`, `seed/${seed}.jpg`],
      );
      inserted += 1;
    }
    console.log(`Inserted ${inserted} NRI Shaadi test profiles with photos.`);
  } finally {
    await client.end();
  }
}

const countArg = Number(argv.find((a) => /^\d+$/.test(a)));
const count = Number.isFinite(countArg) && countArg > 0 ? Math.floor(countArg) : DEFAULT_COUNT;

seedUsers(count).catch((error) => {
  console.error("Failed to seed users:", error.message);
  process.exit(1);
});
