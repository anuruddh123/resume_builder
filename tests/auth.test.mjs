import test from "node:test";
import assert from "node:assert/strict";
import { hashPassword, comparePassword } from "../lib/auth/passwords.ts";
import { signToken, verifyToken } from "../lib/auth/jwt.ts";
import { createUser, findUserByEmail, findUserById } from "../lib/auth/store.ts";

test("passwords: hashes and compares passwords securely", async () => {
  const password = "SuperSecretPassword123!";
  const hash = await hashPassword(password);
  assert.notEqual(hash, password);
  assert.equal(typeof hash, "string");

  const matches = await comparePassword(password, hash);
  assert.equal(matches, true);

  const wrongMatches = await comparePassword("WrongPassword", hash);
  assert.equal(wrongMatches, false);
});

test("jwt: signs and verifies JWT tokens with claims", async () => {
  const payload = {
    id: "usr_test_123",
    email: "tester@example.com",
    name: "Test User",
    role: "user",
  };

  const token = await signToken(payload);
  assert.equal(typeof token, "string");
  assert.ok(token.length > 20);

  const decoded = await verifyToken(token);
  assert.ok(decoded);
  assert.equal(decoded.id, payload.id);
  assert.equal(decoded.email, payload.email);
  assert.equal(decoded.name, payload.name);
  assert.equal(decoded.role, "user");

  const invalidDecoded = await verifyToken("invalid.jwt.token");
  assert.equal(invalidDecoded, null);
});

test("store: manages user registration, lookup, and demo accounts", async () => {
  const demoUser = await findUserByEmail("demo@resumecraft.com");
  assert.ok(demoUser);
  assert.equal(demoUser.role, "user");

  const testEmail = "unique_user_" + Date.now() + "@example.com";
  const pwdHash = await hashPassword("pass123");
  const created = await createUser({
    name: "New Person",
    email: testEmail,
    passwordHash: pwdHash,
  });

  assert.ok(created.id);
  assert.equal(created.email, testEmail);
  assert.equal(created.name, "New Person");
  assert.equal(created.role, "user");

  const retrieved = await findUserById(created.id);
  assert.ok(retrieved);
  assert.equal(retrieved.email, testEmail);

  await assert.rejects(
    async () => {
      await createUser({
        name: "Duplicate Person",
        email: testEmail,
        passwordHash: pwdHash,
      });
    },
    /already exists/
  );
});
