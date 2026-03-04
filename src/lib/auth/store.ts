import { randomUUID, scrypt as scryptCallback, createHash } from "node:crypto";
import { promisify } from "node:util";
import { Prisma } from "@prisma/client";
import type { UserRole } from "@prisma/client";
import { ensurePermissionSystemInitialized } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma";

const scrypt = promisify(scryptCallback);

export type StoredUser = {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  isVerified: boolean;
  avatarUrl: string | null;
  phone: string | null;
  addressLine1: string | null;
  city: string | null;
  postalCode: string | null;
  country: string | null;
  province: string | null;
  verificationTokenHash: string | null;
  verificationTokenExpiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export class DuplicateEmailError extends Error {}
export class VerificationTokenNotFoundError extends Error {}
export class VerificationTokenExpiredError extends Error {}
export class InvalidCredentialsError extends Error {}
export class AccountNotVerifiedError extends Error {}
export class AccountAlreadyVerifiedError extends Error {}

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function hashPassword(password: string) {
  const salt = randomUUID().replaceAll("-", "");
  const derivedKey = (await scrypt(password, salt, 64)) as Buffer;
  return `${salt}:${derivedKey.toString("hex")}`;
}

export async function verifyPassword(password: string, storedHash: string) {
  const [salt, key] = storedHash.split(":");
  if (!salt || !key) {
    return false;
  }
  const derivedKey = (await scrypt(password, salt, 64)) as Buffer;
  return derivedKey.toString("hex") === key;
}

export function createRawVerificationToken() {
  const token = randomUUID().replaceAll("-", "") + randomUUID().replaceAll("-", "");
  return token;
}

export async function createUserWithVerificationToken(input: {
  name: string;
  email: string;
  password: string;
  verificationToken: string;
  verificationTokenExpiresAt: Date;
}) {
  const normalizedEmail = input.email.trim().toLowerCase();
  try {
    return await prisma.user.create({
      data: {
        name: input.name.trim(),
        email: normalizedEmail,
        passwordHash: await hashPassword(input.password),
        role: "USER",
        isVerified: false,
        verificationTokenHash: hashToken(input.verificationToken),
        verificationTokenExpiresAt: input.verificationTokenExpiresAt,
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new DuplicateEmailError("Email already exists");
    }
    throw error;
  }
}

export async function deleteUserByEmail(email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  await prisma.user.deleteMany({
    where: { email: normalizedEmail },
  });
}

export async function getUserByEmail(email: string) {
  return prisma.user.findUnique({
    where: {
      email: email.trim().toLowerCase(),
    },
  });
}

export async function getUserById(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
  });
}

export async function updateUserProfile(input: {
  userId: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
  phone?: string | null;
  addressLine1?: string | null;
  city?: string | null;
  postalCode?: string | null;
  country?: string | null;
  province?: string | null;
}) {
  const normalizedEmail = input.email.trim().toLowerCase();

  try {
    return await prisma.user.update({
      where: { id: input.userId },
      data: {
        name: input.name.trim(),
        email: normalizedEmail,
        avatarUrl: input.avatarUrl ?? undefined,
        phone: input.phone ?? undefined,
        addressLine1: input.addressLine1 ?? undefined,
        city: input.city ?? undefined,
        postalCode: input.postalCode ?? undefined,
        country: input.country ?? undefined,
        province: input.province ?? undefined,
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new DuplicateEmailError("Email already exists");
    }
    throw error;
  }
}

export async function upsertOAuthUser(input: { email: string; name: string }) {
  const normalizedEmail = input.email.trim().toLowerCase();
  const normalizedName = input.name.trim() || normalizedEmail.split("@")[0] || "gamer";

  const existing = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (!existing) {
    const randomPassword = `${randomUUID()}${randomUUID()}`;
    return prisma.user.create({
      data: {
        name: normalizedName,
        email: normalizedEmail,
        passwordHash: await hashPassword(randomPassword),
        role: "USER",
        isVerified: true,
        verificationTokenHash: null,
        verificationTokenExpiresAt: null,
      },
    });
  }

  return prisma.user.update({
    where: { id: existing.id },
    data: {
      name: normalizedName || existing.name,
      isVerified: true,
      verificationTokenHash: null,
      verificationTokenExpiresAt: null,
    },
  });
}

export async function refreshVerificationTokenForEmail(input: {
  email: string;
  verificationToken: string;
  verificationTokenExpiresAt: Date;
}) {
  const normalizedEmail = input.email.trim().toLowerCase();
  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (!user) {
    throw new InvalidCredentialsError("User does not exist");
  }

  if (user.isVerified) {
    throw new AccountAlreadyVerifiedError("User already verified");
  }

  return prisma.user.update({
    where: { id: user.id },
    data: {
      verificationTokenHash: hashToken(input.verificationToken),
      verificationTokenExpiresAt: input.verificationTokenExpiresAt,
    },
  });
}

export async function authenticateUser(input: {
  identifier: string;
  password: string;
}) {
  const identifierRaw = input.identifier.trim();
  const identifierEmail = identifierRaw.toLowerCase();

  const user = await prisma.user.findFirst({
    where: {
      OR: [{ email: identifierEmail }, { name: identifierRaw }],
    },
  });

  if (!user) {
    throw new InvalidCredentialsError("User does not exist");
  }

  const passwordMatches = await verifyPassword(input.password, user.passwordHash);
  if (!passwordMatches) {
    throw new InvalidCredentialsError("Wrong credentials");
  }

  if (!user.isVerified) {
    throw new AccountNotVerifiedError("User not verified");
  }

  return user;
}

function shouldEnableMasterAdmin() {
  if (process.env.ENABLE_MASTER_ADMIN) {
    return process.env.ENABLE_MASTER_ADMIN === "true";
  }
  return true;
}

export async function ensureMasterAdminUser() {
  await ensurePermissionSystemInitialized();

  if (!shouldEnableMasterAdmin()) {
    return;
  }

  const masterName = process.env.MASTER_ADMIN_USERNAME ?? "admin";
  const masterEmail = (process.env.MASTER_ADMIN_EMAIL ?? "admin@local.test").toLowerCase();
  const masterPassword = process.env.MASTER_ADMIN_PASSWORD ?? "admin";

  const passwordHash = await hashPassword(masterPassword);
  const existing = await prisma.user.findFirst({
    where: {
      OR: [{ email: masterEmail }, { name: masterName }],
    },
  });

  if (!existing) {
    await prisma.user.create({
      data: {
        name: masterName,
        email: masterEmail,
        passwordHash,
        role: "SUPER_ADMIN",
        isVerified: true,
      },
    });
    return;
  }

  await prisma.user.update({
    where: { id: existing.id },
    data: {
      name: masterName,
      email: masterEmail,
      passwordHash,
      role: "SUPER_ADMIN",
      isVerified: true,
      verificationTokenHash: null,
      verificationTokenExpiresAt: null,
    },
  });
}

export async function verifyUserFromToken(token: string) {
  const tokenHash = hashToken(token);
  const user = await prisma.user.findUnique({
    where: { verificationTokenHash: tokenHash },
  });

  if (!user) {
    throw new VerificationTokenNotFoundError("Invalid token");
  }

  if (user.isVerified) {
    return user;
  }

  if (!user.verificationTokenExpiresAt) {
    throw new VerificationTokenNotFoundError("Invalid token");
  }

  const expiryDate = user.verificationTokenExpiresAt;
  if (!expiryDate || Number.isNaN(expiryDate.getTime()) || expiryDate.getTime() < Date.now()) {
    throw new VerificationTokenExpiredError("Expired token");
  }

  return prisma.user.update({
    where: { id: user.id },
    data: {
      isVerified: true,
      verificationTokenHash: null,
      verificationTokenExpiresAt: null,
    },
  });
}
