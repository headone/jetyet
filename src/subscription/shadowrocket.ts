import { type Configger, type ConfigType, buildNodeConfigger } from ".";
import { type Node, type UserSecrets, type User } from "@/types";

export class ShadowrocketConfigger implements Configger {
  type: ConfigType = "shadowrocket";
  user: User;
  nodes: Node[];
  secrets: UserSecrets;

  constructor(user: User, nodes: Node[], secrets: UserSecrets) {
    this.user = user;
    this.nodes = nodes;
    this.secrets = secrets;
  }

  headers(): Record<string, string> {
    return {
      "Content-Type": "text/plain; charset=utf-8",
      "profile-update-interval": "24",
      // "subscription-userinfo": "upload=1638257504; download=13418441583; total=1073839341568; expire=1791390742",
    };
  }

  async stringifySubscription(): Promise<string> {
    const configs = this.nodes
      .map((node) =>
        buildNodeConfigger(node.type).toURI(node, this.secrets, this.type),
      )
      .join("\n");

    // base64
    const base64 = Buffer.from(configs).toString("base64");

    return base64;
  }
}
