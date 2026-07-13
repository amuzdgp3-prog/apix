import os from "node:os";
import { exec } from "node:child_process";
import { promisify } from "node:util";
import type { SystemMetric, DependencyStatus } from "@apix/shared";

const execAsync = promisify(exec);

const processStartTime = Date.now();

/** Получить загрузку CPU (Windows/Linux совместимо) */
async function getCpuUsage(): Promise<{ usagePercent: number; cores: number }> {
  const cores = os.cpus().length;

  try {
    if (process.platform === "win32") {
      // Windows: используем wmic для получения загрузки CPU
      const { stdout } = await execAsync(
        'wmic cpu get loadpercentage /value',
        { timeout: 5000 }
      );
      const match = stdout.match(/LoadPercentage=(\d+)/);
      const usagePercent = match ? parseInt(match[1], 10) : 0;
      return { usagePercent: Math.min(100, Math.max(0, usagePercent)), cores };
    }

    // Linux: читаем /proc/stat
    const { stdout } = await execAsync("cat /proc/stat", { timeout: 5000 });
    const line = stdout.split("\n").find((l) => l.startsWith("cpu "));
    if (!line) {
      return { usagePercent: 0, cores };
    }

    const parts = line.trim().split(/\s+/).slice(1).map(Number);
    const idle = parts[3] ?? 0;
    const total = parts.reduce((a, b) => a + b, 0);

    // Ждём 100ms и читаем снова для расчёта дельты
    await new Promise((r) => setTimeout(r, 100));
    const { stdout: stdout2 } = await execAsync("cat /proc/stat", {
      timeout: 5000,
    });
    const line2 = stdout2.split("\n").find((l) => l.startsWith("cpu "));
    if (!line2) {
      return { usagePercent: 0, cores };
    }

    const parts2 = line2.trim().split(/\s+/).slice(1).map(Number);
    const idle2 = parts2[3] ?? 0;
    const total2 = parts2.reduce((a, b) => a + b, 0);

    const idleDelta = idle2 - idle;
    const totalDelta = total2 - total;

    if (totalDelta === 0) return { usagePercent: 0, cores };

    const usagePercent = Math.round(
      ((totalDelta - idleDelta) / totalDelta) * 100
    );
    return { usagePercent: Math.min(100, Math.max(0, usagePercent)), cores };
  } catch {
    return { usagePercent: 0, cores };
  }
}

/** Получить загрузку памяти */
async function getMemoryUsage() {
  const totalMB = Math.round(os.totalmem() / (1024 * 1024));
  const freeMB = Math.round(os.freemem() / (1024 * 1024));
  const usedMB = totalMB - freeMB;
  const usagePercent = Math.round((usedMB / totalMB) * 100);
  const processMB = Math.round(process.memoryUsage().rss / (1024 * 1024));

  return { totalMB, usedMB, usagePercent, processMB };
}

/** Получить загрузку диска */
async function getDiskUsage(): Promise<{
  totalGB: number;
  freeGB: number;
  usagePercent: number;
}> {
  try {
    if (process.platform === "win32") {
      // Windows: получаем информацию о диске C:
      const { stdout } = await execAsync(
        'wmic logicaldisk where "DeviceID=\'C:\'" get Size,FreeSpace /value',
        { timeout: 5000 }
      );
      const sizeMatch = stdout.match(/Size=(\d+)/);
      const freeMatch = stdout.match(/FreeSpace=(\d+)/);

      const totalGB = sizeMatch
        ? Math.round((parseInt(sizeMatch[1], 10) / (1024 * 1024 * 1024)) * 10) / 10
        : 0;
      const freeGB = freeMatch
        ? Math.round((parseInt(freeMatch[1], 10) / (1024 * 1024 * 1024)) * 10) / 10
        : 0;
      const usagePercent =
        totalGB > 0 ? Math.round(((totalGB - freeGB) / totalGB) * 100) : 0;

      return { totalGB, freeGB, usagePercent };
    }

    // Linux: df -h /
    const { stdout } = await execAsync("df -BG /", { timeout: 5000 });
    const line = stdout.split("\n")[1];
    if (!line) return { totalGB: 0, freeGB: 0, usagePercent: 0 };

    const parts = line.trim().split(/\s+/);
    const totalGB = parseInt(parts[1]?.replace("G", "") ?? "0", 10);
    const usedGB = parseInt(parts[2]?.replace("G", "") ?? "0", 10);
    const freeGB = parseInt(parts[3]?.replace("G", "") ?? "0", 10);
    const usagePercent =
      totalGB > 0 ? Math.round((usedGB / totalGB) * 100) : 0;

    return { totalGB, freeGB, usagePercent };
  } catch {
    return { totalGB: 0, freeGB: 0, usagePercent: 0 };
  }
}

/** Получить uptime */
async function getUptime() {
  const processSeconds = Math.floor((Date.now() - processStartTime) / 1000);
  const systemSeconds = Math.floor(os.uptime());

  return { processSeconds, systemSeconds };
}

/** Сбор всех системных метрик */
export async function collectSystemMetrics(): Promise<SystemMetric> {
  const [cpu, memory, disk, uptime] = await Promise.all([
    getCpuUsage(),
    getMemoryUsage(),
    getDiskUsage(),
    getUptime(),
  ]);

  return {
    cpu,
    memory,
    disk,
    uptime,
    node: {
      version: process.version,
      env: process.env.NODE_ENV ?? "development",
      pid: process.pid,
    },
  };
}