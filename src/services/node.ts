import { db } from "@/db";
import type { Node } from "@/types";
import type { AppRequest } from "./index";

function getAllNodes(): Node[] {
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

  return nodes;
}

function deleteNode(id: string): void {
  if (!id) {
    throw new Error("Missing node ID");
  }

  const query = db.query("DELETE FROM nodes WHERE id = ?1");
  query.run(id);
}

function createNode(
  name: string,
  host: string,
  port: string,
  type: string,
): void {
  const query = db.query(
    "INSERT INTO nodes (name, host, port, type, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, datetime('now', 'localtime'), datetime('now', 'localtime'))",
  );
  query.run(name, host, port, type);
}

function assignNode(userId: string, nodeId: string, assign: boolean): void {
  if (!userId || !nodeId) {
    throw new Error("Missing user ID, node ID, or assign value");
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
}

export { getAllNodes, deleteNode, createNode, assignNode };
