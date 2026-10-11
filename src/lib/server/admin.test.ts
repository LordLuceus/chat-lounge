import { describe, expect, it, vi } from "vitest";

const users = vi.hoisted(() => ({ getUser: vi.fn() }));
vi.mock("$lib/server/users-service", () => users);

const { requireAdmin } = await import("./admin");

const locals = (userId: string | null) => ({ auth: () => ({ userId }) }) as unknown as App.Locals;

describe("requireAdmin", () => {
  it("returns the admin user", async () => {
    users.getUser.mockResolvedValueOnce({ id: "u1", isAdmin: true });
    await expect(requireAdmin(locals("u1"))).resolves.toMatchObject({ id: "u1" });
  });

  it("answers 404, not 403, for signed-out and non-admin users", async () => {
    await expect(requireAdmin(locals(null))).rejects.toMatchObject({ status: 404 });
    users.getUser.mockResolvedValueOnce({ id: "u2", isAdmin: false });
    await expect(requireAdmin(locals("u2"))).rejects.toMatchObject({ status: 404 });
    users.getUser.mockResolvedValueOnce(null);
    await expect(requireAdmin(locals("u3"))).rejects.toMatchObject({ status: 404 });
  });
});
