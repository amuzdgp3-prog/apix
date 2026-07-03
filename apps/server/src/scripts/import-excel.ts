/**
 * Скрипт импорта исторических данных из Excel.
 * Запуск: cd apps/server; npx tsx src/scripts/import-excel.ts
 *
 * Порядок работы:
 * 1. Очистить ВСЕ таблицы БД
 * 2. Создать seed-данные (пользователи, типы аппаратов, игрушки)
 * 3. Прочитать Excel, сгруппировать локации по городам
 * 4. Создать локации, машины, placements
 * 5. Импортировать 1816 обслуживаний
 * 6. Пересчитать цепочки (chainRecalc)
 */

import ExcelJS from "exceljs";
import { db } from "../db/index.js";
import * as schema from "../db/schema/index.js";
import bcrypt from "bcryptjs";
import { recalcChain } from "../services/chainRecalc.js";

// ============ Константы ============
const EXCEL_PATH = "c:/Users/Evgeny/Desktop/99999999.xlsx";
const SHEET_NAME = "Лист1";
const DEFAULT_SERVICE_TIME = "15:00:00";
const DEFAULT_STAFF_EMAIL = "ivan@test.com";
const ADMIN_EMAIL = "admin@test.com";
const DEFAULT_PASSWORD = "admin123";

const TOYS = [
  { name: "Мягкая игрушка", shortName: "МягИг", price: 26 },
  { name: "Малый брелок", shortName: "МалБр", price: 22 },
  { name: "Большой брелок", shortName: "БолБр", price: 56 },
];

interface ExcelRow {
  date: string;
  locationId: number;
  address: string;
  gameCounter: number;
  prizeCounter: number;
  myagIg: number;
  malBr: number;
  bolBr: number;
  testGames: number;
  priceGame: number;
  priceMyagIg: number;
  priceMalBr: number;
  priceBolBr: number;
  comment: string;
}

// ============ Очистка БД ============
async function clearDatabase() {
  console.log("🧹 Очистка базы данных...");
  const tables = [
    schema.toyDistribution,
    schema.service,
    schema.machinePlacements,
    schema.machineTechnicians,
    schema.machineRoutes,
    schema.machineToys,
    schema.machineTypeToys,
    schema.machines,
    schema.routeLocations,
    schema.routes,
    schema.toyPriceHistory,
    schema.toys,
    schema.machineTypes,
    schema.locations,
    schema.refreshTokens,
    schema.auditLog,
    schema.auditLogArchive,
    schema.staff,
  ];
  for (const table of tables) {
    await db.delete(table);
  }
  console.log("✅ База данных очищена");
}

// ============ Seed-данные ============
async function createSeedData() {
  console.log("🌱 Создание seed-данных...");
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

  const [admin] = await db.insert(schema.staff).values({
    email: ADMIN_EMAIL, fullName: "Администратор", password: passwordHash,
    role: "admin", isActive: true,
  }).returning({ id: schema.staff.id });

  const [ivan] = await db.insert(schema.staff).values({
    email: DEFAULT_STAFF_EMAIL, fullName: "Иван (техник)", password: passwordHash,
    role: "technician", isActive: true,
  }).returning({ id: schema.staff.id });

  console.log(`  👤 admin: id=${admin.id}, ${ADMIN_EMAIL}`);
  console.log(`  👤 ivan: id=${ivan.id}, ${DEFAULT_STAFF_EMAIL}`);

  const [machineType] = await db.insert(schema.machineTypes).values({
    name: "Хватайка",
  }).returning({ id: schema.machineTypes.id });
  console.log(`  🎰 machine_type: id=${machineType.id}`);

  const toyIds: Record<string, number> = {};
  for (const toy of TOYS) {
    const [created] = await db.insert(schema.toys).values({
      name: toy.name, price: toy.price.toString(),
    }).returning({ id: schema.toys.id });
    toyIds[toy.shortName] = created.id;
    console.log(`  🧸 ${toy.name}: id=${created.id}, ${toy.price}₽`);
  }

  return { adminId: admin.id, ivanId: ivan.id, machineTypeId: machineType.id, toyIds };
}

// ============ Парсинг Excel ============
function parseLocationField(raw: string): { locationId: number; address: string } {
  const colonIndex = raw.indexOf(":");
  if (colonIndex === -1) throw new Error(`Неверный формат поля "Аппарат": ${raw}`);
  return {
    locationId: parseInt(raw.substring(0, colonIndex).trim(), 10),
    address: raw.substring(colonIndex + 1).trim(),
  };
}

function extractCity(address: string): string {
  const commaIndex = address.indexOf(",");
  return commaIndex === -1 ? address.trim() : address.substring(0, commaIndex).trim();
}

