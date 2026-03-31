import { db } from "@/db";
import { getAllNodes } from "./node";
import { XtlsApi } from "@remnawave/xtls-sdk";
import type { UserMonthlyTraffic } from "@/types";

const XRAY_API_PORT = "10086";

type UsageMetric = "uplink" | "downlink" | "unclassified";
type SourceType = "hy2" | "xray";

type SourceStateRow = {
  last_value: number;
};

type VlessSecretRow = {
  user_id: string;
  vless: string;
};

type TrafficUsageRow = {
  user_id: string;
  month_key: string;
  uplink_bytes: number | bigint;
  downlink_bytes: number | bigint;
  unclassified_bytes: number | bigint;
  updated_at: string | null;
};

type UserTrafficRow = {
  monthly_limit_bytes: number | bigint | null;
  uplink_bytes: number | bigint;
  downlink_bytes: number | bigint;
  unclassified_bytes: number | bigint;
};

export type UserTrafficLimitStatus = {
  monthKey: string;
  limitBytes: number | null;
  uplinkBytes: number;
  downlinkBytes: number;
  unclassifiedBytes: number;
  usedBytes: number;
  overLimit: boolean;
};

function getCurrentMonthKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function getCurrentMonthExpireUnix(date = new Date()): number {
  const nextMonthStart = new Date(
    date.getFullYear(),
    date.getMonth() + 1,
    1,
    0,
    0,
    0,
    0,
  );
  return Math.floor(nextMonthStart.getTime() / 1000);
}

function toSafeCounter(value: number): number {
  if (!Number.isFinite(value) || value < 0) return 0;
  return Math.floor(value);
}

function toNumber(value: number | bigint): number {
  return typeof value === "bigint" ? Number(value) : value;
}

function toLimitNumber(value: number | bigint | null): number | null {
  if (value == null) return null;
  return typeof value === "bigint" ? Number(value) : value;
}

function addTrafficDelta(
  userId: string,
  monthKey: string,
  metric: UsageMetric,
  delta: number,
): void {
  const safeDelta = toSafeCounter(delta);
  if (safeDelta <= 0) return;

  const uplink = metric === "uplink" ? safeDelta : 0;
  const downlink = metric === "downlink" ? safeDelta : 0;
  const unclassified = metric === "unclassified" ? safeDelta : 0;

  db.query(
    `
      INSERT INTO traffic_usage_monthly (
        user_id,
        month_key,
        uplink_bytes,
        downlink_bytes,
        unclassified_bytes,
        created_at,
        updated_at
      ) VALUES (?1, ?2, ?3, ?4, ?5, datetime('now', 'localtime'), datetime('now', 'localtime'))
      ON CONFLICT(user_id, month_key) DO UPDATE SET
        uplink_bytes = uplink_bytes + excluded.uplink_bytes,
        downlink_bytes = downlink_bytes + excluded.downlink_bytes,
        unclassified_bytes = unclassified_bytes + excluded.unclassified_bytes,
        updated_at = datetime('now', 'localtime')
    `,
  ).run(userId, monthKey, uplink, downlink, unclassified);
}

function consumeMonotonicCounter(params: {
  sourceType: SourceType;
  sourceKey: string;
  metric: string;
  userId: string;
  usageMetric: UsageMetric;
  currentValue: number;
  monthKey?: string;
}): number {
  const {
    sourceType,
    sourceKey,
    metric,
    userId,
    usageMetric,
    currentValue,
    monthKey = getCurrentMonthKey(),
  } = params;

  const safeCurrent = toSafeCounter(currentValue);
  const sourceStateQuery = db.query(
    `
      SELECT last_value
      FROM traffic_source_state
      WHERE source_type = ?1 AND source_key = ?2 AND metric = ?3
    `,
  );

  const existing = sourceStateQuery.get(
    sourceType,
    sourceKey,
    metric,
  ) as SourceStateRow | null;

  if (!existing) {
    db.query(
      `
        INSERT INTO traffic_source_state (
          source_type,
          source_key,
          metric,
          user_id,
          last_value,
          created_at,
          updated_at
        ) VALUES (?1, ?2, ?3, ?4, ?5, datetime('now', 'localtime'), datetime('now', 'localtime'))
      `,
    ).run(sourceType, sourceKey, metric, userId, safeCurrent);
    return 0;
  }

  const delta = safeCurrent >= existing.last_value ? safeCurrent - existing.last_value : 0;

  db.query(
    `
      UPDATE traffic_source_state
      SET user_id = ?1,
          last_value = ?2,
          updated_at = datetime('now', 'localtime')
      WHERE source_type = ?3 AND source_key = ?4 AND metric = ?5
    `,
  ).run(userId, safeCurrent, sourceType, sourceKey, metric);

  if (delta > 0) {
    addTrafficDelta(userId, monthKey, usageMetric, delta);
  }

  return delta;
}

export function trackHysteria2Traffic(params: {
  userId: string;
  addr: string;
  tx: number;
}): number {
  const sourceKey = `${params.userId}:${params.addr || "unknown"}`;
  return consumeMonotonicCounter({
    sourceType: "hy2",
    sourceKey,
    metric: "tx",
    userId: params.userId,
    usageMetric: "unclassified",
    currentValue: params.tx,
  });
}

