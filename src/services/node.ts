import { db } from "@/db";
import type { Node, NodeAdvancedSchema, NodeType } from "@/types";

function getAllNodes(): Node[] {
  const query = db.query(
    "SELECT id, name, host, port, type, advanced, created_at, updated_at FROM nodes",
  );
  const nodesRaw = query.all() as any[];

  const nodes: Node[] = nodesRaw.map((node) => ({
    id: node.id,
    name: node.name,
    host: node.host,
    port: node.port,
    type: node.type,
    advanced: JSON.parse(node.advanced),
    createdAt: new Date(node.created_at),
    updatedAt: new Date(node.updated_at),
  }));

  return nodes;
}

function getNode(id: string): Node | null {
  const query = db.query(
    "SELECT id, name, host, port, type, advanced, created_at, updated_at FROM nodes WHERE id = ?1",
  );
  const nodeRaw = query.get(id) as any;

  if (!nodeRaw) {
    return null;
  }

  const node: Node = {
    id: nodeRaw.id,
    name: nodeRaw.name,
    host: nodeRaw.host,
    port: nodeRaw.port,
    type: nodeRaw.type,
    advanced: JSON.parse(nodeRaw.advanced),
    createdAt: new Date(nodeRaw.created_at),
    updatedAt: new Date(nodeRaw.updated_at),
  };

  return node;
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
  type: NodeType,
  advanced: NodeAdvancedSchema[NodeType],
): void {
  const query = db.query(
    "INSERT INTO nodes (name, host, port, type, advanced, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, datetime('now', 'localtime'), datetime('now', 'localtime'))",
  );
  query.run(name, host, port, type as string, JSON.stringify(advanced));
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

function getAllNodesByUserId(userId: string): Node[] {
  const query = db.query(
    "SELECT n.id, n.name, n.host, n.port, n.type, n.advanced, n.created_at, n.updated_at FROM nodes AS n JOIN user_nodes AS un ON n.id = un.node_id WHERE un.user_id = ?",
  );
  const nodesRaw = query.all(userId) as any[];

  const nodes: Node[] = nodesRaw.map((node) => ({
    id: node.id,
    name: node.name,
    host: node.host,
    port: node.port,
    type: node.type,
    advanced: JSON.parse(node.advanced),
    createdAt: new Date(node.created_at),
    updatedAt: new Date(node.updated_at),
  }));

  return nodes;
}

export {
  getAllNodes,
  getNode,
  deleteNode,
  createNode,
  assignNode,
  getAllNodesByUserId,
};
