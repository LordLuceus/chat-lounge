import { beforeEach, describe, expect, it, vi } from "vitest";
import { createFakePrisma, type FakePrisma } from "../../tests/fake-prisma";

const prisma = vi.hoisted(() => ({ current: null as unknown as FakePrisma }));
vi.mock("$lib/server/db", () => ({
  get prisma() {
    return prisma.current;
  }
}));

const { bulkDeleteFolders, createFolder, deleteFolder, getFolder, updateFolder } = await import(
  "./folders-service"
);

beforeEach(() => {
  prisma.current = createFakePrisma();
});

describe("folders-service", () => {
  it("creates, reads, renames and deletes a folder for its owner only", async () => {
    const folder = await createFolder({ userId: "u1", name: "Work" });
    expect((await getFolder("u1", folder.id)).name).toBe("Work");
    await expect(getFolder("u2", folder.id)).rejects.toThrow();

    await updateFolder(folder.id, { name: "Play" }, "u1");
    expect((await getFolder("u1", folder.id)).name).toBe("Play");
    await expect(updateFolder(folder.id, { name: "x" }, "u2")).rejects.toThrow();

    await expect(deleteFolder("u2", folder.id)).rejects.toThrow();
    await deleteFolder("u1", folder.id);
    await expect(getFolder("u1", folder.id)).rejects.toThrow();
  });

  it("bulk deletes folders and unfiles their conversations", async () => {
    const a = await createFolder({ userId: "u1", name: "A" });
    const b = await createFolder({ userId: "u1", name: "B" });
    const theirs = await createFolder({ userId: "u2", name: "Theirs" });
    const conversation = await prisma.current.conversation.create({
      data: { name: "c", folderId: a.id }
    });

    await expect(bulkDeleteFolders("u1", [a.id, theirs.id])).rejects.toThrow(/access denied/);
    expect(await bulkDeleteFolders("u1", [a.id, b.id])).toEqual({ deleted: 2 });
    expect(await prisma.current.folder.findMany()).toHaveLength(1);
    expect(
      (await prisma.current.conversation.findUnique({ where: { id: conversation.id } }))?.folderId
    ).toBeNull();
  });
});
