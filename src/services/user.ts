import { randomUUIDv7 } from "bun";
import { db } from "@/db";
import { type User, type UserNode, NODE_TYPES, type NodeType } from "@/types";

function getAllUsers(isAuthenticated: boolean): Response {
  if (!isAuthenticated) {
    return new Response(null, { status: 401 });
  }

  const usersQuery = db.query(
    "SELECT id, name, status, created_at, updated_at FROM users",
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

  return Response.json(users);
}

async function createUser(
  request: Request,
  isAuthenticated: boolean,
): Promise<Response> {
  if (!isAuthenticated) {
    return new Response(null, { status: 401 });
  }

  const { name } = await request.json();

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

  return new Response(null, { status: 201 });
}

async function deleteUser(
  request: Request,
  isAuthenticated: boolean,
): Promise<Response> {
  if (!isAuthenticated) {
    return new Response(null, { status: 401 });
  }

  const { id } = await request.json();

  const userQuery = db.query("DELETE FROM users WHERE id = ?");
  userQuery.run(id);

  return new Response(null, { status: 204 });
}

async function getUser(id: string): Promise<User | null> {
  const userQuery = db.query("SELECT * FROM users WHERE id = ?");
  const user = userQuery.get(id) as User | null;
  return user;
}

async function getUserByUserSecrets(
  secrets: string,
  type: string | NodeType,
): Promise<User | null> {
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

  const userQuery = db.query("SELECT * FROM users WHERE id = ?");
  const user = userQuery.get(userId.user_id) as User | null;

  return user;
}

export { getAllUsers, createUser, deleteUser, getUser, getUserByUserSecrets };
