/**
 * IP utilities for rate limiting and privacy
 * 
 * Pure module - no IO dependencies.
 * Single source of truth for IP handling across the project.
 */

import crypto from 'crypto';

const SALT = process.env.IP_HASH_SALT || 'quantum-nexus-default-salt';

/**
 * Hash an IP address for privacy-compliant storage
 * Uses SHA256 with a secret salt
 */
export function hashIP(ip: string): string {
  return crypto
    .createHash('sha256')
    .update(ip + SALT)
    .digest('hex');
}

/**
 * Extract client IP from request headers
 * Handles various proxy configurations
 */
export function getClientIP(headers: Headers): string {
  // Try x-forwarded-for first (most common with proxies)
  const forwardedFor = headers.get('x-forwarded-for');
  if (forwardedFor) {
    // Get the first IP (original client)
    const ips = forwardedFor.split(',').map(ip => ip.trim());
    const validIP = ips.find(ip => isValidIP(ip));
    if (validIP) return validIP;
  }

  // Try x-real-ip (nginx)
  const realIP = headers.get('x-real-ip');
  if (realIP && isValidIP(realIP)) return realIP;

  // Try cf-connecting-ip (Cloudflare)
  const cfIP = headers.get('cf-connecting-ip');
  if (cfIP && isValidIP(cfIP)) return cfIP;

  // Fallback to a placeholder (shouldn't happen in production)
  return '0.0.0.0';
}

/**
 * Validate IP address format (IPv4 or IPv6)
 */
export function isValidIP(ip: string): boolean {
  // IPv4 pattern
  const ipv4Pattern = /^(\d{1,3}\.){3}\d{1,3}$/;
  // Simplified IPv6 pattern
  const ipv6Pattern = /^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/;
  
  if (ipv4Pattern.test(ip)) {
    const parts = ip.split('.').map(Number);
    return parts.every(part => part >= 0 && part <= 255);
  }
  
  return ipv6Pattern.test(ip);
}