function parseDate(raw: unknown): string {
  if (raw instanceof Date) return raw.toISOString().slice(0, 10);
  const str = String(raw ?? "").trim();
  const parts = str.split(".");
  if (parts.length === 3) {
    const y = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
    return `${y}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) return str.slice(0, 10);
  throw new Error(`Неизвестный формат даты: ${str}`);
}

async function parseExcel(): Promise<ExcelRow[]> {
  console.log(`📖 Чтение Excel: ${EXCEL_PATH}`);
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(EXCEL_PATH);
  const sheet = workbook.getWorksheet(SHEET_NAME);
  if (!sheet) throw new Error(`Лист "${SHEET_NAME}" не найден`);
  console.log(`  Строк: ${sheet.rowCount}, колонок: ${sheet.columnCount}`);

  // Индексы колонок: C1=порядковый номер, C2=дата, C3=аппарат, C4=счетчик игр,
  // C5=счетчик призов, C6=МягИг, C7=МалБр, C8=БолБр, C9=тестовые игры,
  // C10=цена игры, C11=цена МягИг, C12=цена МалБр, C13=цена БолБр, C14=комментарий
  const rows: ExcelRow[] = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const dateRaw = row.getCell(2).value;
    if (!dateRaw) return;
    const rawApparat = String(row.getCell(3).value ?? "").trim();
    if (!rawApparat) return;
    const { locationId, address } = parseLocationField(rawApparat);

    rows.push({
      date: parseDate(dateRaw), locationId, address,
      gameCounter: Number(row.getCell(4).value) || 0,
      prizeCounter: Number(row.getCell(5).value) || 0,
      myagIg: Number(row.getCell(6).value) || 0,
      malBr: Number(row.getCell(7).value) || 0,
      bolBr: Number(row.getCell(8).value) || 0,
      testGames: Number(row.getCell(9).value) || 0,
      priceGame: Number(row.getCell(10).value) || 10,
      priceMyagIg: Number(row.getCell(11).value) || 26,
      priceMalBr: Number(row.getCell(12).value) || 22,
      priceBolBr: Number(row.getCell(13).value) || 56,
      comment: String(row.getCell(14).value ?? "").trim(),
    });
  });
  console.log(`  Прочитано строк: ${rows.length}`);
  return rows;
}

// ============ Импорт данных ============
interface LocationInfo { city: string; address: string; excelLocationId: number; }

async function importData(
  rows: ExcelRow[], ivanId: number, machineTypeId: number, toyIds: Record<string, number>
) {
  console.log("\n📥 Импорт данных...");

  // 1. Уникальные локации
  const locationMap = new Map<string, LocationInfo>();
  for (const row of rows) {
    const key = `${row.locationId}:${row.address}`;
    if (!locationMap.has(key)) {
      locationMap.set(key, { city: extractCity(row.address), address: row.address, excelLocationId: row.locationId });
    }
  }
  console.log(`  Уникальных локаций: ${locationMap.size}`);

  // 2. Города
  const cityMap = new Map<string, number>();
  for (const [, loc] of locationMap) {
    if (!cityMap.has(loc.city)) {
      const [city] = await db.insert(schema.locations).values({
        name: loc.city, nodeType: "city",
      }).returning({ id: schema.locations.id });
      cityMap.set(loc.city, city.id);
      console.log(`  🏙️ Город: ${loc.city} (id=${city.id})`);
    }
  }

  // 3. Точки и машины
  const addressToPointId = new Map<string, number>();
  const addressToMachineNumber = new Map<string, number>();
  const machineToLocationKey = new Map<number, string>();
  let machineCounter = 1;

  for (const [key, loc] of locationMap) {
    const cityId = cityMap.get(loc.city)!;
    const [point] = await db.insert(schema.locations).values({
      name: loc.address, parentId: cityId, nodeType: "point",
    }).returning({ id: schema.locations.id });
    addressToPointId.set(key, point.id);

    const machineNumber = machineCounter++;
    await db.insert(schema.machines).values({
      number: machineNumber, locationId: point.id, typeId: machineTypeId,
      status: "active", pricePerGame: "10.00", hasPrizeCounter: true,
    });
    addressToMachineNumber.set(key, machineNumber);
    machineToLocationKey.set(machineNumber, key);
  }
  console.log(`  📍 Точек: ${addressToPointId.size}, 🎰 Машин: ${addressToMachineNumber.size}`);

  // 4. Placements
  const machineToPlacement = new Map<number, number>();
  for (const [key, machineNumber] of addressToMachineNumber) {
    const firstRow = rows.find((r) => `${r.locationId}:${r.address}` === key);
    const [placement] = await db.insert(schema.machinePlacements).values({
      machineNumber,
      gameCounterInitial: firstRow?.gameCounter ?? 0,
      prizeCounterInitial: firstRow?.prizeCounter ?? 0,
      createdBy: ivanId,
    }).returning({ id: schema.machinePlacements.id });
    machineToPlacement.set(machineNumber, placement.id);
  }
  console.log(`  📦 Placements: ${machineToPlacement.size}`);

  // 5. Импорт обслуживаний (отсортированных по дате для каждой машины)
  console.log(`  📝 Импорт ${rows.length} обслуживаний...`);

  // Группируем по ключу локации и сортируем по дате
  const grouped = new Map<string, ExcelRow[]>();
  for (const row of rows) {
    const key = `${row.locationId}:${row.address}`;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(row);
  }

  let serviceCount = 0;
  for (const [key, machineRows] of grouped) {
    // Сортируем по дате
    machineRows.sort((a, b) => a.date.localeCompare(b.date));
    const machineNumber = addressToMachineNumber.get(key);
    const placementId = machineToPlacement.get(machineNumber!);
    if (!placementId) continue;

    for (const row of machineRows) {
      const [svc] = await db.insert(schema.service).values({
        placementId,
        machineNumber,
        staffId: ivanId,
        serviceDate: row.date,
        serviceTime: DEFAULT_SERVICE_TIME,
        gameCounter: row.gameCounter,
        prizeCounter: row.prizeCounter,
        testGames: row.testGames,
        isOperational: true,
        comment: row.comment || null,
        pricePerGame: row.priceGame.toString(),
      }).returning({ id: schema.service.id });

      // Распределение игрушек
      const distributions: { toyId: number; quantity: number; priceSnapshot: string; totalCost: string }[] = [];
      if (row.myagIg > 0) {
        distributions.push({
          toyId: toyIds["МягИг"], quantity: row.myagIg,
          priceSnapshot: row.priceMyagIg.toString(),
          totalCost: (row.myagIg * row.priceMyagIg).toString(),
        });
      }
      if (row.malBr > 0) {
        distributions.push({
          toyId: toyIds["МалБр"], quantity: row.malBr,
          priceSnapshot: row.priceMalBr.toString(),
          totalCost: (row.malBr * row.priceMalBr).toString(),
        });
      }
      if (row.bolBr > 0) {
        distributions.push({
          toyId: toyIds["БолБр"], quantity: row.bolBr,
          priceSnapshot: row.priceBolBr.toString(),
          totalCost: (row.bolBr * row.priceBolBr).toString(),
        });
      }

      for (const d of distributions) {
        await db.insert(schema.toyDistribution).values({
          serviceId: svc.id, toyId: d.toyId, quantity: d.quantity,
          priceSnapshot: d.priceSnapshot, totalCost: d.totalCost,
        });
      }

      serviceCount++;
      if (serviceCount % 100 === 0) {
        console.log(`    ... ${serviceCount}/${rows.length} обслуживаний`);
      }
    }
  }
  console.log(`  ✅ Импортировано обслуживаний: ${serviceCount}`);

  // 6. Пересчёт цепочек (нужен startDate — дата первого обслуживания в placement)
  // Собираем первую дату для каждого ключа локации
  const firstDateByKey = new Map<string, string>();
  for (const [key, machineRows] of grouped) {
    const sorted = [...machineRows].sort((a, b) => a.date.localeCompare(b.date));
    firstDateByKey.set(key, sorted[0].date);
  }

  console.log("\n🔄 Пересчёт цепочек обслуживаний...");
  let recalcCount = 0;
  for (const [machineNumber, placementId] of machineToPlacement) {
    const key = machineToLocationKey.get(machineNumber);
    const startDate = key ? firstDateByKey.get(key) : undefined;
    if (!startDate) {
      console.error(`  ⚠️ Не найдена startDate для машины ${machineNumber}`);
      continue;
    }
    try {
      await recalcChain(db, placementId, startDate);
      recalcCount++;
    } catch (e: any) {
      console.error(`  ⚠️ Ошибка пересчёта placement ${placementId} (машина ${machineNumber}): ${e.message}`);
    }
  }
  console.log(`  ✅ Пересчитано цепочек: ${recalcCount}`);

  return { serviceCount, machineCount: machineToPlacement.size };
}

// ============ Main ============
async function main() {
  console.log("🚀 Импорт исторических данных из Excel\n");
  console.log("=" .repeat(60));

  try {
    await clearDatabase();
    const { adminId, ivanId, machineTypeId, toyIds } = await createSeedData();
    const rows = await parseExcel();
    const result = await importData(rows, ivanId, machineTypeId, toyIds);

    console.log("\n" + "=".repeat(60));
    console.log("✅ ИМПОРТ ЗАВЕРШЁН УСПЕШНО");
    console.log(`   Машин: ${result.machineCount}`);
    console.log(`   Обслуживаний: ${result.serviceCount}`);
    console.log(`   Пользователей: admin (id=${adminId}), ivan (id=${ivanId})`);
    console.log("=".repeat(60));

    process.exit(0);
  } catch (error: any) {
    console.error("\n❌ ОШИБКА ИМПОРТА:", error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();