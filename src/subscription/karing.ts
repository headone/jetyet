import { type ConfigType } from ".";
import { ClashConfigger } from "./clash";

export class KaringConfigger extends ClashConfigger {
  override type: ConfigType = "karing";
}
