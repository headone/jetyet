import { type NodeType, type Node, type UserSecrets, type User } from "@/types";
import { Hysteria2Authenticator, hysteria2NodeConfigger } from "./hysteria2";
import { VlessAuthenticator, vlessNodeConfigger } from "./vless";
import { ClashConfigger } from "./clash";
import { KaringConfigger } from "./karing";
import { ShadowrocketConfigger } from "./shadowrocket";

const CONFIG_TYPES = ["clash", "karing", "shadowrocket"] as const;
type ConfigType = (typeof CONFIG_TYPES)[number];

interface Authenticator<P = any, R = any> {
  type: NodeType;
  auth(params: P): Promise<R>;
  assign(node: Node, secrets: UserSecrets): Promise<void>;
  deassign(node: Node, secrets: UserSecrets): Promise<void>;
}

interface Configger {
  type: ConfigType;
  user: User;
  nodes: Node[];
  secrets: UserSecrets;
  headers(): Record<string, string>;
  stringifySubscription(): Promise<string>;
}

interface NodeConfigger {
  type: NodeType;
  toModel(node: Node, secrets: UserSecrets, configType: ConfigType): any;
  toURI(node: Node, secrets: UserSecrets, configType: ConfigType): string;
}

function buildAuthenticator(type: NodeType): Authenticator<any, any> {
  if (type === "hysteria2") {
    return new Hysteria2Authenticator();
  }
  if (type === "vless") {
    return new VlessAuthenticator();
  }
  throw new Error(`Unsupported authenticator type: ${type}`);
}

function buildConfigger(
  type: ConfigType,
  user: User,
  nodes: Node[],
  secrets: UserSecrets,
): Configger {
  if (type === "clash") {
    return new ClashConfigger(user, nodes, secrets);
  }
  if (type === "karing") {
    return new KaringConfigger(user, nodes, secrets);
  }
  if (type === "shadowrocket") {
    return new ShadowrocketConfigger(user, nodes, secrets);
  }
  throw new Error(`Unsupported config type: ${type}`);
}

function buildNodeConfigger(type: NodeType): NodeConfigger {
  if (type === "hysteria2") {
    return hysteria2NodeConfigger;
  }
  if (type === "vless") {
    return vlessNodeConfigger;
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
