import { type Authenticator } from "./index";
import { getUserByUserSecrets } from "@/services/user";

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

export { Hysteria2Authenticator };
