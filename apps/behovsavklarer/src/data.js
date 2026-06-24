export const EMPTY_BRIEF = {
  // Essensiell logistikk (left)
  rolle: '',
  antallKonsulenter: '',
  stillingsprosent: '',
  oppstartsdato: '',
  varighet: '',
  arbeidslokasjon: '',
  onsiteRemote: 'Hybrid',
  hybridDetaljer: '',
  soknadsfrist: '',
  senioritet: '',
  spraakkrav: '',
  budsjett: '',
  leveransefristCver: '',

  // Kjernen (center)
  kjernenIBehovet: '',
  hvaUtlosteBehovet: '',
  companyId: null,
  kundebeskrivelse: '',
  prosjektbeskrivelse: '',
  teambeskrivelse: '',
  arbeidsoppgaver: '',
  maHa: [],
  fintAHa: [],
  personligeEgenskaper: '',

  // Praktisk nyttig info (right)
  webUrl: '',
  tilbudsformat: '',
  prosessenVidere: '',
  andreLeverandorer: '',
  andreKandidater: '',
  annet: '',
  generelleNotater: '',
  sellingPoints: '',
}

const TILBUDSFORMAT_NO = 'E-postformat med praktisk info + spisset CV, evt. med kompetanseskjema'
const TILBUDSFORMAT_EN = 'Email format with practical info + tailored CV, optionally with competency form'

export function makeEmptyBrief() {
  const lang = localStorage.getItem('lang') || 'no'
  return {
    ...EMPTY_BRIEF,
    tilbudsformat: lang === 'en' ? TILBUDSFORMAT_EN : TILBUDSFORMAT_NO,
  }
}

export const ONSITE_OPTIONS = ['Onsite', 'Remote', 'Hybrid']

export const SENIORITY_OPTIONS = ['Junior', 'Medium', 'Senior', 'Spesialist']
