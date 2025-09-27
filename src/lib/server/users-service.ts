import { prisma } from "$lib/server/db";
import type { UserJSON } from "@clerk/backend";

export async function getUsers() {
  return prisma.user.findMany({
    orderBy: {
      updatedAt: "desc"
    }
  });
}

export async function getUser(userId: string) {
  return prisma.user.findUnique({
    where: {
      id: userId
    }
  });
}

export async function getUserByName(username: string) {
  return prisma.user.findUnique({
    where: {
      username
    }
  });
}

export async function createUser(user: UserJSON) {
  return prisma.user.create({
    data: {
      id: user.id,
      username: user.username!,
      email: user.email_addresses.find((email) => email.id === user.primary_email_address_id)
        ?.email_address,
      image: user.image_url
    }
  });
}

export async function updateUser(user: UserJSON) {
  return prisma.user.update({
    where: {
      id: user.id
    },
    data: {
      username: user.username!,
      email: user.email_addresses.find((email) => email.id === user.primary_email_address_id)
        ?.email_address,
      image: user.image_url
    }
  });
}

export async function updateUserSettings(
  userId: string,
  settings: {
    useBaseInstructions?: boolean;
    customBaseInstructions?: string | null;
  }
) {
  return prisma.user.update({
    where: {
      id: userId
    },
    data: settings
  });
}

export async function deleteUser(userId: string | undefined) {
  if (!userId) return;
  return prisma.user.delete({
    where: {
      id: userId
    }
  });
}
