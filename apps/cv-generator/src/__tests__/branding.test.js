import { describe, it, expect } from 'vitest'
import {
  emptyCompanyBranding,
  normalizeCompanyBranding,
  hasCompanyFooter,
  dataUrlToBytes,
  dataUrlImageType,
} from '../utils/branding'

describe('branding helpers', () => {
  it('normalizes to a full-shape object and drops junk', () => {
    expect(normalizeCompanyBranding(null)).toEqual(emptyCompanyBranding())
    const out = normalizeCompanyBranding({ companyName: 'NC', companyEmail: 'a@b.no', bogus: 1, logo: 5 })
    expect(out.companyName).toBe('NC')
    expect(out.companyEmail).toBe('a@b.no')
    expect(out.logo).toBe('') // non-string ignored
    expect(out.bogus).toBeUndefined()
  })

  it('hasCompanyFooter reflects any footer field', () => {
    expect(hasCompanyFooter(emptyCompanyBranding())).toBe(false)
    expect(hasCompanyFooter({ ...emptyCompanyBranding(), companyPhone: '+47' })).toBe(true)
    expect(hasCompanyFooter({ ...emptyCompanyBranding(), logo: 'data:...' })).toBe(false) // logo alone isn't footer
  })

  it('dataUrlToBytes decodes base64 and reports image type', () => {
    // "Hi" base64 = "SGk="
    const bytes = dataUrlToBytes('data:image/png;base64,SGk=')
    expect(Array.from(bytes)).toEqual([72, 105])
    expect(dataUrlToBytes('not-a-data-url')).toBeNull()
    expect(dataUrlImageType('data:image/png;base64,SGk=')).toBe('png')
    expect(dataUrlImageType('data:image/jpeg;base64,SGk=')).toBe('jpg')
  })
})
