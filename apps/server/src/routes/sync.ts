import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { and, desc, eq, inArray, isNull, lt } from "drizzle-orm";
import {
  syncRequestFieldsSchema,
  syncToySchema,
} from "@apix/shared";
import { z } from "zod";
import { db } from "../db/index.js";
import { service, toyDistribution } from "../db/schema/services.js";
import { machinePlacements } from "../db/schema/placements.js";
import { machines } from "../db/schema/machines.js";
import { toys } from "../db/schema/toys.js";
import { recalcChain } from "../services/chainRecalc.js";
import { config } from "../config.js";
import { authenticate } from "../plugins/auth.js";

/**
 * Sync routes вЂ” СЂР°Р·РґРµР» РўР— 13.2: РЎРёРЅС…СЂРѕРЅРёР·Р°С†РёСЏ СЃ РјРѕР±РёР»СЊРЅРѕРіРѕ РєР»РёРµРЅС‚Р°.
 *
 * POST /api/sync вЂ” РїСЂРёРЅРёРјР°РµС‚ multipart/form-data СЃ РїРѕР»СЏРјРё РѕР±СЃР»СѓР¶РёРІР°РЅРёСЏ Рё С„РѕС‚Рѕ.
 * Р’Р°Р»РёРґРёСЂСѓРµС‚ РїРѕР»СЏ С‡РµСЂРµР· Zod, СЃРѕС…СЂР°РЅСЏРµС‚ РІ Р‘Р”, Р·Р°РіСЂСѓР¶Р°РµС‚ С„РѕС‚Рѕ РІ MinIO,
 * Р·Р°РїСѓСЃРєР°РµС‚ РїРµСЂРµСЃС‡С‘С‚ С†РµРїРѕС‡РєРё.
 */

// Р Р°Р·СЂРµС€С‘РЅРЅС‹Рµ MIME-С‚РёРїС‹ РґР»СЏ С„РѕС‚Рѕ
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png"];

// ========== РџРѕР»СЊР·РѕРІР°С‚РµР»СЊСЃРєРёРµ РѕС€РёР±РєРё ==========

class DuplicateError extends Error {
  constructor() {
    super("Service for this date already exists on this placement");
    this.name = "DuplicateError";
  }
}

class CounterMonotonicError extends Error {
  constructor(
    public readonly expectedMin: number,
    public readonly actualValue: number,
  ) {
    super(`Game counter violates monotonicity: expected >= ${expectedMin}, got ${actualValue}`);
    this.name = "CounterMonotonicError";
  }
}

// ========== Р’СЃРїРѕРјРѕРіР°С‚РµР»СЊРЅС‹Рµ СѓС‚РёР»РёС‚С‹ ==========

/** Р Р°Р·РЅРёС†Р° РІ РґРЅСЏС… РјРµР¶РґСѓ РґРІСѓРјСЏ РґР°С‚Р°РјРё (YYYY-MM-DD) */
function daysBetween(a: string, b: string): number {
  const da = new Date(a);
  const db = new Date(b);
  return Math.round(Math.abs(db.getTime() - da.getTime()) / (1000 * 60 * 60 * 24));
}

/** Р Р°СЃС€РёСЂРµРЅРёРµ С„Р°Р№Р»Р° РїРѕ MIME */
function extForMime(mime?: string): string {
  if (mime === "image/png") return "png";
  return "jpg";
}

// ========== РњР°СЂС€СЂСѓС‚С‹ ==========

