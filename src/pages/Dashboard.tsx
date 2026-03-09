import { useEffect, useMemo, useState, type ComponentType } from "react";
import {
  Activity,
  ArrowUpRight,
  Cable,
  Globe,
  Users as UsersIcon,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { apiCallSWR } from "@/client";
import type {
  NodeTrafficSummary,
  TrafficOverview,
  UserTrafficPoint,
  UserTrafficSummary,
} from "@/types";

const formatBytes = (bytes: number) => {
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  if (bytes === 0) return "0 B";
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

const getTrafficBytes = (entry?: {
  totalBytes?: number;
  usageBytes?: number;
  bytes?: number;
} | null) => entry?.totalBytes ?? entry?.usageBytes ?? entry?.bytes ?? 0;

const getRequestCount = (entry?: {
  requestCount?: number;
  visits?: number;
} | null) => entry?.requestCount ?? entry?.visits ?? 0;

const normalizeDateLabel = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
};

const StatCard = ({
  title,
  value,
  description,
  icon: Icon,
}: {
  title: string;
  value: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
}) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <div>
        <CardDescription>{title}</CardDescription>
        <CardTitle className="mt-2 text-2xl font-semibold">{value}</CardTitle>
      </div>
      <div className="rounded-lg bg-primary/10 p-2 text-primary">
        <Icon className="h-4 w-4" />
      </div>
    </CardHeader>
    <CardContent>
      <p className="text-sm text-muted-foreground">{description}</p>
    </CardContent>
  </Card>
);

const SimpleBarChart = ({ points }: { points: UserTrafficPoint[] }) => {
  const maxBytes = Math.max(...points.map((point) => getTrafficBytes(point)), 0);

  if (points.length === 0) {
    return (
      <div className="flex h-52 items-center justify-center text-sm text-muted-foreground">
        No traffic data yet.
      </div>
    );
  }

  return (
    <div className="flex h-52 items-end gap-2">
      {points.map((point, index) => {
        const value = getTrafficBytes(point);
        const height = maxBytes > 0 ? Math.max((value / maxBytes) * 100, 6) : 6;

        return (
          <div key={`${point.date}-${index}`} className="flex flex-1 flex-col items-center gap-2">
            <div className="flex h-44 w-full items-end">
              <div
                className="w-full rounded-t-md bg-primary/80 transition-all"
                style={{ height: `${height}%` }}
                title={`${normalizeDateLabel(point.date)}: ${formatBytes(value)}`}
              />
            </div>
            <div className="text-[10px] text-muted-foreground sm:text-xs">
              {normalizeDateLabel(point.date)}
            </div>
          </div>
        );
      })}
    </div>
  );
};

const RankingList = ({
  items,
  emptyLabel,
}: {
  items: Array<UserTrafficSummary | NodeTrafficSummary>;
  emptyLabel: string;
}) => {
  if (items.length === 0) {
    return <div className="text-sm text-muted-foreground">{emptyLabel}</div>;
  }

  return (
    <div className="space-y-4">
      {items.map((item, index) => (
        <div key={`${item.id ?? item.name}-${index}`} className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Badge variant="outline">#{index + 1}</Badge>
                <span className="truncate font-medium">{item.name}</span>
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                {getRequestCount(item)} requests
              </div>
            </div>
            <div className="text-right text-sm font-medium tabular-nums">
              {formatBytes(getTrafficBytes(item))}
            </div>
          </div>
          {index < items.length - 1 && <Separator />}
        </div>
      ))}
    </div>
  );
};

export const Dashboard = () => {
  const [trafficOverview, setTrafficOverview] = useState<TrafficOverview | null>(null);

  useEffect(() => {
    apiCallSWR("/api/dashboard/traffic", "GET", undefined, setTrafficOverview);
  }, []);

  const totalBytes = getTrafficBytes(trafficOverview);
  const totalRequests = getRequestCount(trafficOverview);
  const subscriptionVisits =
    trafficOverview?.subscriptionVisits ?? trafficOverview?.visits ?? totalRequests;
  const activeUsers = trafficOverview?.activeUsers ?? trafficOverview?.users?.length ?? 0;
  const activeNodes = trafficOverview?.activeNodes ?? trafficOverview?.nodes?.length ?? 0;

  const timeSeries = useMemo(
    () =>
      trafficOverview?.timeSeries ??
      trafficOverview?.timeseries ??
      trafficOverview?.dailyTraffic ??
      [],
    [trafficOverview],
  );

  const topUsers = useMemo(
    () => trafficOverview?.topUsers ?? trafficOverview?.users ?? trafficOverview?.userTraffic ?? [],
    [trafficOverview],
  );

  const topNodes = useMemo(
    () => trafficOverview?.topNodes ?? trafficOverview?.nodes ?? [],
    [trafficOverview],
  );

  return (
    <div className="flex-1 space-y-4">
      <div>
        <h2 className="text-3xl font-normal font-header tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">
          Traffic overview across users, subscriptions, and nodes
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Total traffic"
          value={formatBytes(totalBytes)}
          description="Combined downstream usage"
          icon={Activity}
        />
        <StatCard
          title="Subscription visits"
          value={subscriptionVisits.toLocaleString()}
          description="Recent subscription fetch volume"
          icon={Globe}
        />
        <StatCard
          title="Active users"
          value={activeUsers.toLocaleString()}
          description="Users with recorded traffic"
          icon={UsersIcon}
        />
        <StatCard
          title="Active nodes"
          value={activeNodes.toLocaleString()}
          description="Nodes serving recorded traffic"
          icon={Cable}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              Traffic trend
              <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
            </CardTitle>
            <CardDescription>Recent traffic over time</CardDescription>
          </CardHeader>
          <CardContent>
            <SimpleBarChart points={timeSeries} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Overview</CardTitle>
            <CardDescription>High-level request totals</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Requests</span>
              <span className="font-medium tabular-nums">
                {totalRequests.toLocaleString()}
              </span>
            </div>
            <Separator />
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Subscription visits</span>
              <span className="font-medium tabular-nums">
                {subscriptionVisits.toLocaleString()}
              </span>
            </div>
            <Separator />
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Traffic</span>
              <span className="font-medium tabular-nums">{formatBytes(totalBytes)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Top users</CardTitle>
            <CardDescription>Users generating the most traffic</CardDescription>
          </CardHeader>
          <CardContent>
            <RankingList items={topUsers.slice(0, 5)} emptyLabel="No user traffic data." />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Top nodes</CardTitle>
            <CardDescription>Nodes serving the most traffic</CardDescription>
          </CardHeader>
          <CardContent>
            <RankingList items={topNodes.slice(0, 5)} emptyLabel="No node traffic data." />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
