export const emptyCvData = {
  cvType: 'technical',   // 'technical' | 'management'

  personal: {
    firstName: '',
    lastName: '',
    title: '',
    location: '',
    educationSummary: '',
    itExperienceSince: '',
    phone: '',
    email: '',
    linkedin: '',
    availableFrom: '',
    workPreference: '',
    showContactInfo: true,
    birthYear: '',
    summary: '',
  },

  experience: [
    // {
    //   company: '',
    //   role: '',
    //   startDate: '',
    //   endDate: '',
    //   location: '',
    //   description: '',    // project description
    //   bullets: [''],      // tasks and responsibilities
    //   technologies: '',   // technical CV: technologies used
    //   methodologies: '',  // management CV: methodologies/tech/competences
    //   result: '',         // management CV: result
    // }
  ],

  education: [
    // { institution: '', degree: '', field: '', startDate: '', endDate: '' }
  ],

  skills: [
    // { category: '', items: [] }
  ],

  languages: [
    // { language: '', proficiency: '' }
  ],

  certifications: [
    // { name: '', issuer: '', year: '' }
  ],

  courses: [
    // { name: '', institution: '', year: '' }
  ],

  positions: {
    enabled: false,
    useProjectFormat: false,
    items: [
      // {
      //   company: '',
      //   startDate: '',
      //   endDate: '',
      //   title: '',       // job title / role
      //   description: '', // brief description
      //   bullets: [''],        // used in project format
      //   technologies: '',     // used in project format
      //   methodologies: '',    // methods and competences used (project format)
      // }
    ],
  },

  videoProfile: {
    enabled: false,
    title: 'Professional Introduction',
    description: '',
    videoUrl: '',
    thumbnailUrl: '',
    duration: '',
  },

  projectVideoProfile: {
    enabled: false,
    projectName: '',
    title: '',
    description: '',
    videoUrl: '',
    thumbnailUrl: '',
    duration: '',
  },

  competences: {
    enabled: false,
    projectLabel: '',
    items: [
      // {
      //   requirement: '',   // competence name
      //   level: '',         // 1–5 (5 = expert)
      //   lastUsed: '',      // year, e.g. "2025"
      //   yearsRelevant: '', // total years
      //   projects: '',      // comma-separated project names
      //   detail: '',        // evidence paragraph
      // }
    ],
  },
}