export async function syncRoutes(app: FastifyInstance) {
  app.post(
    "/api/sync",
    {
      preValidation: [authenticate],
      schema: {
        consumes: ["multipart/form-data"],
      } as any,
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const staffId = request.user.id;

      // ========== 1. РџР°СЂСЃРёРЅРі multipart ==========

      const fields: Record<string, string> = {};
      const fileBuffers: Record<string, { buffer: Buffer; mimetype: string }> = {};

      try {
        // @fastify/multipart v8+: request.parts() вЂ” AsyncIterableIterator
        const parts = (request as any).parts();
        for await (const part of parts) {
          if (part.file) {
            // Р­С‚Рѕ С„Р°Р№Р»
            let ext = "jpg";
            if (part.mimetype === "image/png") ext = "png";

            const buffers: Buffer[] = [];
            for await (const chunk of part.file) {
              buffers.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
            }
            fileBuffers[part.fieldname] = {
              buffer: Buffer.concat(buffers),
              mimetype: part.mimetype,
            };
          } else {
            // Р­С‚Рѕ С‚РµРєСЃС‚РѕРІРѕРµ РїРѕР»Рµ
            fields[part.fieldname] = part.value ?? "";
          }
        }
      } catch (err: any) {
        request.log.error(err, "Failed to parse multipart form data");
        return reply.status(400).send({
          success: false,
          errors: [{ field: "multipart", message: "Failed to parse multipart form data" }],
        });
      }

      // ========== 2. Р’Р°Р»РёРґР°С†РёСЏ РїРѕР»РµР№ С‡РµСЂРµР· Zod ==========

      const fieldsResult = syncRequestFieldsSchema.safeParse(fields);
      if (!fieldsResult.success) {
        const zodErrors = fieldsResult.error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        }));
        return reply.status(422).send({
          success: false,
          errors: zodErrors,
        });
      }

      const parsed = fieldsResult.data;

      // 2a. Р’Р°Р»РёРґР°С†РёСЏ toys (JSON-СЃС‚СЂРѕРєР°)
      let toysParsed: z.infer<typeof syncToySchema>[];
      try {
        const toysRaw = JSON.parse(parsed.toys);
        const toysResult = z.array(syncToySchema).safeParse(toysRaw);
        if (!toysResult.success) {
          return reply.status(422).send({
            success: false,
            errors: toysResult.error.issues.map((issue) => ({
              field: `toys.${issue.path.join(".")}`,
              message: issue.message,
            })),
          });
        }
        toysParsed = toysResult.data;
      } catch {
        return reply.status(422).send({
          success: false,
          errors: [{ field: "toys", message: "Invalid JSON in toys field" }],
        });
      }

      // 2b. Р’Р°Р»РёРґР°С†РёСЏ С„Р°Р№Р»РѕРІ вЂ” photoBefore Рё photoAfter РѕР±СЏР·Р°С‚РµР»СЊРЅС‹
      const errors: { field: string; message: string }[] = [];

      const checkFile = (name: string, required: boolean) => {
        const f = fileBuffers[name];
        if (!f) {
          if (required) {
            errors.push({ field: name, message: "Required file" });
          }
          return;
        }
        if (!ALLOWED_MIME_TYPES.includes(f.mimetype)) {
          errors.push({
            field: name,
            message: `Invalid MIME type: ${f.mimetype}. Allowed: ${ALLOWED_MIME_TYPES.join(", ")}`,
          });
        }
      };

      checkFile("photoBefore", false);
      checkFile("photoAfter", false);
      checkFile("photoCounter", false);

      if (errors.length > 0) {
        return reply.status(422).send({ success: false, errors });
      }

      // ========== 3. Р‘РёР·РЅРµСЃ-Р»РѕРіРёРєР° РІ С‚СЂР°РЅР·Р°РєС†РёРё ==========

      try {
        const result = await db.transaction(async (tx) => {
          // 3.1 РќР°Р№С‚Рё Р°РєС‚РёРІРЅС‹Р№ placement РёР»Рё СЃРѕР·РґР°С‚СЊ РЅРѕРІС‹Р№
          const [placement] = await tx
            .select()
            .from(machinePlacements)
            .where(
              and(
                eq(machinePlacements.machineNumber, parsed.machineNumber),
                isNull(machinePlacements.endedAt),
              ),
            )
            .limit(1);

          let placementId: number;

          if (!placement) {
            // РЎРѕР·РґР°С‚СЊ РЅРѕРІС‹Р№ placement
            const [newPlacement] = await tx
              .insert(machinePlacements)
              .values({
                machineNumber: parsed.machineNumber,
                gameCounterInitial: parsed.gameCounter,
                prizeCounterInitial: parsed.prizeCounter ?? 0,
                createdBy: staffId,
              })
              .returning();

            if (!newPlacement) {
              throw new Error("Failed to create placement");
            }
            placementId = newPlacement.id;
          } else {
            placementId = placement.id;

            // 3.2 РџСЂРѕРІРµСЂРёС‚СЊ РґСѓР±Р»РёРєР°С‚ РґР°С‚С‹
            const [duplicate] = await tx
              .select({ id: service.id })
              .from(service)
              .where(
                and(
                  eq(service.placementId, placementId),
                  eq(service.serviceDate, parsed.serviceDate),
                ),
              )
              .limit(1);

            if (duplicate) {
              throw new DuplicateError();
            }

            // 3.3 РџСЂРѕРІРµСЂРёС‚СЊ РјРѕРЅРѕС‚РѕРЅРЅРѕСЃС‚СЊ СЃС‡С‘С‚С‡РёРєР°
            const [lastService] = await tx
              .select({ gameCounter: service.gameCounter })
              .from(service)
              .where(eq(service.placementId, placementId))
              .orderBy(desc(service.serviceDate), desc(service.serviceTime))
              .limit(1);

            const minExpected = lastService?.gameCounter ?? placement.gameCounterInitial;

            if (parsed.gameCounter < minExpected) {
              throw new CounterMonotonicError(minExpected, parsed.gameCounter);
            }
          }

          // 3.4 РџРѕР»СѓС‡РёС‚СЊ С†РµРЅСѓ РёРіСЂС‹ Рё location_id РёР· СЃРїСЂР°РІРѕС‡РЅРёРєР° РјР°С€РёРЅ
          const [machine] = await tx
            .select({
              pricePerGame: machines.pricePerGame,
              locationId: machines.locationId,
            })
            .from(machines)
            .where(eq(machines.number, parsed.machineNumber));

          const pricePerGame = machine ? Number(machine.pricePerGame) : 0;
          const locationId = machine?.locationId ?? 0;

          // 3.5 РџРѕР»СѓС‡РёС‚СЊ СЃРЅР°РїС€РѕС‚С‹ С†РµРЅ РёРіСЂСѓС€РµРє Рё РїРѕСЃС‡РёС‚Р°С‚СЊ costOfToys
          let costOfToys = 0;
          const toyDistributions: Array<{
            toyId: number;
            quantity: number;
            priceSnapshot: string;
            totalCost: string;
          }> = [];

          if (toysParsed.length > 0) {
            const toyIds = toysParsed.map((t) => t.toyId);
            const toyPrices = await tx
              .select({ id: toys.id, price: toys.price })
              .from(toys)
              .where(inArray(toys.id, toyIds));

            const priceMap = new Map(toyPrices.map((t) => [t.id, Number(t.price)]));

            for (const toy of toysParsed) {
              const price = priceMap.get(toy.toyId) ?? 0;
              const total = price * toy.quantity;
              costOfToys += total;
              toyDistributions.push({
                toyId: toy.toyId,
                quantity: toy.quantity,
                priceSnapshot: price.toFixed(2),
                totalCost: total.toFixed(2),
              });
            }
          }

          // 3.6 РЎРѕС…СЂР°РЅРёС‚СЊ РѕР±СЃР»СѓР¶РёРІР°РЅРёРµ РІ Р‘Р”
          const [savedService] = await tx
            .insert(service)
            .values({
              placementId,
              machineNumber: parsed.machineNumber,
              staffId,
              serviceDate: parsed.serviceDate,
              serviceTime: parsed.serviceTime,
              gameCounter: parsed.gameCounter,
              prizeCounter: parsed.prizeCounter ?? null,
              testGames: parsed.testGames,
              isOperational: parsed.isOperational,
              comment: parsed.comment ?? null,
              pricePerGame: pricePerGame.toFixed(2) as any,
              costOfToys: costOfToys.toFixed(2) as any,
            })
            .returning();

          if (!savedService) {
            throw new Error("Failed to save service record");
          }

          // 3.7 РЎРѕС…СЂР°РЅРёС‚СЊ СЂР°СЃРїСЂРµРґРµР»РµРЅРёРµ РёРіСЂСѓС€РµРє
          if (toyDistributions.length > 0) {
            await tx.insert(toyDistribution).values(
              toyDistributions.map((td) => ({
                serviceId: savedService.id,
                toyId: td.toyId,
                quantity: td.quantity,
                priceSnapshot: td.priceSnapshot,
                totalCost: td.totalCost,
              })),
            );
          }

          return savedService;
        });

        // ========== 4. Р—Р°РіСЂСѓР·РєР° С„РѕС‚Рѕ РІ MinIO ==========

        const minioClient = app.minio;
        const bucket = config.MINIO_BUCKET;
        const photoUrls: Record<string, string | null> = {
          photoCounterUrl: null,
          photoBeforeUrl: null,
          photoAfterUrl: null,
        };

        const uploadFile = async (
          fieldName: string,
          dbColumn: "photoCounterUrl" | "photoBeforeUrl" | "photoAfterUrl",
        ): Promise<void> => {
          const file = fileBuffers[fieldName];
          if (!file || !minioClient) return;

          const ext = extForMime(file.mimetype);
          const objectName = `service_${result.id}/${fieldName}_${Date.now()}.${ext}`;

          try {
            await minioClient.putObject(bucket, objectName, file.buffer, file.buffer.length, {
              "Content-Type": file.mimetype,
            });
            photoUrls[dbColumn] = `/${bucket}/${objectName}`;
          } catch (err: any) {
            request.log.error(err, `Failed to upload ${fieldName} to MinIO`);
          }
        };

        // Р—Р°РіСЂСѓР¶Р°РµРј С„РѕС‚Рѕ РќР• РІ С‚СЂР°РЅР·Р°РєС†РёРё (MinIO вЂ” РІРЅРµС€РЅРёР№ СЃРµСЂРІРёСЃ)
        await Promise.all([
          uploadFile("photoCounter", "photoCounterUrl"),
          uploadFile("photoBefore", "photoBeforeUrl"),
          uploadFile("photoAfter", "photoAfterUrl"),
        ]);

        // РћР±РЅРѕРІР»СЏРµРј URL С„РѕС‚Рѕ РІ Р‘Р”
        const hasPhotoUrls = Object.values(photoUrls).some((url) => url !== null);
        if (hasPhotoUrls) {
          await db
            .update(service)
            .set(photoUrls)
            .where(eq(service.id, result.id));
        }

        // ========== 5. РџРµСЂРµСЃС‡С‘С‚ С†РµРїРѕС‡РєРё ==========

        await recalcChain(db, result.placementId, parsed.serviceDate);

        // РџРµСЂРµС‡РёС‚С‹РІР°РµРј РѕР±СЃР»СѓР¶РёРІР°РЅРёРµ РїРѕСЃР»Рµ РїРµСЂРµСЃС‡С‘С‚Р°, С‡С‚РѕР±С‹ РїРѕР»СѓС‡РёС‚СЊ РІС‹С‡РёСЃР»РµРЅРЅС‹Рµ РїРѕР»СЏ
        const [updatedService] = await db
          .select()
          .from(service)
          .where(eq(service.id, result.id));

        const calculations = updatedService
          ? {
              newGames: updatedService.newGames ?? 0,
              revenue: Number(updatedService.revenue ?? 0),
              costOfToys: Number(updatedService.costOfToys ?? 0),
              roi: updatedService.roi ? Number(updatedService.roi) : null,
              periodDays: updatedService.periodDays ?? 0,
            }
          : {
              newGames: 0,
              revenue: 0,
              costOfToys: 0,
              roi: null,
              periodDays: 0,
            };

        return {
          success: true as const,
          recordId: result.id,
          calculations,
        };
      } catch (err) {
        // РћР±СЂР°Р±РѕС‚РєР° РёР·РІРµСЃС‚РЅС‹С… РѕС€РёР±РѕРє
        if (err instanceof DuplicateError) {
          return reply.status(409).send({
            success: false,
            errors: [
              { field: "serviceDate", message: err.message },
            ],
          });
        }

        if (err instanceof CounterMonotonicError) {
          return reply.status(422).send({
            success: false,
            errors: [
              {
                field: "gameCounter",
                message: `Counter must be >= ${err.expectedMin} (got ${err.actualValue})`,
              },
            ],
          });
        }

        request.log.error(err, "Unexpected sync error");
        return reply.status(500).send({
          success: false,
          errors: [
            { field: "server", message: "Internal server error" },
          ],
        });
      }
    },
  );
}
