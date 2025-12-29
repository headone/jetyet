import { type Authenticator, type ConfigType, type NodeConfigger } from ".";
import { type Node, type NodeType, type UserSecrets } from "@/types";
import { getUserByUserSecrets } from "@/services/user";

type Params = {
  addr: string;
  auth: string;
  tx: number;
};
type Result = { ok: boolean; id: string };

class Hysteria2Authenticator implements Authenticator<Params, Result> {
  type: NodeType = "hysteria2";

  async auth(params: Params): Promise<Result> {
    // simple auth
    const user = getUserByUserSecrets(params.auth, this.type);

    if (!user || user.status !== 1) {
      return { ok: false, id: "" };
    }

    return { ok: true, id: user.name };
  }

  async assign(node: Node, secrets: UserSecrets): Promise<void> {}

  async deassign(node: Node, secrets: UserSecrets): Promise<void> {}
}

type ClashConfig = {
  name: string;
  password: string;
  server: string;
  ports: string;
  "hop-interval": number;
  "skip-cert-verify": boolean;
  type: string;
  down: string;
  up: string;
};

type KaringConfig = {
  name: string;
  password: string;
  server: string;
  port: number;
  "hop-interval": number;
  "skip-cert-verify": boolean;
  type: string;
  down: string;
  up: string;
};

type ShadowrocketConfig = {
  remarks: string; // same as name
  password: string;
  server: string;
  port: number; // random range of mport
  mport: string; // same as ports
  insecure: 0 | 1; // same as skip-cert-verify
  downmbps: number; // same as down
  upmbps: number; // same as up
};

class Hysteria2NodeConfigger implements NodeConfigger {
  type: NodeType = "hysteria2";
  toModel(
    node: Node,
    secrets: UserSecrets,
    configType: ConfigType,
  ): ClashConfig | KaringConfig | ShadowrocketConfig {
    if (configType === "clash") {
      const config: ClashConfig = {
        name: node.name,
        password: secrets["hysteria2"],
        server: node.host,
        ports: node.port,
        "hop-interval": 10,
        "skip-cert-verify": true,
        type: "hysteria2",
        down: "1000",
        up: "1000",
      };
      return config;
    }

    if (configType === "karing") {
      // 解析端口范围并生成随机端口
      const portParts = node.port.split("-");
      const minPort = Number(portParts[0]);
      const maxPort = Number(portParts[1]);

      if (isNaN(minPort) || isNaN(maxPort)) {
        throw new Error(`Invalid port range: ${node.port}`);
      }

      const port =
        Math.floor(Math.random() * (maxPort - minPort + 1)) + minPort;

      const config: KaringConfig = {
        name: node.name,
        password: secrets["hysteria2"],
        server: node.host,
        port: port,
        "hop-interval": 10,
        "skip-cert-verify": true,
        type: "hysteria2",
        down: "1000",
        up: "1000",
      };
      return config;
    }

    if (configType === "shadowrocket") {
      // 解析端口范围并生成随机端口
      const portParts = node.port.split("-");
      const minPort = Number(portParts[0]);
      const maxPort = Number(portParts[1]);

      if (isNaN(minPort) || isNaN(maxPort)) {
        throw new Error(`Invalid port range: ${node.port}`);
      }

      const port =
        Math.floor(Math.random() * (maxPort - minPort + 1)) + minPort;

      const config: ShadowrocketConfig = {
        remarks: node.name,
        password: secrets["hysteria2"],
        server: node.host,
        port: port,
        mport: node.port,
        insecure: 1,
        downmbps: 1000,
        upmbps: 1000,
      };
      return config;
    }

    throw new Error(`Unsupported config type: ${configType}`);
  }

  toURI(node: Node, secrets: UserSecrets, configType: ConfigType): string {
    let config = this.toModel(node, secrets, configType);

    if (configType === "clash" || configType === "karing") {
      return "";
    }

    if (configType === "shadowrocket") {
      config = config as ShadowrocketConfig;

      return `${this.type}://${config.password}@${config.server}:${config.port}?mport=${config.mport}&downmbps=${config.downmbps}&upmbps=${config.upmbps}&insecure=${config.insecure}#${encodeURIComponent(config.remarks)}`;
    }

    throw new Error(`Unsupported config type: ${configType}`);
  }
}

const hysteria2NodeConfigger = new Hysteria2NodeConfigger();

export { Hysteria2Authenticator, hysteria2NodeConfigger };
