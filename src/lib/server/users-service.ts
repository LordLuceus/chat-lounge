import { db } from "$lib/drizzle/db";
import { users } from "$lib/drizzle/schema";
import type { UserJSON } from "@clerk/backend";
import { desc, eq } from "drizzle-orm";

export async function getUsers() {
  return db.select().from(users).orderBy(desc(users.updatedAt));
}

export async function getUser(userId: string) {
  return db.query.users.findFirst({
    where: eq(users.id, userId)
  });
}

export async function getUserByName(username: string) {
  return db.query.users.findFirst({
    where: eq(users.username, username)
  });
}

export async function createUser(user: UserJSON) {
  return db.insert(users).values({
    id: user.id,
    username: user.username!,
    email: user.email_addresses.find((email) => email.id === user.primary_email_address_id)
      ?.email_address,
    image: user.image_url
  });
}

export async function updateUser(user: UserJSON) {
  return db
    .update(users)
    .set({
      username: user.username!,
      email: user.email_addresses.find((email) => email.id === user.primary_email_address_id)
        ?.email_address,
      image: user.image_url
    })
    .where(eq(users.id, user.id));
}

export async function deleteUser(userId: string | undefined) {
  if (!userId) return;
  return db.delete(users).where(eq(users.id, userId));
}
