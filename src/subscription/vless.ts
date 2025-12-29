import { type ConfigType, type Authenticator, type NodeConfigger } from ".";
import {
  type Node,
  type NodeType,
  type UserSecrets,
  type NodeAdvancedSchema,
} from "@/types";
import { XtlsApi } from "@remnawave/xtls-sdk";

class VlessAuthenticator implements Authenticator {
  type: NodeType = "vless";
  apiPort = "10086";
  tag = "vless-reality";
  flow: "xtls-rprx-vision" | "" = "xtls-rprx-vision";

  async auth(params: any): Promise<any> {}

  async assign(node: Node, secrets: UserSecrets): Promise<void> {
    const api = new XtlsApi(node.host, this.apiPort);
    const response = await api.handler.addVlessUser({
      uuid: secrets.vless,
      tag: this.tag,
      flow: this.flow,
      username: secrets.vless,
      level: 0,
    });

    if (!response.isOk) {
      throw new Error(`Failed to assign VLESS user: ${response.message}`);
    }
  }

  async deassign(node: Node, secrets: UserSecrets): Promise<void> {
    const api = new XtlsApi(node.host, this.apiPort);
    const response = await api.handler.removeUser(this.tag, secrets.vless);

    if (!response.isOk) {
      throw new Error(`Failed to deassign VLESS user: ${response.message}`);
    }
  }
}

type ClashConfig = {
  name: string;
  type: "vless";
  server: string;
  port: string;
  uuid: string;
} & NodeAdvancedSchema["vless"];
type KaringConfig = ClashConfig;

type ShadowrocketConfig = {
  remarks: string;
  server: string;
  port: number;
  uuid: string;
  tls: 0 | 1;
  peer: string; // same as servername
  xtls: 0 | 1 | 2; // flow: none | xtls-rprx-direct | xtls-rprx-vision
  pbk: string; // same as public-key
  sid: string | undefined; // same as short-id
};

class VlessNodeConfigger implements NodeConfigger {
  type: NodeType = "vless";

  toModel(
    node: Node,
    secrets: UserSecrets,
    configType: ConfigType,
  ): ClashConfig | KaringConfig | ShadowrocketConfig {
    const advanced = node.advanced as NodeAdvancedSchema["vless"];

    if (configType === "clash" || configType === "karing") {
      return {
        name: node.name,
        type: "vless",
        server: node.host,
        port: node.port,
        uuid: secrets.vless,
        ...advanced,
      };
    }

    if (configType === "shadowrocket") {
      return {
        remarks: node.name,
        server: node.host,
        port: Number(node.port),
        uuid: secrets.vless,
        tls: advanced.tls ? 1 : 0,
        peer: advanced.servername,
        xtls: advanced.flow === "xtls-rprx-vision" ? 2 : 0,
        pbk: advanced["reality-opts"]["public-key"],
        sid: advanced["reality-opts"]["short-id"],
      };
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

      const serverInfo = Buffer.from(
        `auto:${config.uuid}@${config.server}:${config.port}`,
      ).toString("base64");

      return `${this.type}://${serverInfo}?tls=${config.tls}&peer=${config.peer}&xtls=${config.xtls}&pbk=${config.pbk}&sid=${config.sid}&remarks=${encodeURIComponent(config.remarks)}`;
    }

    throw new Error(`Unsupported config type: ${configType}`);
  }
}

const vlessNodeConfigger = new VlessNodeConfigger();

export { VlessAuthenticator, vlessNodeConfigger };
