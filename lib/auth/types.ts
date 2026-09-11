export type UserRole = "user" | "admin";

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: string;
}

export interface UserWithPassword extends User {
  passwordHash: string;
}

export interface AuthSession {
  user: User;
}

export interface TokenPayload {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}
