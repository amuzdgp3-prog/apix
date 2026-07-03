import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DollarSign,
  MapPin,
  TrendingUp,
  Wrench,
  BarChart4,
  Table2,
} from "lucide-react";
import { api } from "@/api/client";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
} from "recharts";

interface ByRoute {
  routeId?: number;
  routeName: string;
  machinesCount: number;
  servicesCount: number;
  totalRevenue: number;
  averageRoi: number | null;
}

interface ByTechnician {
  staffId: number;
  staffName: string;
  routeName: string;
  servicesCount: number;
  totalRevenue: number;
  averageTimeMinutes: number | null;
}

interface ByType {
  typeId: number;
  typeName: string;
  machinesCount: number;
  averageRevenue: number;
  averageRoi: number | null;
  averagePeriodDays: number | null;
}

interface AnalyticsResponse {
  byRoute: ByRoute[];
  byTechnician: ByTechnician[];
  byType: ByType[];
  summary: {
    totalMachines: number;
    totalRoutes: number;
    totalTechnicians: number;
    overallRoi: number | null;
  };
}

const formatRevenue = (n: number) => {
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  return `${(n / 1000).toFixed(0)}K`;
};

const tooltipLabelFormatter = (_: string, payload: any[]) => {
  return (payload?.[0]?.payload as { fullName?: string })?.fullName ?? _;
};

