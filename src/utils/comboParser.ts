import { ComboItem } from '../types';

/**
 * Parses raw text containing custom authentication combos.
 * Supports formats:
 * - email:pass
 * - email;pass
 * - email|pass
 * - email,pass
 * - email pass
 */
export function parseCombos(rawText: string): Omit<ComboItem, 'id'>[] {
  if (!rawText) return [];

  const lines = rawText.split(/\r?\n/);
  const items: Omit<ComboItem, 'id'>[] = [];
  const seen = new Set<string>();

  // Matches typical emails and password combinations
  // Format separator can be :, ;, |, comma, or whitespace
  const separators = /[:;|,\s]+/;

  for (let line of lines) {
    line = line.trim();
    if (!line || line.startsWith('#') || line.startsWith('//')) continue;

    // Direct match check for email and password
    // Sometimes passwords can contain special chars, so split at first separator
    // If it's a colon split: "user@example.com:password123:with:colons"
    let email = '';
    let pass = '';

    // Try primary split characters first
    const primarySeparators = [':', '|', ';', ','];
    let splitChar = '';

    for (const char of primarySeparators) {
      if (line.includes(char)) {
        splitChar = char;
        break;
      }
    }

    if (splitChar) {
      const parts = line.split(splitChar);
      email = parts[0]?.trim() || '';
      pass = parts.slice(1).join(splitChar)?.trim() || '';
    } else {
      // Fallback: split on whitespace
      const parts = line.split(/\s+/);
      email = parts[0]?.trim() || '';
      pass = parts.slice(1).join(' ')?.trim() || '';
    }

    // Basic email validation regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (emailRegex.test(email) && pass) {
      const comboKey = `${email.toLowerCase()}:${pass}`;
      if (!seen.has(comboKey)) {
        seen.add(comboKey);
        items.push({
          email,
          pass,
          status: 'unchecked',
          tier: 'N/A',
          country: 'N/A',
          expiry: 'N/A',
          paymentMethod: 'N/A',
          profiles: 0,
          nextBilling: 'N/A',
        });
      }
    }
  }

  return items;
}

/**
 * Strips domain distributions from combo lists for analytical reporting
 */
export function getDomainDistribution(combos: ComboItem[]): Record<string, number> {
  const distribution: Record<string, number> = {};
  for (const combo of combos) {
    try {
      const domain = combo.email.split('@')[1]?.toLowerCase();
      if (domain) {
        distribution[domain] = (distribution[domain] || 0) + 1;
      }
    } catch {
      // Ignore malformed
    }
  }
  return distribution;
}
