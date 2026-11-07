import { generateKeyPairSync } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export function generateDkimKeyPair(domain = "perfacademy.ma", selector = "mail") {
  console.log(`[PAM] Generating 2048-bit RSA DKIM key pair for ${selector}._domainkey.${domain}...`);

  const { publicKey, privateKey } = generateKeyPairSync("rsa", {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: "spki",
      format: "pem",
    },
    privateKeyEncoding: {
      type: "pkcs8",
      format: "pem",
    },
  });

  // Extract raw base64 string from public key PEM
  const pubBase64 = publicKey
    .replace(/-----BEGIN PUBLIC KEY-----/, "")
    .replace(/-----END PUBLIC KEY-----/, "")
    .replace(/\s+/g, "");

  const dnsTxtRecord = `v=DKIM1; k=rsa; p=${pubBase64}`;

  return {
    domain,
    selector,
    privateKeyPem: privateKey,
    publicKeyPem: publicKey,
    dnsRecordName: `${selector}._domainkey.${domain}`,
    dnsRecordType: "TXT",
    dnsRecordValue: dnsTxtRecord,
  };
}

if (process.argv[1] && process.argv[1].endsWith("generate-dkim.mjs")) {
  const result = generateDkimKeyPair("perfacademy.ma", "mail");
  const outputDir = path.resolve("performance-academy-mail/infrastructure/opendkim");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(path.join(outputDir, "mail.private"), result.privateKeyPem, { mode: 0o600 });
  fs.writeFileSync(path.join(outputDir, "mail.txt"), result.dnsRecordValue);

  console.log("\n========================================================");
  console.log("   PERFORMANCE ACADEMY MAIL (PAM) - DKIM KEY GENERATED   ");
  console.log("========================================================");
  console.log(`DNS Record Name  : ${result.dnsRecordName}`);
  console.log(`DNS Record Type  : ${result.dnsRecordType}`);
  console.log(`DNS Record Value : ${result.dnsRecordValue}`);
  console.log("========================================================\n");
}