export async function syncVlessTrafficUsage(): Promise<{
  monthKey: string;
  scannedNodes: number;
  processedUsers: number;
  deltaUplinkBytes: number;
  deltaDownlinkBytes: number;
  errors: { nodeId: string; message: string }[];
}> {
  const monthKey = getCurrentMonthKey();
  const nodes = getAllNodes().filter((node) => node.type === "vless");
  const secretRows = db
    .query("SELECT user_id, vless FROM user_secrets")
    .all() as VlessSecretRow[];
  const userIdByVless = new Map(secretRows.map((row) => [row.vless, row.user_id]));

  const errors: { nodeId: string; message: string }[] = [];
  let processedUsers = 0;
  let deltaUplinkBytes = 0;
  let deltaDownlinkBytes = 0;

  for (const node of nodes) {
    try {
      const api = new XtlsApi(node.host, XRAY_API_PORT);
      const response = await api.stats.getAllUsersStats();
      if (!response.isOk || !response.data) {
        errors.push({
          nodeId: node.id,
          message: response.message || "Unknown Xray stats error",
        });
        continue;
      }

      for (const stat of response.data.users) {
        const username = stat.username;
        if (!username) continue;

        const userId = userIdByVless.get(username);
        if (!userId) continue;

        processedUsers += 1;
        const sourceKey = `${node.id}:${username}`;

        deltaUplinkBytes += consumeMonotonicCounter({
          sourceType: "xray",
          sourceKey,
          metric: "uplink",
          userId,
          usageMetric: "uplink",
          currentValue: stat.uplink,
          monthKey,
        });

        deltaDownlinkBytes += consumeMonotonicCounter({
          sourceType: "xray",
          sourceKey,
          metric: "downlink",
          userId,
          usageMetric: "downlink",
          currentValue: stat.downlink,
          monthKey,
        });
      }
    } catch (error) {
      errors.push({
        nodeId: node.id,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return {
    monthKey,
    scannedNodes: nodes.length,
    processedUsers,
    deltaUplinkBytes,
    deltaDownlinkBytes,
    errors,
  };
}

export function listUsersMonthlyTraffic(monthKey = getCurrentMonthKey()): UserMonthlyTraffic[] {
  const rows = db
    .query(
      `
        SELECT
          u.id AS user_id,
          ?1 AS month_key,
          COALESCE(t.uplink_bytes, 0) AS uplink_bytes,
          COALESCE(t.downlink_bytes, 0) AS downlink_bytes,
          COALESCE(t.unclassified_bytes, 0) AS unclassified_bytes,
          t.updated_at AS updated_at
        FROM users AS u
        LEFT JOIN traffic_usage_monthly AS t
          ON t.user_id = u.id AND t.month_key = ?1
      `,
    )
    .all(monthKey) as TrafficUsageRow[];

  return rows.map((row) => {
    const uplinkBytes = toNumber(row.uplink_bytes);
    const downlinkBytes = toNumber(row.downlink_bytes);
    const unclassifiedBytes = toNumber(row.unclassified_bytes);

    return {
      userId: row.user_id,
      monthKey: row.month_key,
      uplinkBytes,
      downlinkBytes,
      unclassifiedBytes,
      totalBytes: uplinkBytes + downlinkBytes + unclassifiedBytes,
      updatedAt: row.updated_at,
    };
  });
}

export function getUserTrafficLimitStatus(
  userId: string,
  monthKey = getCurrentMonthKey(),
): UserTrafficLimitStatus | null {
  const row = db
    .query(
      `
        SELECT
          u.monthly_limit_bytes AS monthly_limit_bytes,
          COALESCE(t.uplink_bytes, 0) AS uplink_bytes,
          COALESCE(t.downlink_bytes, 0) AS downlink_bytes,
          COALESCE(t.unclassified_bytes, 0) AS unclassified_bytes
        FROM users AS u
        LEFT JOIN traffic_usage_monthly AS t
          ON t.user_id = u.id AND t.month_key = ?2
        WHERE u.id = ?1
      `,
    )
    .get(userId, monthKey) as UserTrafficRow | null;

  if (!row) return null;

  const limitBytes = toLimitNumber(row.monthly_limit_bytes);
  const uplinkBytes = toNumber(row.uplink_bytes);
  const downlinkBytes = toNumber(row.downlink_bytes);
  const unclassifiedBytes = toNumber(row.unclassified_bytes);
  const usedBytes = uplinkBytes + downlinkBytes + unclassifiedBytes;

  return {
    monthKey,
    limitBytes,
    uplinkBytes,
    downlinkBytes,
    unclassifiedBytes,
    usedBytes,
    overLimit: limitBytes != null && usedBytes >= limitBytes,
  };
}

export function buildSubscriptionUserinfoHeader(
  userId: string,
): string | null {
  const status = getUserTrafficLimitStatus(userId);
  if (!status) return null;

  const upload = status.uplinkBytes;
  const download = status.downlinkBytes + status.unclassifiedBytes;
  const expire = getCurrentMonthExpireUnix();
  const parts = [`upload=${upload}`, `download=${download}`];

  if (status.limitBytes != null) {
    parts.push(`total=${status.limitBytes}`);
  }

  parts.push(`expire=${expire}`);
  return parts.join("; ");
}

export function resetUserMonthlyTraffic(userId: string, monthKey = getCurrentMonthKey()): void {
  db.query(
    `
      INSERT INTO traffic_usage_monthly (
        user_id,
        month_key,
        uplink_bytes,
        downlink_bytes,
        unclassified_bytes,
        created_at,
        updated_at
      ) VALUES (?1, ?2, 0, 0, 0, datetime('now', 'localtime'), datetime('now', 'localtime'))
      ON CONFLICT(user_id, month_key) DO UPDATE SET
        uplink_bytes = 0,
        downlink_bytes = 0,
        unclassified_bytes = 0,
        updated_at = datetime('now', 'localtime')
    `,
  ).run(userId, monthKey);
}
