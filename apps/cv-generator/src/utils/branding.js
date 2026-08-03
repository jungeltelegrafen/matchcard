// Company branding (logo + company footer info) shown on the FIRST PAGE of the
// CV header/footer. Two scopes:
//   - Company branding is language-agnostic and set ONCE — stored in its own
//     localStorage key so it survives Reset and applies to every consultant.
//   - The consultant's profile photo is per-CV (stored in the draft) and merged
//     with the company branding into one `branding` object at render time.
// Images are small downscaled base64 data URIs (no backend).

const KEY = 'cv-generator:branding'

const COMPANY_FIELDS = [
  'logo', 'companyName', 'companyAddress', 'companyWebsite', 'companyEmail', 'companyPhone',
]

export function emptyCompanyBranding() {
  return { logo: '', companyName: '', companyAddress: '', companyWebsite: '', companyEmail: '', companyPhone: '' }
}

export function normalizeCompanyBranding(raw) {
  const out = emptyCompanyBranding()
  if (raw && typeof raw === 'object') {
    for (const k of COMPANY_FIELDS) if (typeof raw[k] === 'string') out[k] = raw[k]
  }
  return out
}

export function loadCompanyBranding() {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? normalizeCompanyBranding(JSON.parse(raw)) : emptyCompanyBranding()
  } catch {
    return emptyCompanyBranding()
  }
}

export function saveCompanyBranding(branding) {
  try {
    localStorage.setItem(KEY, JSON.stringify(normalizeCompanyBranding(branding)))
  } catch { /* best-effort */ }
}

// True when there's any company footer info worth rendering.
export function hasCompanyFooter(b) {
  return !!(b && (b.companyName || b.companyAddress || b.companyWebsite || b.companyEmail || b.companyPhone))
}

// Read a File into a downscaled JPEG/PNG data URI. Caps the longest side to
// `maxDim` and re-encodes so the URI stays small enough for the localStorage
// draft. Reuses the canvas→toDataURL technique already used for video posters.
export function fileToDataUrl(file, { maxDim = 512, quality = 0.85 } = {}) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type?.startsWith('image/')) { reject(new Error('Not an image')); return }
    const reader = new FileReader()
    reader.onerror = reject
    reader.onload = () => {
      const img = new Image()
      img.onerror = reject
      img.onload = () => {
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height))
        const w = Math.max(1, Math.round(img.width * scale))
        const h = Math.max(1, Math.round(img.height * scale))
        const canvas = document.createElement('canvas')
        canvas.width = w; canvas.height = h
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, w, h)
        // PNG keeps transparency (logos); photos re-encode as JPEG to stay small.
        const isPng = file.type === 'image/png'
        resolve(canvas.toDataURL(isPng ? 'image/png' : 'image/jpeg', isPng ? undefined : quality))
      }
      img.src = reader.result
    }
    reader.readAsDataURL(file)
  })
}

// data URI → Uint8Array (for docx ImageRun, which needs raw bytes).
export function dataUrlToBytes(dataUrl) {
  const comma = String(dataUrl || '').indexOf(',')
  if (comma < 0) return null
  try {
    const bin = atob(dataUrl.slice(comma + 1))
    const bytes = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
    return bytes
  } catch {
    return null
  }
}

// data:image/png;base64,... → 'png' | 'jpg' (docx ImageRun `type`).
export function dataUrlImageType(dataUrl) {
  return /^data:image\/png/i.test(dataUrl || '') ? 'png' : 'jpg'
}
