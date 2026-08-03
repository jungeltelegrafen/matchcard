import { describe, it, expect } from 'vitest'
import { deriveFromUrl } from '../utils/portfolioHeuristics'

describe('deriveFromUrl', () => {
  it('maps known code hosts', () => {
    expect(deriveFromUrl('https://github.com/ada')).toEqual({ title: 'GitHub', category: 'code' })
    expect(deriveFromUrl('https://gitlab.com/ada/proj')).toEqual({ title: 'GitLab', category: 'code' })
    expect(deriveFromUrl('https://stackoverflow.com/users/1/ada')).toEqual({ title: 'Stack Overflow', category: 'code' })
  })

  it('maps known design hosts', () => {
    expect(deriveFromUrl('https://dribbble.com/ada')).toEqual({ title: 'Dribbble', category: 'design' })
    expect(deriveFromUrl('https://www.behance.net/ada')).toEqual({ title: 'Behance', category: 'design' })
  })

  it('maps known writing hosts', () => {
    expect(deriveFromUrl('https://ada.medium.com')).toEqual({ title: 'Medium', category: 'writing' })
    expect(deriveFromUrl('https://dev.to/ada')).toEqual({ title: 'DEV', category: 'writing' })
  })

  it('derives a title from an unknown host and leaves category blank', () => {
    expect(deriveFromUrl('https://read.cv/ada')).toEqual({ title: 'Read.cv', category: '' })
    expect(deriveFromUrl('https://janedoe.com')).toEqual({ title: 'Janedoe', category: '' })
    expect(deriveFromUrl('https://my-site.io/work')).toEqual({ title: 'My-site.io', category: '' })
  })

  it('accepts a bare host without protocol', () => {
    expect(deriveFromUrl('github.com/ada')).toEqual({ title: 'GitHub', category: 'code' })
  })

  it('returns empty for blank or unparseable input', () => {
    expect(deriveFromUrl('')).toEqual({ title: '', category: '' })
    expect(deriveFromUrl('   ')).toEqual({ title: '', category: '' })
    expect(deriveFromUrl(null)).toEqual({ title: '', category: '' })
  })
})
