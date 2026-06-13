import dotenv from "dotenv";
import webpush from "web-push";

dotenv.config();

const publicKey = process.env.VAPID_PUBLIC_KEY?.trim() || "";
const privateKey = process.env.VAPID_PRIVATE_KEY?.trim() || "";
const subject = process.env.VAPID_SUBJECT?.trim() || "mailto:support@axelmond.com";

try {
  webpush.setVapidDetails(subject, publicKey, privateKey);
  console.log("VAPID keys: OK (pair is valid)");
} catch (err) {
  console.error("VAPID keys: INVALID", err.message || err);
  process.exit(1);
}
