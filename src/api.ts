import type {
  UserNode,
  Node,
  NodeType,
  NodeAdvancedSchema,
  UserWithNodes,
  UserMonthlyTraffic,
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
  "/api/users/traffic": {
    GET: {
      response: UserMonthlyTraffic[];
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
  "/api/users/:id/subKey": {
    PUT: {
      params: { id: string };
      body: { subKey?: string };
      response: { subKey: string };
    };
  };
  "/api/users/:id/traffic-limit": {
    PUT: {
      params: { id: string };
      body: { monthlyLimitGB: number | null };
      response: { monthlyLimitBytes: number | null };
    };
  };
  "/api/users/:id/traffic/reset": {
    POST: {
      params: { id: string };
    };
  };
  "/api/traffic/sync": {
    POST: {
      response: {
        monthKey: string;
        scannedNodes: number;
        processedUsers: number;
        deltaUplinkBytes: number;
        deltaDownlinkBytes: number;
        syncErrors: { nodeId: string; message: string }[];
        syncDebug: {
          nodeId: string;
          statsUsers: number;
          inboundUsers: number;
          fallbackStatsUsers: number;
          matchedUsers: number;
          unmatchedUsernames: string[];
        }[];
        enforcement: {
          assigned: number;
          deassigned: number;
          errors: {
            userId: string;
            nodeId: string;
            action: "assign" | "deassign";
            message: string;
          }[];
        };
      };
    };
  };
  "/api/nodes/:id/vless-debug": {
    GET: {
      params: { id: string };
      response: {
        nodeId: string;
        host: string;
        inboundTag: string;
        inboundUsers: {
          username: string;
          protocol?: string;
          vlessId?: string;
        }[];
        perUserStats: {
          username: string;
          ok: boolean;
          uplink: number;
          downlink: number;
          message?: string;
        }[];
      };
    };
  };
  "/api/nodes/:id/vless-debug-tags": {
    GET: {
      params: { id: string };
      response: {
        nodeId: string;
        host: string;
        scannedTags: {
          tag: string;
          ok: boolean;
          userCount: number;
          users: {
            username: string;
            protocol?: string;
            vlessId?: string;
          }[];
          message?: string;
        }[];
      };
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
      body: {
        name: string;
        host: string;
        port: string;
        type: NodeType;
        advanced: NodeAdvancedSchema[NodeType];
      };
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
