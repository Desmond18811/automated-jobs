/**
 * JSON schemas for every AI call, plus a small validator (no dependency).
 *
 * The same schema is used three ways:
 *  - Anthropic: as the input_schema of a forced tool call (the reply IS the tool input)
 *  - OpenRouter: as response_format json_schema with strict: true
 *  - Every provider: to validate the reply; one retry with the errors if it fails
 *
 * Schemas follow the "strict" rules OpenAI-style providers need:
 * every property listed in required, additionalProperties: false,
 * optional values expressed as nullable types.
 */

export type JsonType = 'object' | 'array' | 'string' | 'number' | 'integer' | 'boolean' | 'null';

export interface JsonSchema {
  type?: JsonType | JsonType[];
  description?: string;
  properties?: Record<string, JsonSchema>;
  required?: string[];
  additionalProperties?: boolean;
  items?: JsonSchema;
  enum?: Array<string | number | boolean | null>;
  anyOf?: JsonSchema[];
}

const str = (description?: string): JsonSchema => ({ type: 'string', ...(description ? { description } : {}) });
const nstr = (description?: string): JsonSchema => ({ type: ['string', 'null'], ...(description ? { description } : {}) });
const obj = (properties: Record<string, JsonSchema>): JsonSchema => ({
  type: 'object',
  properties,
  required: Object.keys(properties),
  additionalProperties: false
});

export const ANSWERS_SCHEMA: JsonSchema = obj({
  answers: {
    type: 'array',
    items: obj({
      id: str('The field id exactly as given'),
      value: {
        anyOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }, { type: 'boolean' }, { type: 'null' }],
        description: 'The answer; null when it cannot be answered from the facts'
      },
      needsHuman: { type: 'boolean' },
      reason: str('Short reason when needsHuman is true, else empty')
    })
  }
});

export const POSTINGS_SCHEMA: JsonSchema = obj({
  postings: {
    type: 'array',
    items: obj({
      title: nstr(),
      company: nstr(),
      location: nstr(),
      deadline: nstr(),
      applyUrl: nstr('Copied exactly from the input, never constructed'),
      applyEmail: nstr('Copied exactly from the input, never constructed'),
      subjectInstruction: nstr('The exact email subject the advert asks for'),
      howToApply: nstr('One sentence'),
      summary: nstr('The advert\'s own duties and requirements, at most 120 words')
    })
  }
});

export const LINKS_SCHEMA: JsonSchema = obj({
  links: {
    type: 'array',
    items: obj({ i: { type: 'integer' }, isJob: { type: 'boolean' }, reason: str() })
  }
});

export const EMAIL_SCHEMA: JsonSchema = obj({
  subject: str(),
  body: str(),
  missing: { type: 'array', items: { type: 'string' } }
});

/**
 * Only facts a CV actually states. Deliberately NO eligibility or demographic
 * fields (work authorization, sponsorship, relocation, gender, race, disability,
 * veteran status, pronouns): those must come from the candidate, never a guess.
 */
export const PROFILE_SCHEMA: JsonSchema = obj({
  firstName: nstr(),
  lastName: nstr(),
  email: nstr(),
  phone: nstr(),
  streetAddress: nstr(),
  city: nstr(),
  stateProvince: nstr(),
  postalCode: nstr(),
  country: nstr(),
  linkedin: nstr(),
  github: nstr(),
  twitter: nstr(),
  portfolio: nstr(),
  website: nstr(),
  currentTitle: nstr(),
  currentCompany: nstr(),
  yearsExperience: {
    type: ['number', 'null'],
    description: 'Total years of professional experience computed from dates in the CV; null if the dates are not there'
  },
  skills: nstr('Comma-separated, only skills the CV lists'),
  highestDegree: nstr(),
  school: nstr(),
  fieldOfStudy: nstr(),
  graduationYear: nstr(),
  languages: nstr('Only languages the CV lists')
});

export const NEXT_STEP_SCHEMA: JsonSchema = obj({
  action: { type: 'string', enum: ['click', 'done', 'human', 'stuck'] },
  role: { type: ['string', 'null'], enum: ['button', 'link', 'tab', 'menuitem', 'radio', 'checkbox', 'option', null] },
  name: nstr('The exact accessible name from the tree'),
  reason: str()
});

// ---------- validator ----------

function typeOf(v: unknown): JsonType {
  if (v === null) return 'null';
  if (Array.isArray(v)) return 'array';
  if (typeof v === 'number') return Number.isInteger(v) ? 'integer' : 'number';
  return typeof v as JsonType;
}

function typeMatches(expected: JsonType, actual: JsonType): boolean {
  return expected === actual || (expected === 'number' && actual === 'integer');
}

/** Returns a list of problems; empty means valid. Stops after 20 problems. */
export function validate(schema: JsonSchema, value: unknown, path = '$', errors: string[] = []): string[] {
  if (errors.length >= 20) return errors;

  if (schema.anyOf) {
    const ok = schema.anyOf.some((s) => validate(s, value, path, []).length === 0);
    if (!ok) errors.push(`${path}: doesn't match any allowed type`);
    return errors;
  }

  const actual = typeOf(value);
  if (schema.type) {
    const allowed = Array.isArray(schema.type) ? schema.type : [schema.type];
    if (!allowed.some((t) => typeMatches(t, actual))) {
      errors.push(`${path}: expected ${allowed.join(' or ')}, got ${actual}`);
      return errors;
    }
  }

  if (schema.enum && !schema.enum.includes(value as any)) {
    errors.push(`${path}: must be one of ${schema.enum.map((e) => JSON.stringify(e)).join(', ')}`);
  }

  if (actual === 'object' && schema.properties) {
    const o = value as Record<string, unknown>;
    for (const key of schema.required || []) {
      if (!(key in o)) errors.push(`${path}.${key}: missing`);
    }
    for (const [key, sub] of Object.entries(schema.properties)) {
      if (key in o) validate(sub, o[key], `${path}.${key}`, errors);
    }
    if (schema.additionalProperties === false) {
      for (const key of Object.keys(o)) {
        if (!schema.properties[key]) errors.push(`${path}.${key}: not allowed`);
      }
    }
  }

  if (actual === 'array' && schema.items) {
    (value as unknown[]).forEach((item, i) => validate(schema.items!, item, `${path}[${i}]`, errors));
  }

  return errors;
}

/** Pull a JSON object out of a model's text reply (handles code fences and chatter). */
export function parseJsonText(text: string): unknown {
  const cleaned = text.replace(/```(?:json)?/gi, '');
  const first = cleaned.indexOf('{');
  const last = cleaned.lastIndexOf('}');
  if (first === -1 || last <= first) throw new Error('No JSON object found in the reply');
  return JSON.parse(cleaned.slice(first, last + 1));
}
