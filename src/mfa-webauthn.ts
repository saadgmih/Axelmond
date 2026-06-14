import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from "@simplewebauthn/server";
import type {
  AuthenticationResponseJSON,
  AuthenticatorTransportFuture,
  RegistrationResponseJSON,
} from "@simplewebauthn/server";
import { prisma } from "./db";
import { hashWebAuthnCredentialId } from "./mfa-crypto";
import { createSecurityChallenge, consumeSecurityChallenge } from "./mfa-challenge";

function readAppUrl(env: NodeJS.ProcessEnv = process.env): string {
  const url = env.APP_URL?.trim() || "http://localhost:5173";
  return url.replace(/\/+$/, "");
}

export function getWebAuthnConfig(env: NodeJS.ProcessEnv = process.env) {
  const origin = readAppUrl(env);
  let rpID = env.WEBAUTHN_RP_ID?.trim();
  if (!rpID) {
    try {
      rpID = new URL(origin).hostname;
    } catch {
      rpID = "localhost";
    }
  }
  const rpName = env.WEBAUTHN_RP_NAME?.trim() || "Axelmond Research Labs";
  return { origin, rpID, rpName };
}

async function listUserCredentials(userId: string) {
  return prisma.webAuthnCredential.findMany({
    where: { userId },
    select: {
      credentialId: true,
      transports: true,
      counter: true,
      publicKey: true,
    },
  });
}

export async function beginWebAuthnRegistration(userId: string, email: string, deviceName?: string) {
  const { origin: _origin, rpID, rpName } = getWebAuthnConfig();
  const existing = await listUserCredentials(userId);
  const options = await generateRegistrationOptions({
    rpName,
    rpID,
    userName: email,
    userDisplayName: email,
    userID: new TextEncoder().encode(userId),
    attestationType: "none",
    excludeCredentials: existing.map((cred) => ({
      id: cred.credentialId,
      transports: (Array.isArray(cred.transports) ? cred.transports : []) as AuthenticatorTransportFuture[],
    })),
    authenticatorSelection: {
      residentKey: "preferred",
      userVerification: "preferred",
    },
  });

  const challengeId = await createSecurityChallenge({
    userId,
    kind: "WEBAUTHN_REGISTER",
    payload: { challenge: options.challenge, deviceName: deviceName?.trim() || null },
  });

  return { options, challengeId };
}

export async function finishWebAuthnRegistration(
  userId: string,
  challengeId: string,
  response: RegistrationResponseJSON,
  deviceName?: string,
) {
  const stored = await consumeSecurityChallenge<{ challenge: string; deviceName?: string | null }>(
    challengeId,
    "WEBAUTHN_REGISTER",
  );
  if (!stored?.challenge) return { ok: false as const, reason: "CHALLENGE_INVALID" };

  const { origin, rpID } = getWebAuthnConfig();
  const verification = await verifyRegistrationResponse({
    response,
    expectedChallenge: stored.challenge,
    expectedOrigin: origin,
    expectedRPID: rpID,
    requireUserVerification: false,
  });

  if (!verification.verified || !verification.registrationInfo) {
    return { ok: false as const, reason: "VERIFICATION_FAILED" };
  }

  const { credential, credentialDeviceType, credentialBackedUp } = verification.registrationInfo;
  const credentialId = credential.id;
  const credentialIdHash = hashWebAuthnCredentialId(credentialId);

  await prisma.webAuthnCredential.create({
    data: {
      userId,
      credentialId,
      credentialIdHash,
      publicKey: Buffer.from(credential.publicKey),
      counter: BigInt(credential.counter),
      transports: credential.transports ?? [],
      deviceName:
        deviceName?.trim()
        || stored.deviceName
        || `${credentialDeviceType}${credentialBackedUp ? " (sync)" : ""}`,
    },
  });

  return { ok: true as const };
}

export async function beginWebAuthnLogin(params: { userId?: string; email?: string }) {
  const { origin: _origin, rpID } = getWebAuthnConfig();
  let allowCredentials: Array<{ id: string; transports?: AuthenticatorTransportFuture[] }> = [];
  let userId = params.userId;

  if (params.email) {
    const user = await prisma.user.findUnique({
      where: { email: params.email.trim().toLowerCase() },
      select: { id: true, emailVerified: true },
    });
    if (!user?.emailVerified) {
      return { ok: false as const, reason: "USER_NOT_FOUND" };
    }
    userId = user.id;
    const creds = await listUserCredentials(user.id);
    if (creds.length === 0) {
      return { ok: false as const, reason: "NO_PASSKEYS" };
    }
    allowCredentials = creds.map((cred) => ({
      id: cred.credentialId,
      transports: (Array.isArray(cred.transports) ? cred.transports : []) as AuthenticatorTransportFuture[],
    }));
  }

  const options = await generateAuthenticationOptions({
    rpID,
    userVerification: "preferred",
    allowCredentials: allowCredentials.length > 0
      ? allowCredentials.map((cred) => ({ id: cred.id, transports: cred.transports }))
      : undefined,
  });

  const challengeId = await createSecurityChallenge({
    userId: userId ?? null,
    kind: "WEBAUTHN_LOGIN",
    payload: { challenge: options.challenge, email: params.email?.trim().toLowerCase() || null },
  });

  return { ok: true as const, options, challengeId };
}

export async function finishWebAuthnLogin(challengeId: string, response: AuthenticationResponseJSON) {
  const stored = await consumeSecurityChallenge<{ challenge: string; email?: string | null }>(
    challengeId,
    "WEBAUTHN_LOGIN",
  );
  if (!stored?.challenge) return { ok: false as const, reason: "CHALLENGE_INVALID" };

  const credentialIdHash = hashWebAuthnCredentialId(response.id);
  const credential = await prisma.webAuthnCredential.findUnique({
    where: { credentialIdHash },
    include: { user: true },
  });
  if (!credential?.user?.emailVerified) {
    return { ok: false as const, reason: "CREDENTIAL_INVALID" };
  }

  const { origin, rpID } = getWebAuthnConfig();
  const verification = await verifyAuthenticationResponse({
    response,
    expectedChallenge: stored.challenge,
    expectedOrigin: origin,
    expectedRPID: rpID,
    requireUserVerification: false,
    credential: {
      id: credential.credentialId,
      publicKey: new Uint8Array(credential.publicKey),
      counter: Number(credential.counter),
      transports: (Array.isArray(credential.transports) ? credential.transports : []) as AuthenticatorTransportFuture[],
    },
  });

  if (!verification.verified) {
    return { ok: false as const, reason: "VERIFICATION_FAILED" };
  }

  await prisma.webAuthnCredential.update({
    where: { id: credential.id },
    data: {
      counter: BigInt(verification.authenticationInfo.newCounter),
      lastUsedAt: new Date(),
    },
  });

  return { ok: true as const, user: credential.user };
}

export async function deleteWebAuthnCredential(userId: string, credentialId: string): Promise<boolean> {
  const result = await prisma.webAuthnCredential.deleteMany({
    where: { userId, id: credentialId },
  });
  return result.count > 0;
}

export async function listWebAuthnCredentials(userId: string) {
  const rows = await prisma.webAuthnCredential.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      deviceName: true,
      createdAt: true,
      lastUsedAt: true,
    },
  });
  return rows.map((row) => ({
    id: row.id,
    deviceName: row.deviceName || "Passkey",
    createdAt: row.createdAt.toISOString(),
    lastUsedAt: row.lastUsedAt?.toISOString() ?? null,
  }));
}
