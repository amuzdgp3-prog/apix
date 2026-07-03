import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import jwt from "jsonwebtoken";
import { eq } from "drizzle-orm";
import { config } from "../config.js";
import { jwtPayloadSchema, type JwtPayload } from "@apix/shared";
import { db } from "../db/index.js";
import { staff } from "../db/schema/staff.js";

declare module "fastify" {
  interface FastifyRequest {
    user: AuthUser;
  }
}

export interface AuthUser {
  id: number;
  role: string;
  cityId: number | null;
}

export async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const authHeader = request.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return reply.status(401).send({
      success: false,
      error: "Missing or invalid Authorization header",
    });
  }

  const token = authHeader.slice(7);
  try {
    const decoded = jwt.verify(token, config.JWT_SECRET);
    const parsed = jwtPayloadSchema.safeParse(decoded);
    if (!parsed.success) {
      return reply.status(401).send({
        success: false,
        error: "Invalid token payload",
      });
    }

    const [user] = await db
      .select({ id: staff.id, role: staff.role, cityId: staff.cityId, isActive: staff.isActive })
      .from(staff)
      .where(eq(staff.id, parsed.data.sub));

    if (!user || !user.isActive) {
      return reply.status(401).send({
        success: false,
        error: "User not found or inactive",
      });
    }

    request.user = {
      id: user.id,
      role: user.role as AuthUser["role"],
      cityId: user.cityId ?? null,
    };
  } catch {
    return reply.status(401).send({
      success: false,
      error: "Invalid or expired token",
    });
  }
}

export async function authPlugin(app: FastifyInstance) {
  app.decorateRequest("user", null);
}