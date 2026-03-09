import { db } from "@/db";
import type { TrafficOverview, UserTrafficPoint, UserTrafficSummary } from "@/types";
import { getNode } from "./node";
import { getUser, getUserByUserSecrets } from "./user";

interface TrafficMetricInput {
  metric: "subscription_visit" | "api_request" | "node_auth_success" | "node_auth_failure";
  userId?: string | null;
  nodeId?: string | null;
  occurredAt?: Date;
}

interface TrafficRecordInput {
  userId: string;
  bytesUp?: number;
  bytesDown?: number;
  totalBytes?: number;
  occurredAt?: Date;
}

interface TrafficReportRecord {
  userId?: string;
  auth?: string;
  secret?: string;
  bytesUp?: number;
  bytesDown?: number;
  totalBytes?: number;
  bytes?: number;
}

interface IngestTrafficReportInput {
  reportId: string;
  nodeId: string;
  occurredAt?: string;
  records: TrafficReportRecord[];
}

function toSqlTimestamp(date = new Date()) {
  return date.toISOString().slice(0, 19).replace("T", " ");
}

function toSqlDate(date = new Date()) {
  return toSqlTimestamp(date).slice(0, 10);
}

function toNumber(value: unknown) {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number : 0;
}

function resolveOccurredAt(value?: string) {
  if (!value) {
    return new Date();
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function recordTrafficMetric({
  metric,
  userId = null,
  nodeId = null,
  occurredAt = new Date(),
}: TrafficMetricInput) {
  const dateKey = toSqlDate(occurredAt);
  const recordedAt = toSqlTimestamp(occurredAt);

  db.query(
    `INSERT INTO traffic_stats (
      date_key,
      metric,
      user_id,
      node_id,
      count,
      last_access_at
    ) VALUES (?1, ?2, ?3, ?4, 1, ?5)
    ON CONFLICT(date_key, metric, user_id, node_id)
    DO UPDATE SET
      count = count + 1,
      last_access_at = excluded.last_access_at`,
  ).run(dateKey, metric, userId ?? "", nodeId ?? "", recordedAt);
}

function getMetricOverview() {
  const row = (db.query(
    `SELECT
      COALESCE(SUM(CASE WHEN metric = 'subscription_visit' THEN count END), 0) AS subscriptionVisits,
      COALESCE(SUM(CASE WHEN metric = 'api_request' THEN count END), 0) AS apiRequests,
      COALESCE(SUM(CASE WHEN metric = 'node_auth_success' THEN count END), 0) AS nodeAuthSuccessCount,
      COALESCE(SUM(CASE WHEN metric = 'node_auth_failure' THEN count END), 0) AS nodeAuthFailureCount,
      MAX(last_access_at) AS lastAccessAt,
      COUNT(DISTINCT CASE WHEN user_id != '' THEN user_id END) AS metricActiveUsers,
      COUNT(DISTINCT CASE WHEN node_id != '' THEN node_id END) AS metricActiveNodes
    FROM traffic_stats`,
  ).get() ?? {}) as Record<string, unknown>;

  const subscriptionVisits = toNumber(row.subscriptionVisits);
  const apiRequests = toNumber(row.apiRequests);
  const nodeAuthSuccessCount = toNumber(row.nodeAuthSuccessCount);
  const nodeAuthFailureCount = toNumber(row.nodeAuthFailureCount);
  const requestCount = apiRequests + nodeAuthSuccessCount + nodeAuthFailureCount;

  return {
    subscriptionVisits,
    apiRequests,
    nodeAuthSuccessCount,
    nodeAuthFailureCount,
    requestCount,
    visits: subscriptionVisits,
    eventCount: subscriptionVisits + requestCount,
    lastAccessAt: row.lastAccessAt ? String(row.lastAccessAt) : null,
    metricActiveUsers: toNumber(row.metricActiveUsers),
    metricActiveNodes: toNumber(row.metricActiveNodes),
  };
}

function recordUserTraffic({
  userId,
  bytesUp = 0,
  bytesDown = 0,
  totalBytes,
  occurredAt = new Date(),
}: TrafficRecordInput) {
  const normalizedBytesUp = Math.max(0, toNumber(bytesUp));
  const normalizedBytesDown = Math.max(0, toNumber(bytesDown));
  const normalizedTotalBytes = Math.max(
    0,
    totalBytes === undefined
      ? normalizedBytesUp + normalizedBytesDown
      : toNumber(totalBytes),
  );

  db.query(
    `INSERT INTO user_traffic_daily (
      user_id,
      date,
      bytes_up,
      bytes_down,
      total_bytes,
      event_count,
      last_seen_at,
      updated_at
    ) VALUES (?1, ?2, ?3, ?4, ?5, 1, ?6, datetime('now'))
    ON CONFLICT(user_id, date)
    DO UPDATE SET
      bytes_up = bytes_up + excluded.bytes_up,
      bytes_down = bytes_down + excluded.bytes_down,
      total_bytes = total_bytes + excluded.total_bytes,
      event_count = event_count + 1,
      last_seen_at = CASE
        WHEN user_traffic_daily.last_seen_at IS NULL THEN excluded.last_seen_at
        WHEN excluded.last_seen_at > user_traffic_daily.last_seen_at THEN excluded.last_seen_at
        ELSE user_traffic_daily.last_seen_at
      END,
      updated_at = datetime('now')`,
  ).run(
    userId,
    toSqlDate(occurredAt),
    normalizedBytesUp,
    normalizedBytesDown,
    normalizedTotalBytes,
    toSqlTimestamp(occurredAt),
  );
}

function resolveUserId(record: TrafficReportRecord, nodeType: string) {
  if (record.userId) {
    return record.userId;
  }

  const secret = record.auth ?? record.secret;
  if (!secret) {
    return null;
  }

  const user = getUserByUserSecrets(secret, nodeType);
  return user?.id ?? null;
}

function ingestTrafficReport({
  reportId,
  nodeId,
  occurredAt,
  records,
}: IngestTrafficReportInput) {
  if (!reportId || !nodeId) {
    throw new Error("INVALID_TRAFFIC_REPORT");
  }

  const node = getNode(nodeId);
  if (!node) {
    throw new Error("NODE_NOT_FOUND");
  }

  const reportDate = resolveOccurredAt(occurredAt);
  const transaction = db.transaction(() => {
    const inserted = db.query(
      `INSERT OR IGNORE INTO traffic_reports (report_id, node_id, occurred_at)
       VALUES (?1, ?2, ?3)`,
    ).run(reportId, nodeId, toSqlTimestamp(reportDate));

    if (inserted.changes === 0) {
      return { duplicate: true, processed: 0 };
    }

    let processed = 0;
    for (const record of records) {
      const userId = resolveUserId(record, node.type);
      if (!userId || !getUser(userId)) {
        continue;
      }

      recordUserTraffic({
        userId,
        bytesUp: record.bytesUp,
        bytesDown: record.bytesDown,
        totalBytes: record.totalBytes ?? record.bytes,
        occurredAt: reportDate,
      });
      processed += 1;
    }

    return { duplicate: false, processed };
  });

  return transaction();
}

function mapTrafficPoint(row: Record<string, unknown>): UserTrafficPoint {
  return {
    date: String(row.date),
    bytesUp: toNumber(row.bytesUp),
    bytesDown: toNumber(row.bytesDown),
    totalBytes: toNumber(row.totalBytes),
    usageBytes: toNumber(row.totalBytes),
    bytes: toNumber(row.totalBytes),
    eventCount: toNumber(row.eventCount),
    requestCount: toNumber(row.eventCount),
    visits: toNumber(row.eventCount),
  };
}

function getUsersTraffic(): TrafficOverview {
  const metricOverview = getMetricOverview();
  const userMetricRows = db.query(
    `SELECT
      user_id AS userId,
      COALESCE(SUM(CASE WHEN metric = 'subscription_visit' THEN count END), 0) AS subscriptionVisits,
      COALESCE(SUM(CASE WHEN metric = 'api_request' THEN count END), 0) AS apiRequests,
      COALESCE(SUM(CASE WHEN metric = 'node_auth_success' THEN count END), 0) AS nodeAuthSuccessCount,
      COALESCE(SUM(CASE WHEN metric = 'node_auth_failure' THEN count END), 0) AS nodeAuthFailureCount,
      MAX(last_access_at) AS lastAccessAt
    FROM traffic_stats
    WHERE user_id != ''
    GROUP BY user_id`,
  ).all() as Record<string, unknown>[];
  const userMetrics = new Map(
    userMetricRows.map((row) => [String(row.userId), row] as const),
  );

  const userRows = db.query(
    `SELECT
      u.id AS userId,
      u.id AS id,
      u.name AS name,
      u.status AS status,
      COUNT(DISTINCT un.node_id) AS assignedNodeCount,
      COALESCE(SUM(utd.bytes_up), 0) AS bytesUp,
      COALESCE(SUM(utd.bytes_down), 0) AS bytesDown,
      COALESCE(SUM(utd.total_bytes), 0) AS totalBytes,
      COALESCE(SUM(utd.event_count), 0) AS eventCount,
      MAX(utd.last_seen_at) AS lastSeenAt,
      COALESCE(MAX(CASE WHEN utd.date = date('now') THEN utd.bytes_up END), 0) AS todayBytesUp,
      COALESCE(MAX(CASE WHEN utd.date = date('now') THEN utd.bytes_down END), 0) AS todayBytesDown,
      COALESCE(MAX(CASE WHEN utd.date = date('now') THEN utd.total_bytes END), 0) AS todayTotalBytes,
      COALESCE(MAX(CASE WHEN utd.date = date('now') THEN utd.event_count END), 0) AS todayEventCount
    FROM users u
    LEFT JOIN user_nodes un ON un.user_id = u.id
    LEFT JOIN user_traffic_daily utd ON utd.user_id = u.id
    GROUP BY u.id, u.name, u.status
    ORDER BY totalBytes DESC, u.name ASC`,
  ).all() as Record<string, unknown>[];

  const users: UserTrafficSummary[] = userRows.map((row) => {
    const metricRow = userMetrics.get(String(row.userId));
    return {
      userId: String(row.userId),
      id: String(row.id),
      name: String(row.name),
      status: toNumber(row.status) === 1 ? 1 : 0,
      assignedNodeCount: toNumber(row.assignedNodeCount),
      bytesUp: toNumber(row.bytesUp),
      bytesDown: toNumber(row.bytesDown),
      totalBytes: toNumber(row.totalBytes),
      usageBytes: toNumber(row.totalBytes),
      bytes: toNumber(row.totalBytes),
      eventCount: toNumber(row.eventCount),
      requestCount:
        toNumber(metricRow?.apiRequests) +
        toNumber(metricRow?.nodeAuthSuccessCount) +
        toNumber(metricRow?.nodeAuthFailureCount),
      visits: toNumber(metricRow?.subscriptionVisits),
      subscriptionVisits: toNumber(metricRow?.subscriptionVisits),
      apiRequests: toNumber(metricRow?.apiRequests),
      nodeAuthSuccessCount: toNumber(metricRow?.nodeAuthSuccessCount),
      nodeAuthFailureCount: toNumber(metricRow?.nodeAuthFailureCount),
      lastSeenAt: row.lastSeenAt ? String(row.lastSeenAt) : null,
      lastAccessAt: metricRow?.lastAccessAt
        ? String(metricRow.lastAccessAt)
        : row.lastSeenAt
          ? String(row.lastSeenAt)
          : null,
      today: {
        date: toSqlDate(),
        bytesUp: toNumber(row.todayBytesUp),
        bytesDown: toNumber(row.todayBytesDown),
        totalBytes: toNumber(row.todayTotalBytes),
        usageBytes: toNumber(row.todayTotalBytes),
        bytes: toNumber(row.todayTotalBytes),
        eventCount: toNumber(row.todayEventCount),
        requestCount: toNumber(row.todayEventCount),
        visits: toNumber(metricRow?.subscriptionVisits),
      },
    };
  });

  return {
    users,
    userTraffic: users,
    totalUsers: users.length,
    reportingUsers: users.filter((user) => (user.totalBytes ?? 0) > 0).length,
    activeUsers: Math.max(
      users.filter((user) => user.status === 1).length,
      metricOverview.metricActiveUsers,
    ),
    activeNodes: metricOverview.metricActiveNodes,
    bytesUp: users.reduce((sum, user) => sum + (user.bytesUp ?? 0), 0),
    bytesDown: users.reduce((sum, user) => sum + (user.bytesDown ?? 0), 0),
    totalBytes: users.reduce((sum, user) => sum + (user.totalBytes ?? 0), 0),
    usageBytes: users.reduce((sum, user) => sum + (user.totalBytes ?? 0), 0),
    bytes: users.reduce((sum, user) => sum + (user.totalBytes ?? 0), 0),
    eventCount: metricOverview.eventCount,
    requestCount: metricOverview.requestCount,
    visits: metricOverview.visits,
    subscriptionVisits: metricOverview.subscriptionVisits,
    apiRequests: metricOverview.apiRequests,
    nodeAuthSuccessCount: metricOverview.nodeAuthSuccessCount,
    nodeAuthFailureCount: metricOverview.nodeAuthFailureCount,
    lastSeenAt:
      users.find((user) => user.lastSeenAt)?.lastSeenAt ??
      [...users]
        .map((user) => user.lastSeenAt)
        .filter((value): value is string => Boolean(value))
        .sort()
        .at(-1) ??
      null,
    lastAccessAt:
      metricOverview.lastAccessAt ??
      [...users]
        .map((user) => user.lastAccessAt)
        .filter((value): value is string => Boolean(value))
        .sort()
        .at(-1) ??
      null,
  };
}

function getDashboardTraffic(): TrafficOverview {
  const overview = getUsersTraffic();
  const nodeRows = db.query(
    `SELECT
      n.id AS nodeId,
      n.id AS id,
      n.name AS name,
      COALESCE(SUM(CASE WHEN ts.metric = 'subscription_visit' THEN ts.count END), 0) AS subscriptionVisits,
      COALESCE(SUM(CASE WHEN ts.metric = 'api_request' THEN ts.count END), 0) AS apiRequests,
      COALESCE(SUM(CASE WHEN ts.metric = 'node_auth_success' THEN ts.count END), 0) AS nodeAuthSuccessCount,
      COALESCE(SUM(CASE WHEN ts.metric = 'node_auth_failure' THEN ts.count END), 0) AS nodeAuthFailureCount
    FROM nodes n
    LEFT JOIN traffic_stats ts ON ts.node_id = n.id
    GROUP BY n.id, n.name
    ORDER BY n.name ASC`,
  ).all() as Record<string, unknown>[];
  const nodes = nodeRows.map((row) => ({
    nodeId: String(row.nodeId),
    id: String(row.id),
    name: String(row.name),
    requestCount:
      toNumber(row.apiRequests) +
      toNumber(row.nodeAuthSuccessCount) +
      toNumber(row.nodeAuthFailureCount),
    visits: toNumber(row.subscriptionVisits),
    subscriptionVisits: toNumber(row.subscriptionVisits),
    apiRequests: toNumber(row.apiRequests),
    nodeAuthSuccessCount: toNumber(row.nodeAuthSuccessCount),
    nodeAuthFailureCount: toNumber(row.nodeAuthFailureCount),
  }));
  const dailyRows = db.query(
    `SELECT
      date,
      COALESCE(SUM(bytes_up), 0) AS bytesUp,
      COALESCE(SUM(bytes_down), 0) AS bytesDown,
      COALESCE(SUM(total_bytes), 0) AS totalBytes,
      COALESCE(SUM(event_count), 0) AS eventCount
    FROM user_traffic_daily
    GROUP BY date
    ORDER BY date ASC`,
  ).all() as Record<string, unknown>[];

  const dailyTraffic = dailyRows.map(mapTrafficPoint);
  const topUsers = [...(overview.users ?? [])]
    .sort((a, b) => (b.totalBytes ?? 0) - (a.totalBytes ?? 0))
    .slice(0, 5);
  const topNodes = [...nodes]
    .sort((a, b) => (b.requestCount ?? 0) - (a.requestCount ?? 0))
    .slice(0, 5);

  return {
    ...overview,
    nodes,
    topUsers,
    topNodes,
    timeSeries: dailyTraffic,
    timeseries: dailyTraffic,
    dailyTraffic,
  };
}

export {
  getDashboardTraffic,
  getUsersTraffic,
  ingestTrafficReport,
  recordTrafficMetric,
  recordUserTraffic,
};
