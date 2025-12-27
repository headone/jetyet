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
}

export interface UserWithSecrets extends User {
  userSecrets: UserSecrets[];
}

export const NODE_TYPES = ["hysteria2"] as const;

export type NodeType = (typeof NODE_TYPES)[number];

export interface Node {
  id: string;
  name: string;
  host: string;
  port: string;
  type: NodeType;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserNode {
  userId: string;
  nodeId: string;
}

export type UserWithNodes = User & {
  userNodes: UserNode[];
};
