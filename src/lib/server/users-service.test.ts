import type { UserJSON } from "@clerk/backend";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createFakePrisma, type FakePrisma } from "../../tests/fake-prisma";

const prisma = vi.hoisted(() => ({ current: null as unknown as FakePrisma }));
vi.mock("$lib/server/db", () => ({
  get prisma() {
    return prisma.current;
  }
}));

const { createUser, deleteUser, getUser, getUserByName, updateUser, updateUserSettings } =
  await import("./users-service");

const clerkUser = (overrides: Partial<UserJSON> = {}) =>
  ({
    id: "user_1",
    username: "alice",
    image_url: "https://img/alice.png",
    primary_email_address_id: "email_2",
    email_addresses: [
      { id: "email_1", email_address: "old@example.com" },
      { id: "email_2", email_address: "alice@example.com" }
    ],
    ...overrides
  }) as UserJSON;

beforeEach(() => {
  prisma.current = createFakePrisma();
});

describe("users-service", () => {
  it("creates a user from a Clerk payload using the primary email", async () => {
    await createUser(clerkUser());
    expect(await getUser("user_1")).toMatchObject({
      username: "alice",
      email: "alice@example.com",
      image: "https://img/alice.png",
      isAdmin: false
    });
    expect((await getUserByName("alice"))?.id).toBe("user_1");
  });

  it("updates profile fields and settings", async () => {
    await createUser(clerkUser());
    await updateUser(clerkUser({ username: "alice2", primary_email_address_id: "email_1" }));
    await updateUserSettings("user_1", {
      useBaseInstructions: true,
      customBaseInstructions: "Be brief"
    });
    expect(await getUser("user_1")).toMatchObject({
      username: "alice2",
      email: "old@example.com",
      useBaseInstructions: true,
      customBaseInstructions: "Be brief"
    });
  });

  it("deletes users and ignores missing IDs", async () => {
    await createUser(clerkUser());
    await deleteUser(undefined);
    expect(await getUser("user_1")).not.toBeNull();
    await deleteUser("user_1");
    expect(await getUser("user_1")).toBeNull();
  });
});
