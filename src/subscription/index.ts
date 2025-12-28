import { type NodeType, type Node, type UserSecrets, type User } from "@/types";
import { Hysteria2Authenticator, Hysteria2NodeConfigger } from "./hysteria2";
import { VlessNodeConfigger } from "./vless";
import { ClashConfigger } from "./clash";
import { KaringConfigger } from "./karing";

const CONFIG_TYPES = ["clash", "karing"] as const;
type ConfigType = (typeof CONFIG_TYPES)[number];

interface Authenticator<P = any, R = any> {
  type: NodeType;
  auth(params: P): Promise<R>;
}

interface Configger {
  type: ConfigType;
  nodes: Node[];
  secrets: UserSecrets;
  headers(user: User): Record<string, string>;
  toYAML(): Promise<string>;
}

interface NodeConfigger {
  type: NodeType;
  create(
    node: Node,
    secrets: UserSecrets,
    configType: ConfigType,
  ): Promise<any>;
}

function buildAuthenticator(type: NodeType): Authenticator<any, any> {
  if (type === "hysteria2") {
    return new Hysteria2Authenticator();
  }
  throw new Error(`Unsupported authenticator type: ${type}`);
}

function buildConfigger(
  type: ConfigType,
  nodes: Node[],
  secrets: UserSecrets,
): Configger {
  if (type === "clash") {
    return new ClashConfigger(nodes, secrets);
  }
  if (type === "karing") {
    return new KaringConfigger(nodes, secrets);
  }
  throw new Error(`Unsupported config type: ${type}`);
}

function buildNodeConfigger(type: NodeType): NodeConfigger {
  if (type === "hysteria2") {
    return new Hysteria2NodeConfigger();
  }
  if (type === "vless") {
    return new VlessNodeConfigger();
  }
  throw new Error(`Unsupported node config type: ${type}`);
}

export {
  CONFIG_TYPES,
  type ConfigType,
  type Authenticator,
  type Configger,
  type NodeConfigger,
  buildAuthenticator,
  buildConfigger,
  buildNodeConfigger,
};
