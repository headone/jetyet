import { type Configger, type ConfigType, buildNodeConfigger } from ".";
import { type Node, type UserSecrets, type User } from "@/types";
import { YAML } from "bun";

export class ClashConfigger implements Configger {
  type: ConfigType = "clash";
  user: User;
  nodes: Node[];
  secrets: UserSecrets;

  constructor(user: User, nodes: Node[], secrets: UserSecrets) {
    this.user = user;
    this.nodes = nodes;
    this.secrets = secrets;
  }

  headers(): Record<string, string> {
    const filename = encodeURIComponent(`🛫 jetyet ${this.user.name}`);

    return {
      "content-disposition": `attachment; filename*=UTF-8''${filename}`,
      "profile-update-interval": "24",
      // "profile-web-page-url": "",
      // "subscription-userinfo": "upload=1638257504; download=13418441583; total=1073839341568; expire=1791390742",
    };
  }

  async stringifySubscription(): Promise<string> {
    const baseConfig = YAML.parse(defaultClashBaseConfig) as any;

    const configs = this.nodes
      .map((node) =>
        buildNodeConfigger(node.type).toModel(node, this.secrets, this.type),
      )
      .filter((config) => config !== undefined);

    // inject
    baseConfig.proxies = configs;
    const allProxies = this.nodes.map((node) => node.name);
    baseConfig["proxy-groups"][0].proxies.push(...allProxies); // For Proxy group
    baseConfig["proxy-groups"][1].proxies = allProxies; // For Auto group
    // For NETFLIX group
    allProxies
      .filter((name) => name.toLowerCase().includes("netflix"))
      .forEach((name) => {
        baseConfig["proxy-groups"][2].proxies.push(name);
      });

    return YAML.stringify(baseConfig, null, 2);
  }
}

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
        # inject
      type: select
    - interval: 300
      name: Auto
      proxies:
        # inject
      tolerance: 50
      type: url-test
      url: http://www.gstatic.com/generate_204
    - name: NETFLIX
      proxies:
        - Auto
        # inject
      type: select
rules:
  - RULE-SET,AWAvenue-Ads,REJECT
  - GEOSITE,category-scholar-!cn,Proxy
  - GEOSITE,apple,Proxy
  - GEOSITE,apple-cn,Proxy
  - GEOSITE,ehentai,Proxy
  - GEOSITE,github,Proxy
  - GEOSITE,twitter,Proxy
  - GEOSITE,youtube,Proxy
  - GEOSITE,google,Proxy
  - GEOSITE,google-cn,Proxy # Google CN 不走代理会导致香港等地区节点 Play Store 异常
  - GEOSITE,telegram,Proxy
  - GEOSITE,netflix,NETFLIX
  - GEOSITE,tiktok,Proxy
  - GEOSITE,bahamut,Proxy
  - GEOSITE,spotify,Proxy
  - GEOSITE,pixiv,Proxy
  - GEOSITE,steam@cn,DIRECT
  - GEOSITE,steam,Proxy
  - GEOSITE,onedrive,Proxy
  - GEOSITE,microsoft,Proxy
  - GEOSITE,geolocation-!cn,Proxy
  - GEOIP,google,Proxy
  - GEOIP,netflix,NETFLIX
  - GEOIP,telegram,Proxy
  - GEOIP,twitter,Proxy
  - GEOSITE,CN,DIRECT
  - GEOIP,CN,DIRECT
  # 绕过局域网地址
  - IP-CIDR,10.0.0.0/8,DIRECT
  - IP-CIDR,172.16.0.0/12,DIRECT
  - IP-CIDR,192.168.0.0/16,DIRECT
  - IP-CIDR,100.64.0.0/10,DIRECT
  - IP-CIDR,127.0.0.0/8,DIRECT
  - MATCH,Proxy
`;
