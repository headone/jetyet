import { db } from "@/db";
import { getAllUsers, getUserSecrets } from "./user";
import { getAllNodesByUserId } from "./node";
import { buildAuthenticator } from "@/subscription";
import {
  getUserTrafficLimitStatus,
  syncVlessTrafficUsage,
} from "./traffic";

type RuntimeBlockRow = {
  blocked: number;
};

type EnforceError = {
  userId: string;
  nodeId: string;
  action: "assign" | "deassign";
  message: string;
};

type EnforceResult = {
  assigned: number;
  deassigned: number;
  errors: EnforceError[];
};

function isRuntimeBlocked(userId: string, nodeId: string): boolean {
  const row = db
    .query(
      `
        SELECT blocked
        FROM traffic_runtime_blocks
        WHERE user_id = ?1 AND node_id = ?2
      `,
    )
    .get(userId, nodeId) as RuntimeBlockRow | null;
  return !!row && row.blocked === 1;
}

function setRuntimeBlocked(userId: string, nodeId: string, blocked: boolean): void {
  db.query(
    `
      INSERT INTO traffic_runtime_blocks (
        user_id,
        node_id,
        blocked,
        reason,
        updated_at
      ) VALUES (?1, ?2, ?3, 'traffic_limit', datetime('now', 'localtime'))
      ON CONFLICT(user_id, node_id) DO UPDATE SET
        blocked = excluded.blocked,
        reason = excluded.reason,
        updated_at = datetime('now', 'localtime')
    `,
  ).run(userId, nodeId, blocked ? 1 : 0);
}

export async function reconcileTrafficLimitAssignments(): Promise<EnforceResult> {
  const users = getAllUsers();
  const errors: EnforceError[] = [];
  let assigned = 0;
  let deassigned = 0;

  for (const user of users) {
    const secrets = getUserSecrets(user.id);
    if (!secrets) continue;

    const status = getUserTrafficLimitStatus(user.id);
    if (!status) continue;

    const shouldBlock = status.overLimit;
    const nodes = getAllNodesByUserId(user.id);

    for (const node of nodes) {
      const blocked = isRuntimeBlocked(user.id, node.id);

      if (shouldBlock && !blocked) {
        try {
          await buildAuthenticator(node.type).deassign(node, secrets);
          setRuntimeBlocked(user.id, node.id, true);
          deassigned += 1;
        } catch (error) {
          errors.push({
            userId: user.id,
            nodeId: node.id,
            action: "deassign",
            message: error instanceof Error ? error.message : String(error),
          });
        }
        continue;
      }

      if (!shouldBlock && blocked) {
        try {
          await buildAuthenticator(node.type).assign(node, secrets);
          setRuntimeBlocked(user.id, node.id, false);
          assigned += 1;
        } catch (error) {
          errors.push({
            userId: user.id,
            nodeId: node.id,
            action: "assign",
            message: error instanceof Error ? error.message : String(error),
          });
        }
      }
    }
  }

  return { assigned, deassigned, errors };
}

export async function syncTrafficAndEnforceLimits(): Promise<{
  monthKey: string;
  scannedNodes: number;
  processedUsers: number;
  deltaUplinkBytes: number;
  deltaDownlinkBytes: number;
  syncErrors: { nodeId: string; message: string }[];
  enforcement: EnforceResult;
}> {
  const syncResult = await syncVlessTrafficUsage();
  const enforcement = await reconcileTrafficLimitAssignments();

  return {
    monthKey: syncResult.monthKey,
    scannedNodes: syncResult.scannedNodes,
    processedUsers: syncResult.processedUsers,
    deltaUplinkBytes: syncResult.deltaUplinkBytes,
    deltaDownlinkBytes: syncResult.deltaDownlinkBytes,
    syncErrors: syncResult.errors,
    enforcement,
  };
}
