import { type ConfigType, type NodeConfigger } from ".";
import {
  type Node,
  type NodeType,
  type UserSecrets,
  type NodeAdvancedSchema,
} from "@/types";

type ClashConfig = {
  name: string;
  type: "vless";
  server: string;
  port: string;
  uuid: string;
} & NodeAdvancedSchema["vless"];
type KaringConfig = ClashConfig;

export class VlessNodeConfigger implements NodeConfigger {
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
