import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  Server,
  HardDrive,
  Cpu,
  MemoryStick as MemoryIcon,
  Database,
  CircleDot,
  Circle,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  RefreshCw,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { api } from "@/api/client";
import { useState } from "react";

interface CpuMetric {
  usagePercent: number;
  cores: number;
}

interface MemoryMetric {
  totalMB: number;
  usedMB: number;
  usagePercent: number;
  processMB: number;
}

interface DiskMetric {
  totalGB: number;
  freeGB: number;
  usagePercent: number;
}

interface UptimeMetric {
  processSeconds: number;
  systemSeconds: number;
}

interface NodeInfo {
  version: string;
  env: string;
  pid: number;
}

interface SystemMetric {
  cpu: CpuMetric;
  memory: MemoryMetric;
  disk: DiskMetric;
  uptime: UptimeMetric;
  node: NodeInfo;
}

interface ErrorLog {
  id: number;
  level: string;
  message: string;
  stack: string | null;
  context: Record<string, unknown> | null;
  createdAt: string;
}

interface MonitoringResponse {
  timestamp: string;
  system: SystemMetric;
  dependencies: {
    postgres: "connected" | "disconnected" | "error";
    minio: "connected" | "disconnected" | "error";
  };
  recentErrors: ErrorLog[];
}

interface ErrorsResponse {
  items: ErrorLog[];
  total: number;
  page: number;
  limit: number;
}

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;

  const parts: string[] = [];
  if (d > 0) parts.push(`${d}д`);
  if (h > 0) parts.push(`${h}ч`);
  if (m > 0) parts.push(`${m}м`);
  if (parts.length === 0 || s > 0) parts.push(`${s}с`);
  return parts.join(" ");
}

function dependencyIcon(status: string) {
  if (status === "connected") {
    return <CircleDot className="h-4 w-4 text-green-500" />;
  }
  if (status === "disconnected") {
    return <Circle className="h-4 w-4 text-red-500" />;
  }
  return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
}

function dependencyLabel(status: string): string {
  if (status === "connected") return "Подключено";
  if (status === "disconnected") return "Отключено";
  return "Ошибка";
}

function levelBadge(level: string) {
  switch (level) {
    case "fatal":
      return <Badge variant="destructive">FATAL</Badge>;
    case "error":
      return <Badge variant="destructive">ERROR</Badge>;
    case "warn":
      return (
        <Badge className="bg-yellow-500 hover:bg-yellow-600 text-white">
          WARN
        </Badge>
      );
    default:
      return <Badge variant="secondary">{level}</Badge>;
  }
}

function usageColor(pct: number): string {
  if (pct > 90) return "text-red-600";
  if (pct > 70) return "text-yellow-600";
  return "text-green-600";
}

