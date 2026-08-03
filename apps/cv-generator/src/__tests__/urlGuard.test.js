import { describe, it, expect, vi } from 'vitest'
import { assertPublicHttpUrl, isBlockedIp, UrlGuardError } from '@lib/urlGuard'

describe('isBlockedIp', () => {
  it('blocks private / loopback / link-local / metadata IPv4', () => {
    for (const ip of [
      '0.0.0.0', '10.0.0.5', '127.0.0.1', '100.64.0.1',
      '169.254.169.254', '172.16.0.1', '172.31.255.255',
      '192.168.1.1', '224.0.0.1', '255.255.255.255',
    ]) {
      expect(isBlockedIp(ip), ip).toBe(true)
    }
  })

  it('allows public IPv4 (including addresses just outside private ranges)', () => {
    for (const ip of ['8.8.8.8', '1.1.1.1', '93.184.216.34', '172.15.0.1', '172.32.0.1', '100.63.0.1', '100.128.0.1']) {
      expect(isBlockedIp(ip), ip).toBe(false)
    }
  })

  it('blocks internal IPv6 (loopback, ULA, link-local, v4-mapped-internal)', () => {
    for (const ip of ['::1', '::', 'fc00::1', 'fd12:3456::1', 'fe80::1', '::ffff:127.0.0.1']) {
      expect(isBlockedIp(ip), ip).toBe(true)
    }
  })

  it('allows public IPv6', () => {
    expect(isBlockedIp('2606:4700:4700::1111')).toBe(false)
  })

  it('fails closed on garbage', () => {
    expect(isBlockedIp('not-an-ip')).toBe(true)
  })
})

describe('assertPublicHttpUrl', () => {
  const publicLookup = vi.fn(async () => [{ address: '93.184.216.34', family: 4 }])

  it('rejects non-http(s) schemes', async () => {
    for (const url of ['file:///etc/passwd', 'ftp://example.com', 'data:text/html,hi', 'gopher://x']) {
      await expect(assertPublicHttpUrl(url, { lookup: publicLookup })).rejects.toBeInstanceOf(UrlGuardError)
    }
  })

  it('rejects localhost and *.localhost', async () => {
    await expect(assertPublicHttpUrl('http://localhost:3000/', { lookup: publicLookup })).rejects.toBeInstanceOf(UrlGuardError)
    await expect(assertPublicHttpUrl('http://app.localhost/', { lookup: publicLookup })).rejects.toBeInstanceOf(UrlGuardError)
  })

  it('rejects private/metadata IP literals without any DNS lookup', async () => {
    const lookup = vi.fn()
    await expect(assertPublicHttpUrl('http://169.254.169.254/latest/meta-data/', { lookup })).rejects.toBeInstanceOf(UrlGuardError)
    await expect(assertPublicHttpUrl('http://10.0.0.1/', { lookup })).rejects.toBeInstanceOf(UrlGuardError)
    await expect(assertPublicHttpUrl('http://[::1]/', { lookup })).rejects.toBeInstanceOf(UrlGuardError)
    expect(lookup).not.toHaveBeenCalled()
  })

  it('rejects a public name that resolves to an internal IP (DNS rebinding)', async () => {
    const lookup = vi.fn(async () => [{ address: '10.0.0.7', family: 4 }])
    await expect(assertPublicHttpUrl('http://sneaky.example.com/', { lookup })).rejects.toBeInstanceOf(UrlGuardError)
  })

  it('rejects a name that resolves to a mix where any address is internal', async () => {
    const lookup = vi.fn(async () => [
      { address: '93.184.216.34', family: 4 },
      { address: '127.0.0.1', family: 4 },
    ])
    await expect(assertPublicHttpUrl('http://mixed.example.com/', { lookup })).rejects.toBeInstanceOf(UrlGuardError)
  })

  it('rejects when the host cannot be resolved', async () => {
    const lookup = vi.fn(async () => { throw new Error('ENOTFOUND') })
    await expect(assertPublicHttpUrl('http://nope.example.com/', { lookup })).rejects.toBeInstanceOf(UrlGuardError)
  })

  it('passes for a public https URL and returns the parsed URL', async () => {
    const url = await assertPublicHttpUrl('https://example.com/jobs/123?q=1', { lookup: publicLookup })
    expect(url).toBeInstanceOf(URL)
    expect(url.hostname).toBe('example.com')
  })
})
