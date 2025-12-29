import type {
  UserNode,
  Node,
  NodeType,
  NodeAdvancedSchema,
  UserWithNodes,
} from "@/types";

export type AppSchema = {
  // auth
  "/api/auth/login": {
    POST: {
      body: {
        username: string;
        password: string;
      };
      response: {
        token: string;
      };
    };
  };
  "/api/auth/logout": {
    POST: {};
  };
  // user
  "/api/users": {
    GET: {
      response: UserWithNodes[];
    };
    POST: {
      body: { name: string };
    };
  };
  "/api/users/:id": {
    GET: {
      params: { id: string };
      response: UserWithNodes;
    };
    PUT: {
      params: { id: string };
      body: { name: string };
    };
    DELETE: {
      params: { id: string };
    };
  };
  // nodes
  "/api/nodes": {
    GET: {
      response: Node[];
    };
    POST: {
      body: {
        name: string;
        host: string;
        port: string;
        type: NodeType;
        advanced: NodeAdvancedSchema[NodeType];
      };
    };
  };
  "/api/nodes/:id": {
    GET: {
      params: { id: string };
      response: Node;
    };
    PUT: {
      params: { id: string };
      body: { name: string; host: string; port: string; type: NodeType };
    };
    DELETE: {
      params: { id: string };
    };
  };
  /**
   * Assign or unassign a node to a user
   */
  "/api/nodes/assign": {
    POST: {
      body: { userId: string; nodeId: string; assign: boolean };
    };
  };
  /**
   * Reassign nodes to users in bulk
   */
  "/api/nodes/reassign": {
    POST: {
      body: {
        userId: string;
        nodeId: string;
      }[];
    };
  };
};