export default function Monitoring() {
  const [errorsPage, setErrorsPage] = useState(1);
  const [showStack, setShowStack] = useState<Record<number, boolean>>({});

  const { data: metrics, isLoading: metricsLoading, refetch: refetchMetrics } =
    useQuery<MonitoringResponse>({
      queryKey: ["monitoring", "metrics"],
      queryFn: () =>
        api
          .get<MonitoringResponse>("/api/monitoring/metrics"),
      refetchInterval: 30_000,
    });

  const { data: errors, isLoading: errorsLoading } = useQuery<ErrorsResponse>({
    queryKey: ["monitoring", "errors", errorsPage],
      queryFn: () =>
        api
          .get<ErrorsResponse>(
            `/api/monitoring/errors?page=${errorsPage}&limit=20`
          ),
    refetchInterval: 30_000,
  });

  const toggleStack = (id: number) => {
    setShowStack((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  if (metricsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Загрузка метрик...</div>
      </div>
    );
  }

  if (!metrics) return null;

  const { system, dependencies, recentErrors } = metrics;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Мониторинг системы</h1>
        <Button variant="outline" size="sm" onClick={() => refetchMetrics()}>
          <RefreshCw className="h-4 w-4 mr-1" />
          Обновить
        </Button>
      </div>

      {/* Status overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Сервер
            </CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold text-green-600">Online</div>
            <p className="text-xs text-muted-foreground mt-1">
              Uptime: {formatUptime(system.uptime.processSeconds)}
            </p>
            <p className="text-xs text-muted-foreground">
              Node {system.node.version} | PID {system.node.pid}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              PostgreSQL
            </CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {dependencyIcon(dependencies.postgres)}
              <span
                className={`text-lg font-bold ${
                  dependencies.postgres === "connected"
                    ? "text-green-600"
                    : "text-red-600"
                }`}
              >
                {dependencyLabel(dependencies.postgres)}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              MinIO
            </CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {dependencyIcon(dependencies.minio)}
              <span
                className={`text-lg font-bold ${
                  dependencies.minio === "connected"
                    ? "text-green-600"
                    : "text-red-600"
                }`}
              >
                {dependencyLabel(dependencies.minio)}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Ошибки (24ч)
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div
              className={`text-lg font-bold ${
                recentErrors.length > 0 ? "text-red-600" : "text-green-600"
              }`}
            >
              {recentErrors.length > 0
                ? `${recentErrors.length} ошибок`
                : "Чисто"}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* System resources */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* CPU */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              <Cpu className="h-4 w-4 inline mr-2" />
              Процессор
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${usageColor(system.cpu.usagePercent)}`}
            >
              {system.cpu.usagePercent}%
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2 mt-2">
              <div
                className={`h-2 rounded-full transition-all ${
                  system.cpu.usagePercent > 90
                    ? "bg-red-500"
                    : system.cpu.usagePercent > 70
                      ? "bg-yellow-500"
                      : "bg-green-500"
                }`}
                style={{ width: `${system.cpu.usagePercent}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {system.cpu.cores} ядер
            </p>
          </CardContent>
        </Card>

        {/* Memory */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              <MemoryIcon className="h-4 w-4 inline mr-2" />
              Память
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${usageColor(system.memory.usagePercent)}`}
            >
              {system.memory.usagePercent}%
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2 mt-2">
              <div
                className={`h-2 rounded-full transition-all ${
                  system.memory.usagePercent > 90
                    ? "bg-red-500"
                    : system.memory.usagePercent > 70
                      ? "bg-yellow-500"
                      : "bg-green-500"
                }`}
                style={{ width: `${system.memory.usagePercent}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {system.memory.usedMB} / {system.memory.totalMB} MB
            </p>
            <p className="text-xs text-muted-foreground">
              Процесс: {system.memory.processMB} MB
            </p>
          </CardContent>
        </Card>

        {/* Disk */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              <HardDrive className="h-4 w-4 inline mr-2" />
              Диск
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${usageColor(system.disk.usagePercent)}`}
            >
              {system.disk.usagePercent}%
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2 mt-2">
              <div
                className={`h-2 rounded-full transition-all ${
                  system.disk.usagePercent > 90
                    ? "bg-red-500"
                    : system.disk.usagePercent > 70
                      ? "bg-yellow-500"
                      : "bg-green-500"
                }`}
                style={{ width: `${system.disk.usagePercent}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Свободно: {system.disk.freeGB} / {system.disk.totalGB} GB
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent errors */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Последние ошибки ({errors?.total ?? recentErrors.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {errorsLoading ? (
            <div className="text-center text-muted-foreground py-4">
              Загрузка...
            </div>
          ) : errors && errors.items.length > 0 ? (
            <div className="space-y-2">
              {(errors?.items ?? recentErrors).map((err) => (
                <div
                  key={err.id}
                  className="border rounded-lg p-3 bg-slate-50"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {levelBadge(err.level)}
                      <span className="text-sm font-medium truncate max-w-md">
                        {err.message}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {new Date(err.createdAt).toLocaleString("ru-RU")}
                      </span>
                      {err.stack && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => toggleStack(err.id)}
                        >
                          {showStack[err.id] ? (
                            <ChevronUp className="h-3 w-3" />
                          ) : (
                            <ChevronDown className="h-3 w-3" />
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                  {showStack[err.id] && err.stack && (
                    <pre className="mt-2 text-xs bg-slate-800 text-slate-100 p-2 rounded overflow-x-auto max-h-40">
                      {err.stack}
                    </pre>
                  )}
                  {err.context && (
                    <div className="mt-1 text-xs text-muted-foreground">
                      Контекст: {JSON.stringify(err.context, null, 2)}
                    </div>
                  )}
                </div>
              ))}

              {errors && errors.total > errors.limit && (
                <div className="flex items-center justify-between mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={errorsPage <= 1}
                    onClick={() => setErrorsPage((p) => Math.max(1, p - 1))}
                  >
                    Назад
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Стр. {errors.page} из{" "}
                    {Math.ceil(errors.total / errors.limit)}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={
                      errorsPage >= Math.ceil(errors.total / errors.limit)
                    }
                    onClick={() => setErrorsPage((p) => p + 1)}
                  >
                    Вперёд
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center text-green-600 py-8">
              <Activity className="h-8 w-8 mx-auto mb-2" />
              <p className="font-medium">Ошибок нет</p>
              <p className="text-sm text-muted-foreground">
                Система работает стабильно
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}