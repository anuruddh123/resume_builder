import type { User, UserWithPassword, UserRole } from "./types";
import bcrypt from "bcryptjs";

// Global cache to persist across Next.js dev server hot module reloads
const globalForStore = globalThis as unknown as {
  __auth_users_store?: Map<string, UserWithPassword>;
};

const usersStore: Map<string, UserWithPassword> =
  globalForStore.__auth_users_store || new Map<string, UserWithPassword>();

if (!globalForStore.__auth_users_store) {
  globalForStore.__auth_users_store = usersStore;

  // Seed default demo user
  const demoSalt = bcrypt.genSaltSync(10);
  const demoHash = bcrypt.hashSync("demo1234", demoSalt);

  const demoUser: UserWithPassword = {
    id: "usr_demo_user",
    name: "Alex Johnson",
    email: "demo@resumecraft.com",
    role: "user",
    passwordHash: demoHash,
    createdAt: new Date().toISOString(),
  };

  usersStore.set(demoUser.email.toLowerCase(), demoUser);
}

export async function findUserByEmail(email: string): Promise<UserWithPassword | null> {
  const normalized = email.trim().toLowerCase();
  return usersStore.get(normalized) || null;
}

export async function findUserById(id: string): Promise<User | null> {
  for (const user of usersStore.values()) {
    if (user.id === id) {
      const { passwordHash: _ignored, ...safeUser } = user;
      return safeUser;
    }
  }
  return null;
}

export async function createUser(params: {
  name: string;
  email: string;
  passwordHash: string;
  role?: UserRole;
}): Promise<User> {
  const normalizedEmail = params.email.trim().toLowerCase();
  if (usersStore.has(normalizedEmail)) {
    throw new Error("An account with this email already exists.");
  }

  const id = "usr_" + Date.now() + "_" + Math.random().toString(36).substring(2, 8);
  const newUser: UserWithPassword = {
    id,
    name: params.name.trim(),
    email: normalizedEmail,
    role: params.role || "user",
    passwordHash: params.passwordHash,
    createdAt: new Date().toISOString(),
  };

  usersStore.set(normalizedEmail, newUser);

  const { passwordHash: _ignored, ...safeUser } = newUser;
  return safeUser;
}
