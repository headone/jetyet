import { randomUUIDv7 } from "bun";
import { db } from "@/db";
import {
  type User,
  type UserNode,
  NODE_TYPES,
  type NodeType,
  type UserSecrets,
  type Node,
} from "@/types";

function getAllUsers(): (User & { userNodes: UserNode[] })[] {
  const usersQuery = db.query(
    "SELECT id, name, sub_key, status, created_at, updated_at FROM users",
  );
  const usersRaw = usersQuery.all() as any[];

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
    id: user.id,
    name: user.name,
    subKey: user.sub_key,
    status: user.status,
    createdAt: new Date(user.created_at),
    updatedAt: new Date(user.updated_at),
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
      "INSERT INTO users (name, sub_key, status, created_at, updated_at) VALUES (?, ?, 1, datetime('now', 'localtime'), datetime('now', 'localtime'))",
    );
    userQuery.run(name, randomUUIDv7());

    const userSelectQuery = db.query("SELECT id FROM users WHERE name = ?");
    const user = userSelectQuery.get(name) as { id: string };

    const userNodesQuery = db.query(
      "INSERT INTO user_secrets (user_id, hysteria2) VALUES (?, ?)",
    );
    userNodesQuery.run(user.id, randomUUIDv7());
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
    "SELECT id, name, sub_key, status, created_at, updated_at FROM users WHERE id = ?",
  );
  const user = userQuery.get(id) as User | null;
  return user;
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
    "SELECT id, name, sub_key, status, created_at, updated_at FROM users WHERE id = ?",
  );
  const user = userQuery.get(userId.user_id) as User | null;

  return user;
}

function getUserInfoBySubKey(
  subKey: string,
): (User & { nodes: Node[]; secrets: UserSecrets }) | null {
  const userQuery = db.query(
    "SELECT id, name, sub_key, status, created_at, updated_at FROM users WHERE sub_key = ?",
  );
  const user = userQuery.get(subKey) as User | null;

  if (!user) {
    return null;
  }

  const nodesQuery = db.query(
    "SELECT n.id, n.name, n.host, n.port, n.type, n.created_at, n.updated_at FROM nodes AS n JOIN user_nodes AS un ON n.id = un.node_id WHERE un.user_id = ?",
  );
  const nodes = nodesQuery.all(user.id) as Node[];

  const secretsQuery = db.query(
    "SELECT user_id, hysteria2 FROM user_secrets WHERE user_id = ?",
  );
  const secrets = secretsQuery.get(user.id) as UserSecrets;

  return { ...user, nodes, secrets };
}

export {
  getAllUsers,
  createUser,
  deleteUser,
  getUser,
  getUserByUserSecrets,
  getUserInfoBySubKey,
};
