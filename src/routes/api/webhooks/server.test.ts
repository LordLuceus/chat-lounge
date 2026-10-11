import { beforeEach, describe, expect, it, vi } from "vitest";
import { requestEvent } from "../../../tests/request-event";

const mocks = vi.hoisted(() => ({
  verify: vi.fn(),
  createUser: vi.fn(),
  updateUser: vi.fn(),
  deleteUser: vi.fn()
}));
vi.mock("svix", () => ({
  Webhook: class {
    constructor(public secret: string) {}
    verify = mocks.verify;
  }
}));
vi.mock("$lib/server/users-service", () => ({
  createUser: mocks.createUser,
  updateUser: mocks.updateUser,
  deleteUser: mocks.deleteUser
}));

const { env } = await import("$env/dynamic/private");
const { POST } = await import("./+server");

const headers: Record<string, string> = {
  "Svix-Id": "id",
  "Svix-Timestamp": "ts",
  "Svix-Signature": "sig"
};
const post = (extraHeaders = headers) =>
  POST(requestEvent({ userId: null, body: { data: { id: "user_1" } }, headers: extraHeaders }));

beforeEach(() => {
  vi.clearAllMocks();
  env.WEBHOOK_SECRET = "whsec_test";
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("POST /api/webhooks", () => {
  it("rejects requests without the Svix headers", async () => {
    await expect(post({})).rejects.toMatchObject({
      status: 400,
      body: { message: "Missing headers" }
    });
    expect(mocks.verify).not.toHaveBeenCalled();
  });

  it("fails closed when no secret is configured", async () => {
    env.WEBHOOK_SECRET = "";
    await expect(post()).rejects.toMatchObject({ status: 500 });
  });

  it("rejects payloads that fail signature verification", async () => {
    mocks.verify.mockImplementationOnce(() => {
      throw new Error("bad signature");
    });
    await expect(post()).rejects.toMatchObject({
      status: 400,
      body: { message: "Failed to verify" }
    });
  });

  it("syncs created, updated and deleted users", async () => {
    mocks.verify.mockReturnValueOnce({ type: "user.created", data: { id: "user_1" } });
    expect((await post()).status).toBe(200);
    expect(mocks.createUser).toHaveBeenCalledWith({ id: "user_1" });

    mocks.verify.mockReturnValueOnce({ type: "user.updated", data: { id: "user_1" } });
    await post();
    expect(mocks.updateUser).toHaveBeenCalledWith({ id: "user_1" });

    mocks.verify.mockReturnValueOnce({ type: "user.deleted", data: { id: "user_1" } });
    await post();
    expect(mocks.deleteUser).toHaveBeenCalledWith("user_1");
  });

  it("verifies against the raw body with the Svix headers", async () => {
    mocks.verify.mockReturnValueOnce({ type: "user.created", data: { id: "user_1" } });
    await post();
    expect(mocks.verify).toHaveBeenCalledWith(JSON.stringify({ data: { id: "user_1" } }), {
      "svix-id": "id",
      "svix-timestamp": "ts",
      "svix-signature": "sig"
    });
  });

  it("rejects unknown event types", async () => {
    mocks.verify.mockReturnValueOnce({ type: "session.created", data: {} });
    await expect(post()).rejects.toMatchObject({ status: 400, body: { message: "Unknown event" } });
  });
});
