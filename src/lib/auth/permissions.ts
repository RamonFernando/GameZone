import type { UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const PERMISSIONS = {
  ACCOUNT_READ: "account.read",
  ACCOUNT_UPDATE: "account.update",
  ACCOUNT_SESSIONS_READ: "account.sessions.read",
  ACCOUNT_SESSIONS_REVOKE_ALL: "account.sessions.revoke_all",
  CHECKOUT_CREATE: "checkout.create",
  ORDER_READ: "order.read",
  ADMIN_USERS_READ: "admin.users.read",
  ADMIN_USERS_WRITE: "admin.users.write",
  ADMIN_ORDERS_READ: "admin.orders.read",
  ADMIN_ORDERS_WRITE: "admin.orders.write",
  ADMIN_PRODUCTS_READ: "admin.products.read",
  ADMIN_PRODUCTS_WRITE: "admin.products.write",
} as const;

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

const DEFAULT_PERMISSIONS: Array<{ key: PermissionKey; description: string }> = [
  { key: PERMISSIONS.ACCOUNT_READ, description: "Ver perfil de cuenta" },
  { key: PERMISSIONS.ACCOUNT_UPDATE, description: "Editar perfil de cuenta" },
  { key: PERMISSIONS.ACCOUNT_SESSIONS_READ, description: "Ver sesiones activas de cuenta" },
  {
    key: PERMISSIONS.ACCOUNT_SESSIONS_REVOKE_ALL,
    description: "Revocar todas las sesiones propias",
  },
  { key: PERMISSIONS.CHECKOUT_CREATE, description: "Crear pedidos (checkout)" },
  { key: PERMISSIONS.ORDER_READ, description: "Ver historial de pedidos" },
  { key: PERMISSIONS.ADMIN_USERS_READ, description: "Ver usuarios del sistema" },
  { key: PERMISSIONS.ADMIN_USERS_WRITE, description: "Gestionar usuarios del sistema" },
  { key: PERMISSIONS.ADMIN_ORDERS_READ, description: "Ver pedidos de todo el sistema" },
  { key: PERMISSIONS.ADMIN_ORDERS_WRITE, description: "Gestionar pedidos y reembolsos" },
  { key: PERMISSIONS.ADMIN_PRODUCTS_READ, description: "Ver productos del catálogo" },
  { key: PERMISSIONS.ADMIN_PRODUCTS_WRITE, description: "Gestionar productos del catálogo" },
];

const USER_ROLE_PERMISSIONS: PermissionKey[] = [
  PERMISSIONS.ACCOUNT_READ,
  PERMISSIONS.ACCOUNT_UPDATE,
  PERMISSIONS.ACCOUNT_SESSIONS_READ,
  PERMISSIONS.ACCOUNT_SESSIONS_REVOKE_ALL,
  PERMISSIONS.CHECKOUT_CREATE,
  PERMISSIONS.ORDER_READ,
];

const ADMIN_ROLE_PERMISSIONS: PermissionKey[] = [
  PERMISSIONS.ACCOUNT_READ,
  PERMISSIONS.ACCOUNT_UPDATE,
  PERMISSIONS.ACCOUNT_SESSIONS_READ,
  PERMISSIONS.ACCOUNT_SESSIONS_REVOKE_ALL,
  PERMISSIONS.CHECKOUT_CREATE,
  PERMISSIONS.ORDER_READ,
  PERMISSIONS.ADMIN_USERS_READ,
  PERMISSIONS.ADMIN_ORDERS_READ,
  PERMISSIONS.ADMIN_ORDERS_WRITE,
  PERMISSIONS.ADMIN_PRODUCTS_READ,
  PERMISSIONS.ADMIN_PRODUCTS_WRITE,
];
const SUPER_ADMIN_ROLE_PERMISSIONS: PermissionKey[] = DEFAULT_PERMISSIONS.map(
  (permission) => permission.key
);

let initializationPromise: Promise<void> | null = null;

function resolvePermissionsForRole(role: UserRole) {
  if (role === "SUPER_ADMIN") {
    return SUPER_ADMIN_ROLE_PERMISSIONS;
  }
  if (role === "ADMIN") {
    return ADMIN_ROLE_PERMISSIONS;
  }
  return USER_ROLE_PERMISSIONS;
}

async function syncRolePermissionsFor(role: UserRole, permissionByKey: Map<string, string>) {
  const rolePermissionKeys = resolvePermissionsForRole(role);

  for (const key of rolePermissionKeys) {
    const permissionId = permissionByKey.get(key);
    if (!permissionId) {
      continue;
    }
    await prisma.rolePermission.upsert({
      where: {
        role_permissionId: {
          role,
          permissionId,
        },
      },
      update: {},
      create: {
        role,
        permissionId,
      },
    });
  }
}

async function initializePermissionSystem() {
  const permissionByKey = new Map<string, string>();

  for (const permission of DEFAULT_PERMISSIONS) {
    const upserted = await prisma.permission.upsert({
      where: { key: permission.key },
      update: { description: permission.description },
      create: {
        key: permission.key,
        description: permission.description,
      },
    });
    permissionByKey.set(permission.key, upserted.id);
  }

  await syncRolePermissionsFor("USER", permissionByKey);
  await syncRolePermissionsFor("ADMIN", permissionByKey);
  await syncRolePermissionsFor("SUPER_ADMIN", permissionByKey);
}

export async function ensurePermissionSystemInitialized() {
  if (!initializationPromise) {
    initializationPromise = initializePermissionSystem();
  }
  try {
    await initializationPromise;
  } catch (error) {
    initializationPromise = null;
    throw error;
  }
}

export async function userHasPermission(userId: string, permissionKey: PermissionKey) {
  await ensurePermissionSystemInitialized();

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      userPermissions: {
        where: {
          permission: { key: permissionKey },
        },
        include: {
          permission: true,
        },
      },
    },
  });

  if (!user) {
    return false;
  }

  const userOverride = user.userPermissions[0];
  if (userOverride) {
    return userOverride.granted;
  }

  const rolePermission = await prisma.rolePermission.findFirst({
    where: {
      role: user.role,
      permission: {
        key: permissionKey,
      },
    },
  });

  return Boolean(rolePermission);
}
