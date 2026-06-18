import { ProxyItem, ProxyType } from '../types';

/**
 * Parses raw text containing proxy endpoints.
 * Supports formats:
 * - host:port
 * - host:port:user:pass
 * - user:pass@host:port
 * - protocol://host:port
 * - protocol://user:pass@host:port
 */
export function parseProxies(rawText: string, defaultType: ProxyType = 'HTTP'): Omit<ProxyItem, 'id'>[] {
  if (!rawText) return [];

  const lines = rawText.split(/\r?\n/);
  const items: Omit<ProxyItem, 'id'>[] = [];
  const seen = new Set<string>();

  for (let line of lines) {
    line = line.trim();
    if (!line || line.startsWith('#') || line.startsWith('//')) continue;

    let type: ProxyType = defaultType;
    let host = '';
    let port = 80;
    let username: string | undefined;
    let password: string | undefined;

    // Detect protocol prefix
    const protocolMatch = line.match(/^([a-zA-Z0-9]+):\/\/(.*)$/);
    let addressPart = line;

    if (protocolMatch) {
      const parsedType = protocolMatch[1].toUpperCase();
      if (parsedType === 'HTTP' || parsedType === 'HTTPS' || parsedType === 'SOCKS4' || parsedType === 'SOCKS5') {
        type = parsedType as ProxyType;
      }
      addressPart = protocolMatch[2];
    }

    // Check if format has credentials in front: user:pass@host:port
    if (addressPart.includes('@')) {
      const parts = addressPart.split('@');
      const creds = parts[0].split(':');
      const connection = parts[1].split(':');

      username = creds[0];
      password = creds[1];
      host = connection[0];
      port = parseInt(connection[1] || '80', 10);
    } else {
      // Check for standard formats: host:port or host:port:user:pass
      const parts = addressPart.split(':');
      if (parts.length >= 2) {
        host = parts[0];
        port = parseInt(parts[1], 10);

        if (parts.length >= 4) {
          username = parts[2];
          password = parts[3];
        }
      }
    }

    if (host && !isNaN(port) && port > 0 && port <= 65535) {
      // Basic IP/Domain validation
      const proxyKey = `${type}://${host}:${port}${username ? `:${username}` : ''}`;
      if (!seen.has(proxyKey)) {
        seen.add(proxyKey);
        items.push({
          host,
          port,
          type,
          username,
          password,
          status: 'untested',
        });
      }
    }
  }

  return items;
}

/**
 * Re-serializes proxy list back to standard user:pass format or host:port formats
 */
export function serializeProxy(proxy: ProxyItem, format: 'standard' | 'url' = 'standard'): string {
  const creds = proxy.username && proxy.password ? `${proxy.username}:${proxy.password}@` : '';
  if (format === 'url') {
    return `${proxy.type.toLowerCase()}://${creds}${proxy.host}:${proxy.port}`;
  }
  return `${proxy.host}:${proxy.port}${proxy.username && proxy.password ? `:${proxy.username}:${proxy.password}` : ''}`;
}
