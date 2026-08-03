import net from 'node:net'
import dns from 'node:dns'

// SSRF guard for server-side fetching of user-supplied URLs. We only fetch
// public web content (job ads, public profiles); this blocks any URL that
// resolves into private/loopback/link-local/metadata space, which is how an
// attacker would try to turn "fetch this page" into a request against internal
// services or the cloud metadata endpoint (169.254.169.254).
//
// The check must run BEFORE the initial fetch AND on every redirect hop, because
// a public URL can 30x-redirect to an internal one. It also resolves DNS and
// inspects every returned address, defeating DNS-rebinding (a public name that
// resolves to an internal IP).

export class UrlGuardError extends Error {
  constructor(message) {
    super(message)
    this.name = 'UrlGuardError'
  }
}

function ipv4Blocked(ip) {
  const parts = ip.split('.').map(Number)
  if (parts.length !== 4 || parts.some(n => !Number.isInteger(n) || n < 0 || n > 255)) {
    return true // malformed — fail closed
  }
  const [a, b] = parts
  if (a === 0) return true                        // 0.0.0.0/8 "this network"
  if (a === 10) return true                       // 10.0.0.0/8 private
  if (a === 127) return true                      // loopback
  if (a === 100 && b >= 64 && b <= 127) return true // 100.64.0.0/10 CGNAT
  if (a === 169 && b === 254) return true         // link-local incl. 169.254.169.254 metadata
  if (a === 172 && b >= 16 && b <= 31) return true // 172.16.0.0/12 private
  if (a === 192 && b === 168) return true         // 192.168.0.0/16 private
  if (a >= 224) return true                        // 224.0.0.0/4 multicast + 240/4 reserved + 255.255.255.255
  return false
}

function ipv6Blocked(ip) {
  let s = ip.toLowerCase()
  const zone = s.indexOf('%')
  if (zone >= 0) s = s.slice(0, zone)
  // IPv4-mapped / -embedded (e.g. ::ffff:127.0.0.1) — check the embedded v4.
  const v4 = s.match(/:((?:\d{1,3}\.){3}\d{1,3})$/)
  if (v4) return ipv4Blocked(v4[1])
  if (s === '::' || s === '::1') return true       // unspecified / loopback
  if (s.startsWith('fc') || s.startsWith('fd')) return true // fc00::/7 unique-local
  // fe80::/10 link-local → fe8x / fe9x / feax / febx
  if (/^fe[89ab]/.test(s)) return true
  if (s.startsWith('ff')) return true              // ff00::/8 multicast
  return false
}

// True if the given IP literal is in a range we refuse to fetch from.
export function isBlockedIp(ip) {
  const v = net.isIP(ip)
  if (v === 4) return ipv4Blocked(ip)
  if (v === 6) return ipv6Blocked(ip)
  return true // not a valid IP — fail closed
}

// Validates that `rawUrl` is a public http(s) URL safe to fetch server-side.
// Throws UrlGuardError on anything unsafe. Returns the parsed URL on success.
// `lookup` is injectable for testing (defaults to dns.promises.lookup).
export async function assertPublicHttpUrl(rawUrl, { lookup = dns.promises.lookup } = {}) {
  let u
  try {
    u = new URL(rawUrl)
  } catch {
    throw new UrlGuardError('Invalid URL')
  }

  if (u.protocol !== 'http:' && u.protocol !== 'https:') {
    throw new UrlGuardError('Only http and https URLs are allowed')
  }

  const host = u.hostname
  if (!host) throw new UrlGuardError('URL has no host')

  const lowered = host.toLowerCase().replace(/\.$/, '')
  if (lowered === 'localhost' || lowered.endsWith('.localhost')) {
    throw new UrlGuardError('Blocked host')
  }

  // IPv6 literals arrive bracketed in URL.hostname on some runtimes, bare on
  // others — normalize before net.isIP.
  const literal = host.startsWith('[') && host.endsWith(']') ? host.slice(1, -1) : host
  if (net.isIP(literal)) {
    if (isBlockedIp(literal)) throw new UrlGuardError('Blocked address')
    return u
  }

  // A DNS name — resolve and reject if ANY resolved address is internal.
  let addrs
  try {
    addrs = await lookup(host, { all: true })
  } catch {
    throw new UrlGuardError('Could not resolve host')
  }
  if (!Array.isArray(addrs) || addrs.length === 0) {
    throw new UrlGuardError('Could not resolve host')
  }
  for (const { address } of addrs) {
    if (isBlockedIp(address)) throw new UrlGuardError('Blocked address')
  }

  return u
}
