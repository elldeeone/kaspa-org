export const KASPA_VERSION = "Rusty Kaspa v2.0.1";
export const DOCS_URL = "https://docs.kaspa.org";
export const REST_API_URL = "https://api.kaspa.org/docs";
export const RUSTY_KASPA_URL = "https://github.com/kaspanet/rusty-kaspa";
export const TELEGRAM_RND_URL = "https://t.me/kasparnd";
export const KASPA_ACCENT = "118, 167, 158";
export const RUSTY_RELEASE_URL =
  "https://github.com/kaspanet/rusty-kaspa/releases/tag/v2.0.1";
export const DOCKER_HUB_URL = "https://hub.docker.com/r/kaspanet/rusty-kaspad";
export const DOCKER_RUN_COMMAND =
  "docker run -d --name kaspad -p 16110:16110 kaspanet/rusty-kaspad:latest";

export const BUILD_TERMS = {
  api: "API",
  core: "Core",
  daa: "DAA",
  dag: "DAG",
  deepWiki: "DeepWiki",
  discord: "Discord",
  dnsSeeder: "DNS Seeder",
  docker: "Docker",
  dockerHub: "Docker Hub",
  github: "GitHub",
  grpc: "gRPC",
  javascript: "JavaScript",
  kaspa: "Kaspa",
  kaspaAi: "Kaspa AI",
  kaspaJs: "kaspa-js",
  kaspaQAndA: "Kaspa Q&A",
  kaspaResearch: "Kaspa Research",
  kaspaResolver: "Kaspa Resolver",
  kaspaScript: "Kaspa Script",
  khost: "kHost",
  kip: "KIP",
  kip16: "KIP-16",
  kip17: "KIP-17",
  kip20: "KIP-20",
  kip21: "KIP-21",
  kips: "KIPs",
  node: "Node",
  nodeJs: "Node.js",
  p2p: "P2P",
  publicNodeNetwork: "Public Node Network",
  python: "Python",
  pythonSdk: "Python SDK",
  qa: "Q&A",
  restApi: "REST API",
  rpc: "RPC",
  rust: "Rust",
  rustyKaspa: "Rusty Kaspa",
  sdk: "SDK",
  sdks: "SDKs",
  silverscript: "Silverscript",
  simplyKaspaIndexer: "Simply Kaspa Indexer",
  telegram: "Telegram",
  tn12: "TN12",
  toccata: "Toccata",
  utxo: "UTXO",
  vprogs: "vProgs",
  wasmSdk: "WASM SDK",
  zk: "zk",
} as const;
