export interface AdminConfig {
  username: string;
  password: string;
}

export interface User {
  id: string;
  name: string;
  subKey: string;
  status: 0 | 1; // 0: inactive, 1: active
  createdAt: Date;
  updatedAt: Date;
}

// 用户节点密码
export interface UserSecrets {
  userId: string;
  // hysteria 2
  hysteria2: string;
  // vless
  vless: string;
}

export interface UserWithSecrets extends User {
  userSecrets: UserSecrets[];
}

export const NODE_TYPES = ["hysteria2", "vless"] as const;
export type NodeType = (typeof NODE_TYPES)[number];

export interface Node {
  id: string;
  name: string;
  host: string;
  port: string;
  type: NodeType;
  advanced: NodeAdvancedSchema[NodeType];
  createdAt: Date;
  updatedAt: Date;
}

export const VLESS_FLOW_TYPES = ["xtls-rprx-vision"] as const;
export type VlessFlowType = (typeof VLESS_FLOW_TYPES)[number];

export const CLIENT_FINGERPRINT_TYPES = [
  "chrome",
  "firefox",
  "edge",
  "safari",
] as const;
export type ClientFingerprintType = (typeof CLIENT_FINGERPRINT_TYPES)[number];

export type NodeAdvancedSchema = {
  hysteria2: {};
  vless: {
    tls: boolean;
    udp: boolean;
    flow: VlessFlowType;
    servername: string;
    "reality-opts": {
      "public-key": string;
      "short-id": string | undefined;
    };
    "client-fingerprint": ClientFingerprintType;
  };
};

export interface UserNode {
  userId: string;
  nodeId: string;
}

export type UserWithNodes = User & {
  userNodes: UserNode[];
};
