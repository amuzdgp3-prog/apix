import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { randomUUID, createHash } from "crypto";
import { eq, isNull, and } from "drizzle-orm";
import {
  loginRequestSchema,
  loginResponseSchema,
  refreshResponseSchema,
  logoutResponseSchema,
} from "@apix/shared";
import { zSchema } from "../utils/zod-json-schema.js";
import { config } from "../config.js";
import { db } from "../db/index.js";
import { staff, refreshTokens } from "../db/schema/staff.js";



function generateAccessToken(user: { id: number; role: string; cityId: number | null }): string {
  return jwt.sign(
    { sub: user.id, role: user.role, cityId: user.cityId },
    config.JWT_SECRET,
    { expiresIn: "1h" },
  );
}

function generateRefreshToken(): string {
  return randomUUID();
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function authRoutes(app: FastifyInstance) {
  /** POST /api/auth/login */
  app.post(
    "/api/auth/login",
    {
      schema: {
        body: zSchema(loginRequestSchema),
        response: { 200: zSchema(loginResponseSchema) },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { email, password } = request.body as { email: string; password: string };

      const [user] = await db
        .select()
        .from(staff)
        .where(eq(staff.email, email));

      if (!user || !user.isActive) {
        return reply.status(401).send({
          success: false,
          error: "Invalid email or password",
        });
      }

      const valid = await bcrypt.compare(password, user.password);
      if (!valid) {
        return reply.status(401).send({
          success: false,
          error: "Invalid email or password",
        });
      }

      const accessToken = generateAccessToken({
        id: user.id,
        role: user.role,
        cityId: user.cityId ?? null,
      });

      // Refresh token
      const refreshToken = generateRefreshToken();
      const hashed = hashToken(refreshToken);
      await db.insert(refreshTokens).values({
        staffId: user.id,
        tokenHash: hashed,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });

      reply.setCookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: config.NODE_ENV === "production",
        sameSite: "lax",
        path: "/api/auth/refresh",
        maxAge: 7 * 24 * 60 * 60,
      });

      return {
        accessToken,
        user: {
          id: user.id,
          fullName: user.fullName,
          role: user.role as "technician" | "admin",
          cityId: user.cityId ?? null,
        },
      };
    },
  );

  /** POST /api/auth/refresh */
  app.post(
    "/api/auth/refresh",
    {
      schema: {
        response: { 200: zSchema(refreshResponseSchema) },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const token = request.cookies?.refreshToken;
      if (!token) {
        return reply.status(401).send({ success: false, error: "No refresh token" });
      }

      const tokenHash = hashToken(token);
      const [matchedToken] = await db
        .select()
        .from(refreshTokens)
        .where(
          and(
            eq(refreshTokens.tokenHash, tokenHash),
            isNull(refreshTokens.revokedAt),
          ),
        );

      if (!matchedToken || new Date() > matchedToken.expiresAt) {
        return reply.status(401).send({ success: false, error: "Invalid or expired refresh token" });
      }

      const [user] = await db
        .select()
        .from(staff)
        .where(eq(staff.id, matchedToken.staffId));

      if (!user || !user.isActive) {
        return reply.status(401).send({ success: false, error: "User not found or inactive" });
      }

      // Revoke old token, issue new one
      await db
        .update(refreshTokens)
        .set({ revokedAt: new Date() })
        .where(eq(refreshTokens.id, matchedToken.id));

      const newRefreshToken = generateRefreshToken();
      const hashedNew = hashToken(newRefreshToken);
      await db.insert(refreshTokens).values({
        staffId: user.id,
        tokenHash: hashedNew,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });

      reply.setCookie("refreshToken", newRefreshToken, {
        httpOnly: true,
        secure: config.NODE_ENV === "production",
        sameSite: "lax",
        path: "/api/auth/refresh",
        maxAge: 7 * 24 * 60 * 60,
      });

      const accessToken = generateAccessToken({
        id: user.id,
        role: user.role,
        cityId: user.cityId ?? null,
      });

      return { accessToken };
    },
  );

    /** POST /api/auth/logout */
  app.post(
    "/api/auth/logout",
    {
      schema: {
        response: { 200: zSchema(logoutResponseSchema) },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const token = request.cookies?.refreshToken;
      if (token) {
        const tokenHash = hashToken(token);
        await db
          .update(refreshTokens)
          .set({ revokedAt: new Date() })
          .where(eq(refreshTokens.tokenHash, tokenHash));
      }
      reply.clearCookie("refreshToken", { path: "/api/auth/refresh" });
      return { success: true as const };
    },
  );

  /** GET /api/auth/me */
  app.get(
    "/api/auth/me",
    {
      preHandler: [async (request: FastifyRequest) => {
        const { authenticate } = await import("../plugins/auth.js");
        const reply = { status: () => ({ send: () => {} }) } as any;
        await authenticate(request, reply);
      }],
      schema: {
        response: { 200: zSchema(loginResponseSchema.pick({ user: true })) },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = (request as any).user;
      if (!user) {
        return reply.status(401).send({ success: false, error: "Unauthorized" });
      }
      const [staffUser] = await db
        .select()
        .from(staff)
        .where(eq(staff.id, user.id));
      if (!staffUser) {
        return reply.status(404).send({ success: false, error: "User not found" });
      }
      return {
        id: staffUser.id,
        fullName: staffUser.fullName,
        role: staffUser.role as "technician" | "admin",
        cityId: staffUser.cityId ?? null,
      };
    },
  );
}