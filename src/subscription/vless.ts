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

class VlessNodeConfigger implements NodeConfigger {
  type: NodeType = "vless";

  async create(
    node: Node,
    secrets: UserSecrets,
    configType: ConfigType,
  ): Promise<ClashConfig | KaringConfig> {
    if (configType === "clash" || configType === "karing") {
      return {
        name: node.name,
        type: "vless",
        server: node.host,
        port: node.port,
        uuid: secrets.vless,
        ...(node.advanced as NodeAdvancedSchema["vless"]),
      };
    }
    throw new Error(`Unsupported config type: ${configType}`);
  }
}

export { VlessAuthenticator, VlessNodeConfigger };
