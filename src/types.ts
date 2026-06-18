export type ComboStatus = 'unchecked' | 'checking' | 'hit_premium' | 'free' | 'invalid' | '2fa' | 'error';
export type SubscriptionTier = 'Free' | 'Fan' | 'Mega Fan' | 'Ultimate Fan' | 'N/A';
export type ProxyType = 'HTTP' | 'HTTPS' | 'SOCKS4' | 'SOCKS5';
export type ProxyStatus = 'untested' | 'testing' | 'alive' | 'dead';

export interface ComboItem {
  id: string;
  email: string;
  pass: string;
  status: ComboStatus;
  tier: SubscriptionTier;
  country: string;
  expiry: string;
  paymentMethod: string;
  profiles: number;
  nextBilling: string;
  checkedAt?: string;
  errorMessage?: string;
  checkedByProxy?: string;
}

export interface ProxyItem {
  id: string;
  host: string;
  port: number;
  type: ProxyType;
  username?: string;
  password?: string;
  status: ProxyStatus;
  ping?: number; // ms
  errorMessage?: string;
}

export interface CheckerConfig {
  mode: 'proxy' | 'proxyless';
  threads: number;
  delay: number; // in Milliseconds
  timeout: number; // in Milliseconds
  retries: number;
  userAgentType: 'Mobile Android' | 'Mobile iOS' | 'Web Chrome' | 'Web Firefox' | 'Random';
  customHeaders: Array<{ key: string; value: string }>;
  soundOnHit?: boolean;
}

export interface CheckerStats {
  checked: number;
  total: number;
  hits: number;
  free: number;
  invalid: number;
  twoFactor: number;
  errors: number;
  cpm: number; // checks per minute
  elapsedTime: number; // in seconds
  activeThreads: number;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'debug';
  message: string;
}

export interface CheckerEngine {
  combos: ComboItem[];
  proxies: ProxyItem[];
  config: CheckerConfig;
  stats: CheckerStats;
  logs: LogEntry[];
  running: boolean;
}
