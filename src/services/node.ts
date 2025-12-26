import { db } from "@/db";
import type { Node } from "@/types";

function getAllNodes(isAuthenticated: boolean): Response {
  if (!isAuthenticated) {
    return new Response(null, { status: 401 });
  }

  const query = db.query(
    "SELECT id, name, host, port, type, created_at, updated_at FROM nodes",
  );
  const nodesRaw = query.all() as any[];

  const nodes: Node[] = nodesRaw.map((node) => ({
    id: node.id,
    name: node.name,
    host: node.host,
    port: node.port,
    type: node.type,
    createdAt: new Date(node.created_at),
    updatedAt: new Date(node.updated_at),
  }));

  return Response.json(nodes);
}

async function deleteNode(
  request: Request,
  isAuthenticated: boolean,
): Promise<Response> {
  if (!isAuthenticated) {
    return new Response(null, { status: 401 });
  }

  const { id } = await request.json();

  if (!id) {
    return new Response("Missing node ID", { status: 400 });
  }

  const query = db.query("DELETE FROM nodes WHERE id = ?1");
  query.run(id);

  return new Response(null, { status: 204 });
}

async function createNode(
  request: Request,
  isAuthenticated: boolean,
): Promise<Response> {
  if (!isAuthenticated) {
    return new Response(null, { status: 401 });
  }

  const { name, host, port, type } = await request.json();

  const query = db.query(
    "INSERT INTO nodes (name, host, port, type, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, datetime('now', 'localtime'), datetime('now', 'localtime'))",
  );
  query.run(name, host, port, type);

  return new Response(null, { status: 201 });
}

async function assignNode(
  request: Request,
  isAuthenticated: boolean,
): Promise<Response> {
  if (!isAuthenticated) {
    return new Response(null, { status: 401 });
  }

  const {
    userId,
    nodeId,
    assign,
  }: { userId: string; nodeId: string; assign: boolean } = await request.json();

  if (!userId || !nodeId) {
    return new Response("Missing user ID, node ID, or assign value", {
      status: 400,
    });
  }

  let query;
  if (assign) {
    query = db.query(
      "INSERT INTO user_nodes (user_id, node_id) VALUES (?1, ?2)",
    );
  } else {
    query = db.query(
      "DELETE FROM user_nodes WHERE user_id = ?1 AND node_id = ?2",
    );
  }

  query.run(userId, nodeId);

  return new Response(null, { status: 201 });
}

export { getAllNodes, deleteNode, createNode, assignNode };
