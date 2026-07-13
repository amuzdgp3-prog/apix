import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { eq, isNull, and, desc, sql, gte, lte } from "drizzle-orm";
import { zSchema } from "../utils/zod-json-schema.js";
import { authenticate } from "../plugins/auth.js";
import { db } from "../db/index.js";
import { machines } from "../db/schema/machines.js";
import { machinePlacements } from "../db/schema/placements.js";
import { service } from "../db/schema/services.js";
import { locations } from "../db/schema/locations.js";
import { machineTypes } from "../db/schema/machine-types.js";
import { staff } from "../db/schema/staff.js";
import ExcelJS from "exceljs";

const tags = ["Reports"];

export async function reportRoutes(app: FastifyInstance) {

  // GET /api/reports/dashboard
  app.get(
    "/api/reports/dashboard",
    {
      preValidation: [authenticate],
      schema: {
        tags,
        querystring: zSchema(z.strictObject({ cityId: z.string().optional() })),
        response: {
         200: zSchema(z.strictObject({
             machines: z.array(z.strictObject({
               number: z.number().int().positive(),
               locationName: z.string(),
               typeName: z.string(),
               status: z.string(),
               gameCounter: z.number().int().min(0).nullable(),
               revenue30d: z.number(),
               lastRoi: z.number().nullable(),
               roiTrend: z.array(z.number().nullable()),
               trendLabel: z.string(),
               lastServiceDate: z.string().nullable(),
               lastServiceBy: z.string().nullable(),
               photoCounterUrl: z.string().nullable(),
             })),
            summary: z.strictObject({
              totalMachines: z.number().int().min(0),
              totalServices30d: z.number().int().min(0),
              totalRevenue30d: z.number(),
              overdueCount: z.number().int().min(0),
            }),
          })),
        },
      } as any,
    },
    async (request: FastifyRequest, _reply: FastifyReply) => {
      const user = request.user;
      const d30 = new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];

      let cityLocIds: number[] | null = null;
      if (user.cityId != null) {
        const subtree = await db.execute<{ id: number }>(sql`
          WITH RECURSIVE t AS (
            SELECT id FROM ${locations} WHERE id = ${user.cityId}
            UNION ALL SELECT l.id FROM ${locations} l INNER JOIN t ON l.parent_id = t.id
          ) SELECT id FROM t
        `);
        cityLocIds = (subtree as unknown as { id: number }[]).map(r => r.id);
      }

      const conds = [eq(machines.status, "active"), isNull(machines.deletedAt)];
      if (cityLocIds?.length) conds.push(sql`${machines.locationId} = ANY(${cityLocIds})`);

      const rows = await db
        .select({ number: machines.number, locationName: locations.name, typeName: machineTypes.name, status: machines.status })
        .from(machines)
        .innerJoin(locations, eq(machines.locationId, locations.id))
        .innerJoin(machineTypes, eq(machines.typeId, machineTypes.id))
        .where(and(...conds));

      const result = await Promise.all(rows.map(async (m) => {
        const [last] = await db
          .select({ gc: service.gameCounter, roi: service.roi, d: service.serviceDate, photoCounterUrl: service.photoCounterUrl })
          .from(service)
          .innerJoin(machinePlacements, eq(service.placementId, machinePlacements.id))
          .where(and(eq(machinePlacements.machineNumber, m.number), isNull(machinePlacements.endedAt)))
          .orderBy(desc(service.serviceDate)).limit(1);

        const [rev] = await db
          .select({ total: sql<number>`COALESCE(SUM(${service.revenue}),0)` })
          .from(service)
          .innerJoin(machinePlacements, eq(service.placementId, machinePlacements.id))
          .where(and(eq(machinePlacements.machineNumber, m.number), gte(service.serviceDate, d30)));

        const roiRows = await db
          .select({ roi: service.roi })
          .from(service)
          .innerJoin(machinePlacements, eq(service.placementId, machinePlacements.id))
          .where(eq(machinePlacements.machineNumber, m.number))
          .orderBy(desc(service.serviceDate)).limit(5);

        const trend = roiRows.map(r => r.roi != null ? Number(r.roi) : null).reverse();
        let label = "нет данных";
        if (roiRows.length >= 4) {
          const diff = (trend[trend.length - 1] ?? 0) - (trend[0] ?? 0);
          label = diff > 0.5 ? "растёт" : diff < -0.5 ? "падает" : "нестабильно";
        } else if (roiRows.length >= 2) {
          label = "мало данных";
        }

        return {
          number: m.number, locationName: m.locationName, typeName: m.typeName, status: m.status,
          gameCounter: last?.gc ?? null, revenue30d: Number(rev?.total ?? 0),
          lastRoi: last?.roi != null ? Number(last.roi) : null, roiTrend: trend, trendLabel: label,
          lastServiceDate: last?.d ?? null, lastServiceBy: null,
          photoCounterUrl: last?.photoCounterUrl ?? null,
        };
      }));
      result.sort((a, b) => a.number - b.number);

      return {
        machines: result,
        summary: {
          totalMachines: result.length,
          totalServices30d: result.filter(m => m.lastServiceDate && m.lastServiceDate >= d30).length,
          totalRevenue30d: result.reduce((s, m) => s + m.revenue30d, 0),
          overdueCount: result.filter(m => {
            if (!m.lastServiceDate) return true;
            return (Date.now() - new Date(m.lastServiceDate).getTime()) / 86400000 > 60;
          }).length,
        },
      };
    },
  );

  // GET /api/reports/revenue
  app.get(
    "/api/reports/revenue",
    {
      preValidation: [authenticate],
      schema: {
        tags,
        querystring: zSchema(z.strictObject({
          dateFrom: z.string().optional(), dateTo: z.string().optional(),
          locationId: z.string().optional(), groupBy: z.enum(["day","month","location","machine","type"]).optional(),
        })),
        response: {
          200: zSchema(z.strictObject({
            data: z.array(z.strictObject({
              period: z.string(), servicesCount: z.number().int().min(0),
              totalRevenue: z.number(), totalCostOfToys: z.number(), totalProfit: z.number(),
              averageRoi: z.number().nullable(),
            })),
            summary: z.strictObject({
              totalRevenue: z.number(), totalCostOfToys: z.number(),
              totalProfit: z.number(), overallRoi: z.number().nullable(),
            }),
          })),
        },
      } as any,
    },
    async (request: FastifyRequest) => {
      const { dateFrom, dateTo, locationId, groupBy = "month" } = request.query as any;
      const conds: ReturnType<typeof and>[] = [];
      if (dateFrom) conds.push(gte(service.serviceDate, dateFrom));
      if (dateTo) conds.push(lte(service.serviceDate, dateTo));
      if (locationId) conds.push(eq(machines.locationId, Number(locationId)));

      const rows = await db
        .select({
          d: service.serviceDate, rev: service.revenue, cost: service.costOfToys,
          roi: service.roi, mn: machinePlacements.machineNumber,
          loc: locations.name, typ: machineTypes.name,
        })
        .from(service)
        .innerJoin(machinePlacements, eq(service.placementId, machinePlacements.id))
        .innerJoin(machines, eq(machinePlacements.machineNumber, machines.number))
        .innerJoin(locations, eq(machines.locationId, locations.id))
        .innerJoin(machineTypes, eq(machines.typeId, machineTypes.id))
        .where(and(...conds));

      const groups = new Map<string, typeof rows>();
      for (const r of rows) {
        let k: string;
        switch (groupBy) {
          case "day": k = r.d; break;
          case "month": k = r.d.substring(0, 7); break;
          case "location": k = r.loc; break;
          case "machine": k = String(r.mn); break;
          case "type": k = r.typ; break;
          default: k = r.d.substring(0, 7);
        }
        if (!groups.has(k)) groups.set(k, []);
        groups.get(k)!.push(r);
      }

      const data = [...groups.entries()].map(([period, grp]) => {
        const cnt = grp.length;
        const tr = grp.reduce((s, r) => s + Number(r.rev ?? 0), 0);
        const tc = grp.reduce((s, r) => s + Number(r.cost ?? 0), 0);
        const tp = tr - tc;
        const aroi = cnt > 0 ? grp.reduce((s, r) => s + Number(r.roi ?? 0), 0) / cnt : null;
        return { period, servicesCount: cnt, totalRevenue: tr, totalCostOfToys: tc, totalProfit: tp, averageRoi: aroi };
      });
      data.sort((a, b) => a.period.localeCompare(b.period));

      return {
        data,
        summary: {
          totalRevenue: data.reduce((s, d) => s + d.totalRevenue, 0),
          totalCostOfToys: data.reduce((s, d) => s + d.totalCostOfToys, 0),
          totalProfit: data.reduce((s, d) => s + d.totalProfit, 0),
          overallRoi: data.length > 0 ? data.reduce((s, d) => s + (d.averageRoi ?? 0), 0) / data.length : null,
        },
      };
    },
  );

  // GET /api/reports/analytics
  app.get(
    "/api/reports/analytics",
    {
      preValidation: [authenticate],
      schema: {
        tags,
        querystring: zSchema(z.strictObject({ dateFrom: z.string().optional(), dateTo: z.string().optional() })),
        response: {
          200: zSchema(z.strictObject({
            byRoute: z.array(z.strictObject({
              routeId: z.number().int().optional(), routeName: z.string(), machinesCount: z.number().int().min(0),
              servicesCount: z.number().int().min(0), totalRevenue: z.number(), averageRoi: z.number().nullable(),
            })),
            byTechnician: z.array(z.strictObject({
              staffId: z.number().int(), staffName: z.string(), routeName: z.string(),
              servicesCount: z.number().int().min(0), totalRevenue: z.number(), averageTimeMinutes: z.number().nullable(),
            })),
            byType: z.array(z.strictObject({
              typeId: z.number().int(), typeName: z.string(), machinesCount: z.number().int().min(0),
              averageRevenue: z.number(), averageRoi: z.number().nullable(), averagePeriodDays: z.number().nullable(),
            })),
            summary: z.strictObject({
              totalMachines: z.number().int().min(0), totalRoutes: z.number().int().min(0),
              totalTechnicians: z.number().int().min(0), overallRoi: z.number().nullable(),
            }),
          })),
        },
      } as any,
    },
    async (request: FastifyRequest) => {
      const { dateFrom, dateTo } = request.query as { dateFrom?: string; dateTo?: string };
      const conds: ReturnType<typeof and>[] = [];
      if (dateFrom) conds.push(gte(service.serviceDate, dateFrom));
      if (dateTo) conds.push(lte(service.serviceDate, dateTo));

      const rows = await db
        .select({
          rev: service.revenue, roi: service.roi, d: service.serviceDate,
          mn: machinePlacements.machineNumber, typ: machineTypes.name, tid: machines.typeId,
          loc: locations.name, sid: service.staffId,
        })
        .from(service)
        .innerJoin(machinePlacements, eq(service.placementId, machinePlacements.id))
        .innerJoin(machines, eq(machinePlacements.machineNumber, machines.number))
        .innerJoin(machineTypes, eq(machines.typeId, machineTypes.id))
        .innerJoin(locations, eq(machines.locationId, locations.id))
        .where(and(...conds));

      const routeMap = new Map<string, { rev: number; roi: number; cnt: number; ms: Set<number> }>();
      for (const r of rows) {
        const k = r.loc;
        if (!routeMap.has(k)) routeMap.set(k, { rev: 0, roi: 0, cnt: 0, ms: new Set() });
        const g = routeMap.get(k)!;
        g.rev += Number(r.rev ?? 0); g.roi += Number(r.roi ?? 0); g.cnt++; g.ms.add(r.mn);
      }
      const byRoute = [...routeMap.entries()].map(([k, g]) => ({
        routeName: k, machinesCount: g.ms.size, servicesCount: g.cnt,
        totalRevenue: g.rev, averageRoi: g.cnt > 0 ? g.roi / g.cnt : null,
      }));

      const typeMap = new Map<number, { name: string; rev: number; roi: number; cnt: number; ms: Set<number> }>();
      for (const r of rows) {
        const k = r.tid;
        if (!typeMap.has(k)) typeMap.set(k, { name: r.typ, rev: 0, roi: 0, cnt: 0, ms: new Set() });
        const g = typeMap.get(k)!;
        g.rev += Number(r.rev ?? 0); g.roi += Number(r.roi ?? 0); g.cnt++; g.ms.add(r.mn);
      }
      const byType = [...typeMap.entries()].map(([k, g]) => ({
        typeId: k, typeName: g.name, machinesCount: g.ms.size,
        averageRevenue: g.cnt > 0 ? g.rev / g.cnt : 0,
        averageRoi: g.cnt > 0 ? g.roi / g.cnt : null, averagePeriodDays: null,
      }));

      const staffMap = new Map<number, string>();
      const allStaff = await db.select({ id: staff.id, fullName: staff.fullName }).from(staff).where(eq(staff.isActive, true));
      for (const s of allStaff) staffMap.set(s.id, s.fullName);

      const techMap = new Map<number, { rev: number; cnt: number; loc: string }>();
      for (const r of rows) {
        const k = r.sid;
        if (!techMap.has(k)) techMap.set(k, { rev: 0, cnt: 0, loc: "" });
        const g = techMap.get(k)!;
        g.rev += Number(r.rev ?? 0); g.cnt++;
        if (!g.loc && r.loc) g.loc = r.loc;
      }
      const byTechnician = [...techMap.entries()].map(([k, g]) => ({
        staffId: k, staffName: staffMap.get(k) ?? String(k),
        routeName: g.loc, servicesCount: g.cnt, totalRevenue: g.rev, averageTimeMinutes: null,
      }));

      return {
        byRoute,
        byTechnician,
        byType,
        summary: {
          totalMachines: new Set(rows.map((r) => r.mn)).size,
          totalRoutes: routeMap.size,
          totalTechnicians: techMap.size,
          overallRoi:
            rows.length > 0
              ? rows.reduce((s, r) => s + Number(r.roi ?? 0), 0) / rows.length
              : null,
        },
      };
    },
  );

  // GET /api/reports/export
  app.get(
    "/api/reports/export",
    {
      preValidation: [authenticate],
      schema: {
        tags,
        querystring: zSchema(
          z.strictObject({
            dateFrom: z.string().optional(),
            dateTo: z.string().optional(),
            format: z.enum(["csv", "json", "xlsx"]).optional(),
          }),
        ),
      } as any,
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { dateFrom, dateTo, format = "json" } = request.query as any;
      const conds: ReturnType<typeof and>[] = [];
      if (dateFrom) conds.push(gte(service.serviceDate, dateFrom));
      if (dateTo) conds.push(lte(service.serviceDate, dateTo));

      const rows = await db
        .select({
          d: service.serviceDate,
          mn: machinePlacements.machineNumber,
          rev: service.revenue,
          cost: service.costOfToys,
          roi: service.roi,
          loc: locations.name,
          typ: machineTypes.name,
          sf: staff.fullName,
          gc: service.gameCounter,
        })
        .from(service)
        .innerJoin(machinePlacements, eq(service.placementId, machinePlacements.id))
        .innerJoin(machines, eq(machinePlacements.machineNumber, machines.number))
        .innerJoin(locations, eq(machines.locationId, locations.id))
        .innerJoin(machineTypes, eq(machines.typeId, machineTypes.id))
        .innerJoin(staff, eq(service.staffId, staff.id))
        .where(and(...conds))
        .orderBy(desc(service.serviceDate));

      const data = rows.map((r) => ({
        date: r.d,
        machine: r.mn,
        location: r.loc,
        type: r.typ,
        revenue: Number(r.rev ?? 0),
        cost: Number(r.cost ?? 0),
        profit: Number(r.rev ?? 0) - Number(r.cost ?? 0),
        roi: r.roi != null ? Number(r.roi) : null,
        technician: r.sf,
        gameCounter: r.gc,
      }));

      if (format === "xlsx") {
        const workbook = new ExcelJS.Workbook();
        workbook.creator = "Apix Slot Manager";
        workbook.created = new Date();

        const sheet = workbook.addWorksheet("Отчёт");

        // Заголовки
        sheet.columns = [
          { header: "Дата", key: "date", width: 12 },
          { header: "Аппарат №", key: "machine", width: 12 },
          { header: "Точка", key: "location", width: 20 },
          { header: "Тип", key: "type", width: 18 },
          { header: "Выручка (₽)", key: "revenue", width: 14 },
          { header: "Себестоимость (₽)", key: "cost", width: 18 },
          { header: "Прибыль (₽)", key: "profit", width: 14 },
          { header: "ROI", key: "roi", width: 10 },
          { header: "Техник", key: "technician", width: 24 },
          { header: "Счётчик игр", key: "gameCounter", width: 14 },
        ];

        // Стиль заголовков
        const headerRow = sheet.getRow(1);
        headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
        headerRow.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FF1E293B" },
        };
        headerRow.alignment = { horizontal: "center", vertical: "middle" };
        headerRow.height = 24;

        // Данные
        data.forEach((d) => {
          sheet.addRow({
            date: d.date,
            machine: d.machine,
            location: d.location,
            type: d.type,
            revenue: d.revenue,
            cost: d.cost,
            profit: d.profit,
            roi: d.roi !== null ? Number(d.roi.toFixed(2)) : "",
            technician: d.technician,
            gameCounter: d.gameCounter,
          });
        });

        // Чередование строк
        sheet.eachRow((row, rowNumber) => {
          if (rowNumber > 1) {
            if (rowNumber % 2 === 0) {
              row.eachCell((cell) => {
                cell.fill = {
                  type: "pattern",
                  pattern: "solid",
                  fgColor: { argb: "FFF1F5F9" },
                };
              });
            }
          }
        });

        // Итоговая строка
        const totalRow = sheet.addRow({
          date: "ИТОГО",
          machine: "",
          location: "",
          type: "",
          revenue: data.reduce((s, d) => s + d.revenue, 0),
          cost: data.reduce((s, d) => s + d.cost, 0),
          profit: data.reduce((s, d) => s + d.profit, 0),
          roi: "",
          technician: `Записей: ${data.length}`,
          gameCounter: "",
        });
        totalRow.font = { bold: true };
        totalRow.getCell("revenue").numFmt = "#,##0.00";
        totalRow.getCell("cost").numFmt = "#,##0.00";
        totalRow.getCell("profit").numFmt = "#,##0.00";

        const buffer = await workbook.xlsx.writeBuffer();

        return reply
          .header(
            "Content-Type",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          )
          .header(
            "Content-Disposition",
            `attachment; filename=report_${new Date().toISOString().split("T")[0]}.xlsx`,
          )
          .send(Buffer.from(buffer));
      }

      if (format === "csv") {
        const headers = "date,machine,location,type,revenue,cost,profit,roi,technician,gameCounter";
        const csvLines = data.map((d) =>
          [
            d.date,
            d.machine,
            '"' + String(d.location) + '"',
            '"' + String(d.type) + '"',
            d.revenue,
            d.cost,
            d.profit,
            d.roi ?? "",
            '"' + String(d.technician) + '"',
            d.gameCounter,
          ].join(","),
        );
        return reply
          .header("Content-Type", "text/csv; charset=utf-8")
          .header("Content-Disposition", "attachment; filename=report.csv")
          .send([headers, ...csvLines].join("\n"));
      }

      return { export: data };
    },
  );
}
