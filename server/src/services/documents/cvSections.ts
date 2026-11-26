export type SectionKey =
  | 'contact'
  | 'summary'
  | 'experience'
  | 'education'
  | 'skills'
  | 'projects'
  | 'certifications'
  | 'languages'
  | 'ignored';

/** One table of header synonyms, shared by every section parser. */
const SYNONYMS: Record<SectionKey, string[]> = {
  contact: ['contact', 'contact details', 'contact information', 'contacts', 'links', 'social', 'find me online'],
  summary: ['summary', 'professional summary', 'executive summary', 'career summary', 'profile', 'professional profile', 'personal profile', 'profile summary', 'about', 'about me', 'objective', 'career objective', 'personal statement'],
  experience: ['experience', 'work experience', 'professional experience', 'employment', 'employment history', 'work history', 'career history', 'relevant experience', 'professional background', 'work', 'internships', 'internship experience'],
  education: ['education', 'academic background', 'education and training', 'education & training', 'qualifications', 'academic qualifications', 'education & qualifications', 'education and qualifications', 'academic history'],
  skills: ['skills', 'technical skills', 'key skills', 'core skills', 'core competencies', 'competencies', 'skills & tools', 'skills and tools', 'tools & technologies', 'tools and technologies', 'technologies', 'expertise', 'areas of expertise', 'skills & expertise', 'skills and expertise', 'professional skills', 'soft skills', 'hard skills'],
  projects: ['projects', 'key projects', 'personal projects', 'selected projects', 'project experience', 'side projects', 'portfolio projects'],
  certifications: ['certifications', 'certificates', 'certification', 'licenses & certifications', 'licenses and certifications', 'licences & certifications', 'credentials', 'courses', 'courses & certifications', 'training', 'professional development', 'training & certifications'],
  languages: ['languages', 'language skills', 'spoken languages'],
  ignored: ['interests', 'hobbies', 'hobbies & interests', 'volunteering', 'volunteer experience', 'volunteer work', 'references', 'referees', 'awards', 'honors', 'honours', 'awards & honors', 'achievements', 'publications', 'declaration', 'personal details', 'personal information', 'extracurricular activities', 'activities'],
};

const LOOKUP = new Map<string, SectionKey>();
for (const [key, words] of Object.entries(SYNONYMS) as [SectionKey, string[]][]) for (const w of words) LOOKUP.set(w, key);

/** Returns the section a line introduces, or null if it is just content. */
export function sectionOf(line: string): SectionKey | null {
  const raw = line.trim();
  if (!raw || raw.length > 48 || /^[•\-*▪●◦]/.test(raw) || /[.!?]$/.test(raw)) return null;
  const norm = raw
    .toLowerCase()
    .replace(/[:|_—–\-/]+$/g, '')
    .replace(/^[:|_—–\-/•\s]+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return LOOKUP.get(norm) ?? null;
}

export const isSectionHeader = (line: string): boolean => sectionOf(line) !== null;

export interface Sectioned {
  /** Lines before the first header: normally name, headline and contact details. */
  top: string[];
  sections: Partial<Record<SectionKey, string[]>>;
}

/**
 * Split CV lines into sections once, so every parser reads only its own slice and an unfamiliar
 * header such as "Interests" can never be swallowed by the section above it.
 */
export function splitSections(lines: string[]): Sectioned {
  const top: string[] = [];
  const sections: Sectioned['sections'] = {};
  let current: SectionKey | null = null;
  for (const line of lines) {
    const key = sectionOf(line);
    if (key) {
      current = key;
      sections[key] ??= [];
      continue;
    }
    (current ? sections[current]! : top).push(line);
  }
  return { top, sections };
}
