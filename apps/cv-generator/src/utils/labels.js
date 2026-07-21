export const L = {
  en: {
    // ── Section headings ──────────────────────────────────────────
    experience:     'Project Experience',
    education:      'Education',
    skills:         'Skills',
    certifications: 'Certifications',
    languages:      'Languages',
    competences:    'Key Competences',
    summary:        'Summary',

    // ── Experience field labels ───────────────────────────────────
    role:           'Role(s)',
    projectDesc:    'Project description',
    tasks:          'Tasks and responsibilities',
    technologies:   'Technologies used',
    methodologies:  'Methodologies, technologies and competences',
    result:         'Result',

    // ── Personal meta ─────────────────────────────────────────────
    birthYear:        'Born',
    address:          'Address',
    educationSummary: 'Education',
    itSince:          'IT experience since',
    phone:            'Phone',
    email:            'Email',
    linkedin:         'LinkedIn',
    availableFrom:    'Available from',
    workPreference:   'Work preference',
    hideContact:      'Include contact info in exports',

    // ── Competence table ──────────────────────────────────────────
    competencesFor:      'Relevant competences for',
    forProject:          'for',
    includedInExports:   '✓ Included in exports',
    addToExports:        '+ Add to exports',
    levelLabel:          'Level',
    levelExpert:         'Expert',
    lastUsed:            'Last used',
    totalYears:          'Total years',
    projects:            'Projects',
    addCompetence:       '+ Add competence',
    competenceEmpty:     'Add one card per competence requirement.',

    // ── Buttons ───────────────────────────────────────────────────
    remove:              'Remove',
    addProject:          '+ Add project',
    addEducation:        '+ Add education',
    addCertification:    '+ Add certification',
    certsCourses:        'Certifications & Courses',
    courses:             'Courses',
    addCourse:           '+ Add course',
    institution:         'Institution',
    positions:           'List of Positions',
    addPosition:         '+ Add position',
    positionTitle:       'Title / Role',
    positionDesc:        'Description',
    positionTech:        'Technologies, methods and competences used',
    enablePositions:     'Include list of positions',
    useProjectFormat:    'Full project format',
    addSkillGroup:       '+ Add skill group',
    addLanguageBtn:      '+ Add',
    managementBadge:     'Management',
  },

  no: {
    // ── Section headings ──────────────────────────────────────────
    experience:     'Prosjekterfaring',
    education:      'Utdanning',
    skills:         'Kompetanse',
    certifications: 'Sertifiseringer',
    languages:      'Språkkunnskap',
    competences:    'Spesifikk kompetansematch',
    summary:        'Oppsummering',

    // ── Experience field labels ───────────────────────────────────
    role:           'Rolle(r)',
    projectDesc:    'Beskrivelse av prosjektet',
    tasks:          'Konsulentens oppgaver og ansvar i prosjektet',
    technologies:   'Benyttede teknologier',
    methodologies:  'Benyttede metodikker, teknologier og kompetanser',
    result:         'Resultat',

    // ── Personal meta ─────────────────────────────────────────────
    birthYear:        'Fødselsår',
    address:          'Adresse',
    educationSummary: 'Utdanning',
    itSince:          'IT-erfaring siden',
    phone:            'Telefon',
    email:            'E-post',
    linkedin:         'LinkedIn',
    availableFrom:    'Ledig fra',
    workPreference:   'Arbeidspreferanse',
    hideContact:      'Inkluder kontaktinfo i eksport',

    // ── Competence table ──────────────────────────────────────────
    competencesFor:      'Relevante kompetanser for',
    forProject:          'for',
    includedInExports:   '✓ Inkludert i dokumentet',
    addToExports:        '+ Legg til i dokumentet',
    levelLabel:          'Nivå',
    levelExpert:         'Ekspert',
    lastUsed:            'Sist brukt',
    totalYears:          'Totalt år',
    projects:            'Prosjekter',
    addCompetence:       '+ Legg til kompetanse',
    competenceEmpty:     'Legg til ett kort per kompetansekrav.',

    // ── Buttons ───────────────────────────────────────────────────
    remove:              'Fjern',
    addProject:          '+ Legg til prosjekt',
    addEducation:        '+ Legg til utdanning',
    addCertification:    '+ Legg til sertifisering',
    certsCourses:        'Sertifiseringer & kurs',
    courses:             'Kurs',
    addCourse:           '+ Legg til kurs',
    institution:         'Institusjon',
    positions:           'Stillingsoversikt',
    addPosition:         '+ Legg til stilling',
    positionTitle:       'Tittel / Rolle',
    positionDesc:        'Beskrivelse',
    positionTech:        'Teknologier, metoder og kompetanser brukt',
    enablePositions:     'Inkluder stillingsoversikt',
    useProjectFormat:    'Fullt prosjektformat',
    addSkillGroup:       '+ Legg til kompetansegruppe',
    addLanguageBtn:      '+ Legg til',
    managementBadge:     'Ledelse',
  },
}

export function getL(lang) {
  return L[lang] || L.en
}
