import { type NodeType } from "@/types";
import { Hysteria2Authenticator } from "./hysteria2";

interface Authenticator<P = any, R = any> {
  type: string;
  auth(params: P): Promise<R>;
}

function buildAuthenticator(type: string | NodeType): Authenticator<any, any> {
  if (type === "hysteria2") {
    return new Hysteria2Authenticator();
  }

  throw new Error(`Unsupported authenticator type: ${type}`);
}

export { type Authenticator, buildAuthenticator };
