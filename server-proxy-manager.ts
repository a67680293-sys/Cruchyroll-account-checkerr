import axios from 'axios';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { SocksProxyAgent } from 'socks-proxy-agent';

interface ManagedProxy {
  url: string;
  host: string;
  port: number;
  protocol: string;
  status: 'unchecked' | 'alive' | 'dead';
  lastChecked: number;
  latency: number;
  consecutiveFailures: number;
}

export class ServerProxyManager {
  private proxies: ManagedProxy[] = [];
  private isChecking = false;
  private isScraping = false;
  private checkInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Start automated background tasks
    this.startBackgroundTasks();
  }

  private startBackgroundTasks() {
    // Trigger initial scrape and check
    this.scrapeAndVerify();

    // Verify proxy health every 3 minutes
    this.checkInterval = setInterval(() => {
      this.verifyProxyHealth();
    }, 3 * 60 * 1000);

    // Re-scrape dynamic lists every 20 minutes to refresh the rotational pool
    setInterval(() => {
      this.scrapeAndVerify();
    }, 20 * 60 * 1000);
  }

  /**
   * Scrapes dynamic proxies and immediately initiates a validation cycle.
   */
  public async scrapeAndVerify(): Promise<void> {
    if (this.isScraping) return;
    this.isScraping = true;
    console.log('[Proxy Manager] Scraping fresh proxy rotation pool...');

    try {
      const protocols = ['http', 'socks4', 'socks5'];
      const rawScraped: string[] = [];

      // Primary: High-speed CDN GitHub Raw Proxy Lists (unlimited requests, refreshed hourly)
      const githubSources = [
        { url: 'https://raw.githubusercontent.com/TheSpeedX/SOCKS-List/master/socks5.txt', proto: 'socks5' },
        { url: 'https://raw.githubusercontent.com/TheSpeedX/SOCKS-List/master/socks4.txt', proto: 'socks4' },
        { url: 'https://raw.githubusercontent.com/TheSpeedX/SOCKS-List/master/http.txt', proto: 'http' },
        { url: 'https://raw.githubusercontent.com/monosans/proxy-list/main/proxies/socks5.txt', proto: 'socks5' },
        { url: 'https://raw.githubusercontent.com/monosans/proxy-list/main/proxies/socks4.txt', proto: 'socks4' },
        { url: 'https://raw.githubusercontent.com/monosans/proxy-list/main/proxies/http.txt', proto: 'http' },
        { url: 'https://raw.githubusercontent.com/mmpx12/proxy-list/master/socks5.txt', proto: 'socks5' },
        { url: 'https://raw.githubusercontent.com/mmpx12/proxy-list/master/http.txt', proto: 'http' }
      ];

      await Promise.all(
        githubSources.map(async (source) => {
          try {
            const response = await axios.get(source.url, { timeout: 10000 });
            if (response.data && typeof response.data === 'string') {
              const lines = response.data.split('\n');
              let count = 0;
              lines.forEach((line) => {
                const clean = line.trim();
                if (clean && clean.includes(':') && !clean.startsWith('#')) {
                  rawScraped.push(`${source.proto}://${clean}`);
                  count++;
                }
              });
              console.log(`[Proxy Scraper] Retrieved ${count} fresh proxies from GitHub Source: ${source.proto}`);
            }
          } catch (e: any) {
            // Silently swallow background loader logs so they do not clutter user workspace output
          }
        })
      );

      // Secondary: Try requesting ProxyScrape endpoints with a user-agent to bypass rate-limiting blocks or cache-shields.
      // If they throw 429 or fail, they are safely skipped since the CDN lists already populated 1000+ endpoints.
      await Promise.all(
        protocols.map(async (proto) => {
          try {
            const url = `https://api.proxyscrape.com/v2/?request=displayproxies&protocol=${proto}&timeout=10000&country=all&ssl=all&anonymity=elite,anonymous`;
            const response = await axios.get(url, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
              },
              timeout: 8000
            });
            if (response.data && typeof response.data === 'string') {
              const lines = response.data.split('\n');
              lines.forEach((line) => {
                const clean = line.trim();
                if (clean && clean.includes(':')) {
                  rawScraped.push(`${proto}://${clean}`);
                }
              });
            }
          } catch (e: any) {
            // Fail silently or log minimally; the alternate direct mirrors already provide massive redundancy
          }
        })
      );

      console.log(`[Proxy Manager] Scraped ${rawScraped.length} total potential rotation proxies. Refiltering into pool.`);

      // Merge and avoid replicates
      const existingUrls = new Set(this.proxies.map(p => p.url));
      const added: ManagedProxy[] = [];

      rawScraped.forEach((proxyUrl) => {
        if (!existingUrls.has(proxyUrl)) {
          try {
            const parsed = new URL(proxyUrl);
            added.push({
              url: proxyUrl,
              host: parsed.hostname,
              port: parseInt(parsed.port, 10),
              protocol: parsed.protocol.replace(':', ''),
              status: 'unchecked',
              lastChecked: 0,
              latency: 9999,
              consecutiveFailures: 0,
            });
          } catch {
            // Ignore corrupted proxy lines
          }
        }
      });

      // Maintain a maximum pool of 800 active/unchecked items to save memory and CPU
      this.proxies = [...this.proxies, ...added].slice(-800);
      console.log(`[Proxy Manager] Active rotation pool size: ${this.proxies.length}`);

      // Immediately run verification in the background
      this.verifyProxyHealth();

    } catch (err: any) {
      console.error(`[Proxy Manager] Scrape error: ${err.message}`);
    } finally {
      this.isScraping = false;
    }
  }

  /**
   * Concurrently checks the health of unchecked and alive proxies.
   * Runs tests specifically against a lightweight web service and Crunchyroll properties.
   */
  public async verifyProxyHealth(): Promise<void> {
    if (this.isChecking) return;
    this.isChecking = true;
    console.log('[Proxy Manager] Commencing proxy verification pass...');

    // Select proxies to check: check all unchecked, and re-verify already alive ones
    const targets = this.proxies.filter(p => p.status === 'unchecked' || p.status === 'alive');
    const concurrency = 25; // High concurrency limit

    for (let i = 0; i < targets.length; i += concurrency) {
      const slice = targets.slice(i, i + concurrency);
      await Promise.all(slice.map(p => this.testSingleProxy(p)));
    }

    // Clean up dead memory nodes (remove proxies with more than 3 consecutive failures)
    this.proxies = this.proxies.filter(p => p.status !== 'dead' && p.consecutiveFailures < 3);

    console.log(`[Proxy Manager] Verification finished. Pool report: 
      Total: ${this.proxies.length}
      Alive/Ready: ${this.proxies.filter(p => p.status === 'alive').length}
    `);

    this.isChecking = false;
  }

  private async testSingleProxy(p: ManagedProxy): Promise<void> {
    const startTime = Date.now();
    let agent: any = null;

    try {
      if (p.protocol.startsWith('socks')) {
        agent = new SocksProxyAgent(p.url, { timeout: 10000 });
      } else {
        agent = new HttpsProxyAgent(p.url, {
          rejectUnauthorized: false,
          timeout: 10000,
          keepAlive: true,
        });
      }

      // Execute a quick HEAD or GET to a secure target which Crunchyroll auth depends upon,
      // or check Crunchyroll beta auth gate directly to detect if Cloudflare is blocking
      const response = await axios.get('https://www.crunchyroll.com/', {
        headers: {
          'User-Agent': 'Crunchyroll/3.74.2 Android/13 okhttp/4.10.0',
        },
        httpAgent: agent,
        httpsAgent: agent,
        proxy: false,
        timeout: 8000,
        validateStatus: () => true, // Proceed for status checking (we don't want 403/429 to throw node errors)
      });

      const latency = Date.now() - startTime;

      if (response.status === 403 || response.status === 429) {
        // High threat levels, marked as dead/inactive
        p.status = 'dead';
        p.consecutiveFailures++;
      } else {
        // Healthy connection!
        p.status = 'alive';
        p.latency = latency;
        p.consecutiveFailures = 0;
        p.lastChecked = Date.now();
      }

    } catch (err) {
      p.consecutiveFailures++;
      if (p.consecutiveFailures >= 2) {
        p.status = 'dead';
      }
    }
  }

  /**
   * Retrieves a random healthy proxy from the rotation pool.
   * If the rotation pool is depleted, triggers a scraping sweep and returns a tentative proxy.
   */
  public getRandomProxy(): string | null {
    const healthy = this.proxies.filter(p => p.status === 'alive');
    if (healthy.length === 0) {
      // Background scrape immediately to restore pool
      this.scrapeAndVerify();
      
      // Fallback: try an unchecked one
      const unchecked = this.proxies.filter(p => p.status === 'unchecked');
      if (unchecked.length > 0) {
        const picked = unchecked[Math.floor(Math.random() * unchecked.length)];
        return BallastProxyUrl(picked);
      }
      return null;
    }

    // Pick from the top 50% lowest latency healthy proxies to optimize checking speed
    const sorted = [...healthy].sort((a, b) => a.latency - b.latency);
    const topCap = Math.max(1, Math.floor(sorted.length * 0.40));
    const finalPick = sorted[Math.floor(Math.random() * topCap)];
    
    return BallastProxyUrl(finalPick);
  }

  /**
   * Feedback loop from checker executions to keep accuracy high.
   */
  public registerFeedback(proxyUrl: string, status: 'success' | 'failure' | 'rate-limit'): void {
    const found = this.proxies.find(p => p.url === proxyUrl);
    if (!found) return;

    if (status === 'success') {
      found.consecutiveFailures = 0;
      found.status = 'alive';
    } else if (status === 'rate-limit') {
      found.status = 'dead';
      found.consecutiveFailures += 2;
    } else {
      found.consecutiveFailures++;
      if (found.consecutiveFailures >= 2) {
        found.status = 'dead';
      }
    }
  }

  public getStatusSnapshot() {
    return {
      activePoolSize: this.proxies.length,
      aliveCount: this.proxies.filter(p => p.status === 'alive').length,
      uncheckedCount: this.proxies.filter(p => p.status === 'unchecked').length,
      avgLatency: Math.round(
        this.proxies.filter(p => p.status === 'alive').reduce((acc, curr) => acc + curr.latency, 0) /
        (this.proxies.filter(p => p.status === 'alive').length || 1)
      ),
    };
  }
}

function BallastProxyUrl(p: ManagedProxy): string {
  // Return absolute string formatted properly
  return p.url;
}

// Singleton instances
export const autoProxyRotator = new ServerProxyManager();
