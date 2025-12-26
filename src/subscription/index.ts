import { type NodeType, type Node, type UserSecrets } from "@/types";
import { Hysteria2Authenticator, Hysteria2NodeConfigger } from "./hysteria2";
import { YAML } from "bun";

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

type ConfigType = "clash";

interface NodeConfigger {
  create(
    node: Node,
    secrets: UserSecrets,
    configType: ConfigType,
  ): Promise<any>;
}

interface Configger {
  nodes: Node[];
  secrets: UserSecrets;
  toYAML(): Promise<string>;
}

function buildConfigger(
  type: string | ConfigType,
  nodes: Node[],
  secrets: UserSecrets,
): Configger {
  if (type === "clash") {
    return new ClashConfigger(nodes, secrets);
  }

  throw new Error(`Unsupported config type: ${type}`);
}

// todo: 偷懒
const defaultClashBaseConfig = `
rule-providers:
  AWAvenue-Ads:
    type: http
    behavior: domain
    format: yaml
    path: ./rule_provider/AWAvenue-Ads.yaml
    url: "https://ghfast.top/https://raw.githubusercontent.com/TG-Twilight/AWAvenue-Ads-Rule/refs/heads/main/Filters/AWAvenue-Ads-Rule-Clash-Classical.yaml"
    interval: 600
mode: global
ipv6: true
log-level: info
allow-lan: true
mixed-port: 7890
unified-delay: true
tcp-concurrent: true
external-controller: :9090
geodata-mode: true
geox-url:
  geoip: "https://ghfast.top/https://github.com/MetaCubeX/meta-rules-dat/releases/download/latest/geoip.dat"
  geosite: "https://ghfast.top/https://github.com/MetaCubeX/meta-rules-dat/releases/download/latest/geosite.dat"
  mmdb: "https://ghfast.top/https://github.com/MetaCubeX/meta-rules-dat/releases/download/latest/country.mmdb"
find-process-mode: strict
keep-alive-interval: 1800
global-client-fingerprint: random
profile:
  store-selected: true
  store-fake-ip: true
ntp:
  enable: true
  write-to-system: false
  server: time.apple.com
  port: 123
  interval: 30
sniffer:
  enable: true
  sniff:
    TLS:
      ports: [443, 8443]
    HTTP:
      ports: [80, 8080-8880]
      override-destination: true
tun:
  enable: false
  stack: system
  dns-hijack:
    - "any:53"
    - "tcp://any:53"
  auto-route: true
  auto-detect-interface: true
dns:
  enable: true
  listen: :1053
  ipv6: true
  enhanced-mode: fake-ip
  fake-ip-range: 28.0.0.1/8
  fake-ip-filter:
    - '*'
    - '+.lan'
    - '+.local'
  default-nameserver:
    - 223.5.5.5
    - 119.29.29.29
    - 114.114.114.114
    - '[2402:4e00::]'
    - '[2400:3200::1]'
  nameserver:
    - 'tls://8.8.4.4#dns'
    - 'tls://1.0.0.1#dns'
    - 'tls://[2001:4860:4860::8844]#dns'
    - 'tls://[2606:4700:4700::1001]#dns'
  proxy-server-nameserver:
    - https://doh.pub/dns-query
  nameserver-policy:
    "geosite:cn,private":
      - https://doh.pub/dns-query
      - https://dns.alidns.com/dns-query
    "geosite:!cn,!private":
      - "tls://dns.google"
      - "tls://cloudflare-dns.com"
proxies:
    # inject
proxy-groups:
    - name: Proxy
      proxies:
        - Auto
      type: select
    - interval: 300
      name: Auto
      proxies:
        # inject
      tolerance: 50
      type: url-test
      url: http://www.gstatic.com/generate_204
`;

class ClashConfigger implements Configger {
  type: ConfigType = "clash";
  nodes: Node[];
  secrets: UserSecrets;

  constructor(nodes: Node[], secrets: UserSecrets) {
    this.nodes = nodes;
    this.secrets = secrets;
  }

  async toYAML(): Promise<string> {
    const baseConfig = YAML.parse(defaultClashBaseConfig) as any;

    const hysteria2NodeConfigger = new Hysteria2NodeConfigger();

    const configs = await Promise.all(
      this.nodes.map(async (node) => {
        if (node.type === "hysteria2") {
          const config = await hysteria2NodeConfigger.create(
            node,
            this.secrets,
            this.type,
          );
          return config;
        }
        return undefined;
      }),
    );
    const filteredConfigs = configs.filter((config) => config !== undefined);

    // inject
    baseConfig.proxies = filteredConfigs;
    baseConfig["proxy-groups"][1].proxies = this.nodes.map((node) => node.name);

    return YAML.stringify(baseConfig, null, 2);
  }
}

export {
  type Authenticator,
  buildAuthenticator,
  type NodeConfigger,
  type Configger,
  buildConfigger,
  type ConfigType,
};
