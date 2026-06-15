#!/usr/bin/env node
import crypto from "node:crypto";

const secret = crypto.randomBytes(48).toString("base64url");
console.log(secret);
console.error("[security] Generated MOBILE_CLIENT_SECRET (48 bytes, base64url).");
console.error("[security] Set the same value in EXPO_PUBLIC_MOBILE_CLIENT_KEY for the mobile app.");
