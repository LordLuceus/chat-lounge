import { dev } from "$app/environment";
import { PrismaClient as PrismaClientEdge } from "@prisma/client/edge";
import { PrismaClient } from "@prisma/client";
import { withAccelerate } from "@prisma/extension-accelerate";

const prisma = dev
  ? new PrismaClient().$extends(withAccelerate())
  : new PrismaClientEdge().$extends(withAccelerate());

export default prisma;
