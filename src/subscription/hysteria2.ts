import {
  type Authenticator,
  type ConfigType,
  type NodeConfigger,
} from "./index";
import { type Node, type UserSecrets } from "@/types";
import { getUserByUserSecrets } from "@/services/user";
import { YAML } from "bun";

type Params = {
  addr: string;
  auth: string;
  tx: number;
};
type Result = { ok: boolean; id: string };

class Hysteria2Authenticator implements Authenticator<Params, Result> {
  type = "hysteria2";

  async auth(params: Params): Promise<Result> {
    // simple auth
    const user = await getUserByUserSecrets(params.auth, this.type);
    return { ok: !!user, id: user?.name || "" };
  }
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

class Hysteria2NodeConfigger implements NodeConfigger {
  async create(
    node: Node,
    secrets: UserSecrets,
    configType: ConfigType,
  ): Promise<any> {
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
    throw new Error(`Unsupported config type: ${configType}`);
  }
}

export { Hysteria2Authenticator, Hysteria2NodeConfigger };