export default function Analytics() {
  const [viewMode, setViewMode] = useState<"table" | "chart">("table");

  const { data, isLoading } = useQuery<AnalyticsResponse>({
    queryKey: ["reports", "analytics"],
    queryFn: () => api.get<AnalyticsResponse>("/reports/analytics"),
  });

  const summary = data?.summary ?? {
    totalMachines: 0,
    totalRoutes: 0,
    totalTechnicians: 0,
    overallRoi: null,
  };

  const chartRevenueByRoute = (data?.byRoute ?? [])
    .map((r) => ({
      name:
        r.routeName.length > 12
          ? r.routeName.slice(0, 10) + "\u2026"
          : r.routeName,
      fullName: r.routeName,
      "Выручка": r.totalRevenue,
    }))
    .sort((a, b) => b["Выручка"] - a["Выручка"]);

  const chartRoiByType = (data?.byType ?? []).map((t) => ({
    name: t.typeName,
    ROI: t.averageRoi != null ? Math.round(t.averageRoi) : 0,
    fullName: t.typeName,
  }));

  const techChartData = (data?.byTechnician ?? [])
    .map((t) => ({
      name: t.staffName.split(" ")[0],
      fullName: t.staffName,
      "Выручка": t.totalRevenue,
    }))
    .sort((a, b) => b["Выручка"] - a["Выручка"]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Аналитика</h1>
          <p className="text-muted-foreground">
            Сравнительный анализ по маршрутам, техникам и типам машин
          </p>
        </div>
        <Tabs
          value={viewMode}
          onValueChange={(v) => setViewMode(v as "table" | "chart")}
        >
          <TabsList>
            <TabsTrigger value="table" className="gap-1">
              <Table2 className="h-3.5 w-3.5" /> Таблица
            </TabsTrigger>
            <TabsTrigger value="chart" className="gap-1">
              <BarChart4 className="h-3.5 w-3.5" /> Графики
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Всего машин</CardTitle>
            <Wrench className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalMachines}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Маршрутов</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalRoutes}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Техников</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalTechnicians}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Средний ROI</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summary.overallRoi != null
                ? `${Math.round(summary.overallRoi)}%`
                : "\u2014"}
            </div>
          </CardContent>
        </Card>
      </div>

      {isLoading ? (
        <p className="text-center py-8 text-muted-foreground">Загрузка...</p>
      ) : viewMode === "table" ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">По маршрутам</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Маршрут</TableHead>
                    <TableHead className="text-right">Машин</TableHead>
                    <TableHead className="text-right">ТО</TableHead>
                    <TableHead className="text-right">Выручка</TableHead>
                    <TableHead className="text-right">Ср. ROI</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(data?.byRoute ?? []).map((r) => (
                    <TableRow key={r.routeName}>
                      <TableCell className="font-medium">
                        {r.routeName}
                      </TableCell>
                      <TableCell className="text-right">
                        {r.machinesCount}
                      </TableCell>
                      <TableCell className="text-right">
                        {r.servicesCount}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatRevenue(r.totalRevenue)}₽
                      </TableCell>
                      <TableCell className="text-right">
                        {r.averageRoi != null
                          ? `${Math.round(r.averageRoi)}%`
                          : "\u2014"}
                      </TableCell>
                    </TableRow>
                  ))}
                  {(data?.byRoute ?? []).length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="text-center py-8 text-muted-foreground"
                      >
                        Нет данных
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">По техникам</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Техник</TableHead>
                      <TableHead>Маршрут</TableHead>
                      <TableHead className="text-right">ТО</TableHead>
                      <TableHead className="text-right">Выручка</TableHead>
                      <TableHead className="text-right">
                        Ср. время (мин)
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(data?.byTechnician ?? []).map((t) => (
                      <TableRow key={t.staffId}>
                        <TableCell className="font-medium">
                          {t.staffName}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {t.routeName}
                        </TableCell>
                        <TableCell className="text-right">
                          {t.servicesCount}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatRevenue(t.totalRevenue)}₽
                        </TableCell>
                        <TableCell className="text-right">
                          {t.averageTimeMinutes ?? "\u2014"}
                        </TableCell>
                      </TableRow>
                    ))}
                    {(data?.byTechnician ?? []).length === 0 && (
                      <TableRow>
                        <TableCell
                          colSpan={5}
                          className="text-center py-8 text-muted-foreground"
                        >
                          Нет данных
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">По типам машин</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Тип</TableHead>
                      <TableHead className="text-right">Кол-во</TableHead>
                      <TableHead className="text-right">Ср. выручка</TableHead>
                      <TableHead className="text-right">Ср. ROI</TableHead>
                      <TableHead className="text-right">
                        Ср. период (дн.)
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(data?.byType ?? []).map((t) => (
                      <TableRow key={t.typeId}>
                        <TableCell className="font-medium">
                          {t.typeName}
                        </TableCell>
                        <TableCell className="text-right">
                          {t.machinesCount}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatRevenue(t.averageRevenue)}₽
                        </TableCell>
                        <TableCell className="text-right">
                          {t.averageRoi != null
                            ? `${Math.round(t.averageRoi)}%`
                            : "\u2014"}
                        </TableCell>
                        <TableCell className="text-right">
                          {t.averagePeriodDays ?? "\u2014"}
                        </TableCell>
                      </TableRow>
                    ))}
                    {(data?.byType ?? []).length === 0 && (
                      <TableRow>
                        <TableCell
                          colSpan={5}
                          className="text-center py-8 text-muted-foreground"
                        >
                          Нет данных
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                Выручка по маршрутам
              </CardTitle>
            </CardHeader>
            <CardContent>
              {chartRevenueByRoute.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">
                  Нет данных
                </p>
              ) : (
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart
                    data={chartRevenueByRoute}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" fontSize={12} tickLine={false} />
                    <YAxis
                      fontSize={12}
                      tickLine={false}
                      tickFormatter={(v: number) => formatRevenue(v)}
                    />
                    <Tooltip
                      formatter={(value: number) =>
                        [`${value.toLocaleString()}₽`, ""] as [string, string]
                      }
                      labelFormatter={tooltipLabelFormatter}
                    />
                    <Legend />
                    <Bar
                      dataKey="Выручка"
                      fill="#6366f1"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  ROI по типам машин
                </CardTitle>
              </CardHeader>
              <CardContent>
                {chartRoiByType.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground">
                    Нет данных
                  </p>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <RadarChart data={chartRoiByType}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="name" fontSize={12} />
                      <Radar
                        name="ROI %"
                        dataKey="ROI"
                        stroke="#22c55e"
                        fill="#22c55e"
                        fillOpacity={0.2}
                      />
                      <Tooltip
                        formatter={(value: number) =>
                          [`${value}%`, "ROI"] as [string, string]
                        }
                        labelFormatter={tooltipLabelFormatter}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  Выручка по техникам
                </CardTitle>
              </CardHeader>
              <CardContent>
                {techChartData.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground">
                    Нет данных
                  </p>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart
                      data={techChartData}
                      layout="vertical"
                      margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        type="number"
                        fontSize={12}
                        tickFormatter={(v: number) => formatRevenue(v)}
                      />
                      <YAxis
                        type="category"
                        dataKey="name"
                        fontSize={12}
                        width={80}
                      />
                      <Tooltip
                        formatter={(value: number) =>
                          [`${value.toLocaleString()}₽`, ""] as [
                            string,
                            string,
                          ]
                        }
                        labelFormatter={tooltipLabelFormatter}
                      />
                      <Bar
                        dataKey="Выручка"
                        fill="#f59e0b"
                        radius={[0, 4, 4, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}