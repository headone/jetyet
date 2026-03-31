import { randomUUIDv7 } from "bun";
import { db } from "@/db";
import {
  type User,
  type UserWithNodes,
  type UserNode,
  NODE_TYPES,
  type NodeType,
  type UserSecrets,
  type Node,
} from "@/types";
import { getAllNodesByUserId } from "@/services/node";

type UserRow = {
  id: string;
  name: string;
  sub_key: string;
  status: 0 | 1;
  monthly_limit_bytes: number | null;
  created_at: string;
  updated_at: string;
};

function mapUserRow(row: UserRow): User {
  return {
    id: row.id,
    name: row.name,
    subKey: row.sub_key,
    status: row.status,
    monthlyLimitBytes: row.monthly_limit_bytes,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

function getAllUsers(): UserWithNodes[] {
  const usersQuery = db.query(
    "SELECT id, name, sub_key, status, monthly_limit_bytes, created_at, updated_at FROM users",
  );
  const usersRaw = usersQuery.all() as UserRow[];

  const userNodesQuery = db.query("SELECT user_id, node_id FROM user_nodes");
  const userNodesRaw = userNodesQuery.all() as any[];

  const userNodesMap = new Map<string, UserNode[]>();
  for (const userNode of userNodesRaw) {
    const nodes = userNodesMap.get(userNode.user_id) || [];
    nodes.push({
      userId: userNode.user_id,
      nodeId: userNode.node_id,
    });
    userNodesMap.set(userNode.user_id, nodes);
  }

  const users = usersRaw.map((user) => ({
    ...mapUserRow(user),
    userNodes: userNodesMap.get(user.id) || [],
  }));

  return users;
}

function createUser(name: string): void {
  if (!name) {
    throw new Error("Missing user name");
  }

  const transaction = db.transaction((name) => {
    const userQuery = db.query(
      "INSERT INTO users (name, sub_key, status, monthly_limit_bytes, created_at, updated_at) VALUES (?, ?, 1, NULL, datetime('now', 'localtime'), datetime('now', 'localtime'))",
    );
    userQuery.run(name, randomUUIDv7());

    const userSelectQuery = db.query("SELECT id FROM users WHERE name = ?");
    const user = userSelectQuery.get(name) as { id: string };

    const userNodesQuery = db.query(
      "INSERT INTO user_secrets (user_id, hysteria2, vless) VALUES (?, ?, ?)",
    );
    userNodesQuery.run(user.id, randomUUIDv7(), randomUUIDv7());
  });
  transaction(name);
}

function deleteUser(id: string): void {
  if (!id) {
    throw new Error("Missing user ID");
  }

  const userQuery = db.query("DELETE FROM users WHERE id = ?");
  userQuery.run(id);
}

function getUser(id: string): User | null {
  const userQuery = db.query(
    "SELECT id, name, sub_key, status, monthly_limit_bytes, created_at, updated_at FROM users WHERE id = ?",
  );
  const userRow = userQuery.get(id) as UserRow | null;
  return userRow ? mapUserRow(userRow) : null;
}

function getUserByUserSecrets(
  secrets: string,
  type: string | NodeType,
): User | null {
  // check type
  if (!NODE_TYPES.find((nodeType) => nodeType === type)) {
    throw new Error(`Unsupported authenticator type: ${type}`);
  }

  const userIdQuery = db.query(
    `SELECT user_id FROM user_secrets WHERE ${type} = ?`,
  );
  const userId = userIdQuery.get(secrets) as { user_id: string };

  if (!userId) {
    return null;
  }

  const userQuery = db.query(
    "SELECT id, name, sub_key, status, monthly_limit_bytes, created_at, updated_at FROM users WHERE id = ?",
  );
  const userRow = userQuery.get(userId.user_id) as UserRow | null;
  return userRow ? mapUserRow(userRow) : null;
}

function getUserInfoBySubKey(
  subKey: string,
): (User & { nodes: Node[]; secrets: UserSecrets }) | null {
  const userQuery = db.query(
    "SELECT id, name, sub_key, status, monthly_limit_bytes, created_at, updated_at FROM users WHERE sub_key = ?",
  );
  const userRow = userQuery.get(subKey) as UserRow | null;

  if (!userRow) {
    return null;
  }
  const user = mapUserRow(userRow);

  const nodes = getAllNodesByUserId(user.id);

  const secretsQuery = db.query(
    "SELECT user_id, hysteria2, vless FROM user_secrets WHERE user_id = ?",
  );
  const secrets = secretsQuery.get(user.id) as UserSecrets;

  return { ...user, nodes, secrets };
}

function getUserSecrets(userId: string): UserSecrets | null {
  const secretsQuery = db.query(
    "SELECT user_id, hysteria2, vless FROM user_secrets WHERE user_id = ?",
  );
  const secrets = secretsQuery.get(userId) as UserSecrets | null;

  return secrets;
}

function updateUserSubKey(userId: string, customSubKey?: string): string {
  if (!userId) {
    throw new Error("Missing user ID");
  }

  // 如果提供了自定义subKey，使用它；否则自动生成
  const newSubKey = customSubKey && customSubKey.trim() !== ""
    ? customSubKey.trim()
    : randomUUIDv7();

  // 检查subKey是否已被其他用户使用
  const checkQuery = db.query(
    "SELECT id FROM users WHERE sub_key = ? AND id != ?",
  );
  const existingUser = checkQuery.get(newSubKey, userId);

  if (existingUser) {
    throw new Error("DUPLICATE_SUBKEY");
  }

  const query = db.query(
    "UPDATE users SET sub_key = ?, updated_at = datetime('now', 'localtime') WHERE id = ?",
  );
  query.run(newSubKey, userId);

  return newSubKey;
}

function updateUserMonthlyLimit(
  userId: string,
  monthlyLimitBytes: number | null,
): number | null {
  if (!userId) {
    throw new Error("Missing user ID");
  }

  const normalizedLimit = monthlyLimitBytes == null
    ? null
    : Math.max(0, Math.floor(monthlyLimitBytes));

  db.query(
    "UPDATE users SET monthly_limit_bytes = ?1, updated_at = datetime('now', 'localtime') WHERE id = ?2",
  ).run(normalizedLimit, userId);

  return normalizedLimit;
}

export {
  getAllUsers,
  createUser,
  deleteUser,
  getUser,
  getUserByUserSecrets,
  getUserInfoBySubKey,
  getUserSecrets,
  updateUserSubKey,
  updateUserMonthlyLimit,
};
