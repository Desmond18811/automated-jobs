import type { Page, Frame } from 'playwright';
import type { Profile, Settings, CvInfo, Flag } from '../types.js';
import { extractFields, type FormField, type FieldOption } from './fields.js';
import { answerFields } from '../ai.js';

export async function fillForm(ctx: {
  page: Page;
  frame: Frame;
  profile: Profile;
  settings: Settings;
  cv: CvInfo;
  source: string;
  onProgress?: (m: string) => void;
}): Promise<{ filled: number; flagged: Flag[] }> {
  let filledCount = 0;
  const flags: Flag[] = [];
  const seenIds = new Set<string>();

  for (let pass = 0; pass < 2; pass++) {
    const allFields = await extractFields(ctx.frame);
    const newFields = allFields.filter((f) => !seenIds.has(f.id));

    if (newFields.length === 0) {
      break;
    }

    for (const f of newFields) {
      seenIds.add(f.id);
    }

    const fileInputs = newFields.filter((f) => f.type === 'file');
    const aiFields: FormField[] = [];

    // Plan each field
    for (const field of newFields) {
      // 1. File inputs
      if (field.type === 'file') {
        const lowerLabel = field.label.toLowerCase();
        if (/cover/i.test(lowerLabel)) {
          if (field.required) {
            flags.push({
              label: field.label,
              reason: 'Asks for a cover letter file',
              required: true
            });
          }
          continue;
        }

        const isCvMatch =
          /resume|résumé|\bcv\b|curriculum/i.test(lowerLabel) ||
          fileInputs.length === 1;

        if (isCvMatch) {
          try {
            const loc = ctx.frame.locator(`[data-ja-id="${field.id}"]`);
            await loc.setInputFiles(ctx.cv.path);
            filledCount++;
            await new Promise((r) => setTimeout(r, 2500));
            await randomPaceDelay();
          } catch {
            flags.push({
              label: field.label,
              reason: "Couldn't fill this automatically",
              required: field.required
            });
          }
          continue;
        }

        if (field.required) {
          flags.push({
            label: field.label,
            reason: 'Asks for a file other than your CV',
            required: true
          });
        }
        continue;
      }

      // 2. Single consent checkbox
      if (field.type === 'checkbox') {
        const fullContext = `${field.label} ${field.context || ''}`.toLowerCase();
        const isConsent =
          /privacy|consent|terms|agree|acknowledg|gdpr|data protection|personal data|processing of/i.test(
            fullContext
          );

        if (isConsent) {
          if (ctx.settings.allowConsentBoxes) {
            try {
              const loc = ctx.frame.locator(`[data-ja-id="${field.id}"]`);
              await loc
                .check({ force: true, timeout: 3000 })
                .catch(async () => {
                  await loc.dispatchEvent('click');
                });
              filledCount++;
              await randomPaceDelay();
            } catch {
              flags.push({
                label: field.label,
                reason: "Couldn't fill this automatically",
                required: field.required
              });
            }
          } else {
            if (field.required) {
              flags.push({
                label: field.label,
                reason: 'Consent box: tick it if you agree',
                required: true
              });
            }
          }
          continue;
        }
      }

      // 3. Profile rules for text, email, tel, url, combobox
      if (
        ['text', 'email', 'tel', 'url', 'combobox'].includes(field.type)
      ) {
        const rule = matchProfileRule(field, ctx.profile);
        if (rule.matched) {
          if (!rule.value) {
            if (field.required) {
              flags.push({
                label: field.label,
                reason: `Add your ${rule.missingThing || 'details'} to your profile`,
                required: true
              });
            }
          } else {
            try {
              if (field.type === 'combobox') {
                await fillCombobox(ctx.frame, field.id, rule.value);
              } else {
                const loc = ctx.frame.locator(`[data-ja-id="${field.id}"]`);
                await loc.fill(rule.value);
              }
              filledCount++;
              await randomPaceDelay();
            } catch {
              flags.push({
                label: field.label,
                reason: "Couldn't fill this automatically",
                required: field.required
              });
            }
          }
          continue;
        }
      }

      // 4. Already-filled fields (not selects)
      if (field.filled && field.type !== 'select') {
        continue;
      }

      // 5. Everything else: AI
      aiFields.push(field);
    }

    // Process AI fields
    if (aiFields.length > 0) {
      // Comboboxes without options: click to discover options
      for (const field of aiFields) {
        if (
          field.type === 'combobox' &&
          (!field.options || field.options.length === 0)
        ) {
          try {
            const loc = ctx.frame.locator(`[data-ja-id="${field.id}"]`);
            await loc.click({ timeout: 2000 }).catch(() => {});
            await new Promise((r) => setTimeout(r, 500));
            const optTexts = (await ctx.frame.evaluate(`
              (() => {
                const els = Array.from(document.querySelectorAll('[role="option"]'));
                const visible = els.filter(function(el) {
                  const s = window.getComputedStyle(el);
                  if (s.display === 'none' || s.visibility === 'hidden') return false;
                  const r = el.getBoundingClientRect();
                  return r.width > 0 && r.height > 0;
                });
                return visible.map(function(el) { return (el.innerText || el.textContent || '').trim(); }).filter(Boolean);
              })()
            `)) as string[];

            await ctx.page.keyboard.press('Escape').catch(() => {});

            if (optTexts.length > 0 && optTexts.length <= 300) {
              field.options = optTexts.map((t) => ({ label: t, value: t }));
            }
          } catch {}
        }
      }

      ctx.onProgress?.(
        `Answering ${aiFields.length} questions from your profile and CV…`
      );

      // Collect job text from main frame and form frame
      let mainText = '';
      let formText = '';
      try {
        mainText = (await ctx.page.evaluate(
          '(() => document.body ? document.body.innerText || "" : "")()'
        )) as string;
        if (ctx.frame !== ctx.page.mainFrame()) {
          formText = (await ctx.frame.evaluate(
            '(() => document.body ? document.body.innerText || "" : "")()'
          )) as string;
        }
      } catch {}

      const jobText = (mainText + (formText ? `\n\n${formText}` : '')).slice(
        0,
        12_000
      );

      let answers: Array<{
        id: string;
        value: string | string[] | boolean | null;
        needsHuman?: boolean;
        reason?: string;
      }> = [];

      try {
        answers = await answerFields({
          fields: aiFields,
          profile: ctx.profile,
          cvText: ctx.cv.text,
          jobText,
          source: ctx.source
        });
      } catch (err: any) {
        for (const f of aiFields) {
          if (f.required) {
            flags.push({
              label: f.label,
              reason: `Not answered: ${err?.message || err}`,
              required: true
            });
          }
        }
        continue;
      }

      for (const ans of answers) {
        const field = aiFields.find((f) => f.id === ans.id);
        if (!field) continue;

        const isEmpty =
          ans.value === null ||
          ans.value === '' ||
          (Array.isArray(ans.value) && ans.value.length === 0);

        if (ans.needsHuman || isEmpty) {
          if (field.required || ans.needsHuman) {
            flags.push({
              label: field.label,
              reason: ans.reason || (ans.needsHuman ? 'Needs your input' : 'Not answered'),
              required: field.required
            });
          }
          continue;
        }

        // Checkbox answered false: leave unticked
        if (
          field.type === 'checkbox' &&
          (ans.value === false || ans.value === 'false')
        ) {
          continue;
        }

        // Fill field
        try {
          if (field.type === 'select') {
            const strVal = String(ans.value);
            const opt = matchOption(field.options || [], strVal);
            if (opt) {
              const loc = ctx.frame.locator(`[data-ja-id="${field.id}"]`);
              await loc.selectOption(opt.value);
              filledCount++;
            } else {
              flags.push({
                label: field.label,
                reason: `Couldn't select "${strVal}"`,
                required: field.required
              });
            }
          } else if (field.type === 'radio' || field.type === 'checkboxes') {
            const vals = Array.isArray(ans.value)
              ? ans.value.map(String)
              : [String(ans.value)];

            for (const val of vals) {
              const opt = matchOption(field.options || [], val);
              if (opt && opt.key) {
                const optLoc = ctx.frame.locator(`[data-ja-id="${opt.key}"]`);
                await optLoc
                  .check({ force: true, timeout: 3000 })
                  .catch(async () => {
                    await optLoc.dispatchEvent('click');
                  });
                filledCount++;
              } else {
                flags.push({
                  label: field.label,
                  reason: `Couldn't select "${val}"`,
                  required: field.required
                });
              }
            }
          } else if (field.type === 'checkbox') {
            const shouldCheck =
              ans.value === true ||
              ans.value === 'true' ||
              ans.value === 'yes';
            if (shouldCheck) {
              const loc = ctx.frame.locator(`[data-ja-id="${field.id}"]`);
              await loc
                .check({ force: true, timeout: 3000 })
                .catch(async () => {
                  await loc.dispatchEvent('click');
                });
              filledCount++;
            }
          } else if (field.type === 'combobox') {
            await fillCombobox(ctx.frame, field.id, String(ans.value));
            filledCount++;
          } else {
            const loc = ctx.frame.locator(`[data-ja-id="${field.id}"]`);
            await loc.fill(String(ans.value));
            filledCount++;
          }

          await randomPaceDelay();
        } catch {
          flags.push({
            label: field.label,
            reason: "Couldn't fill this automatically",
            required: field.required
          });
        }
      }
    }
  }

  return { filled: filledCount, flagged: flags };
}

function matchProfileRule(
  field: FormField,
  profile: Profile
): { matched: boolean; value: string; missingThing?: string } {
  const label = field.label || '';
  const auto = (field.autocomplete || '').toLowerCase();
  const type = field.type;

  // Specific referral question
  if (/\b(referred by|who referred you|referral source)\b/i.test(label)) {
    return {
      matched: true,
      value: profile.referredBy || '',
      missingThing: 'referred by'
    };
  }

  // Specific current employer/company
  if (/\b(current|present)\s*(company|employer)\b/i.test(label)) {
    return {
      matched: true,
      value: profile.currentCompany || '',
      missingThing: 'current company'
    };
  }

  if (
    /\breferr|\breferen|\breferee|emergency|manager|supervisor|recruiter|company name|employer/i.test(
      label
    )
  ) {
    return { matched: false, value: '' };
  }

  // 1. First name
  if (
    /\b(first|given)\s*name\b|forename/i.test(label) ||
    auto === 'given-name'
  ) {
    return {
      matched: true,
      value: profile.firstName || '',
      missingThing: 'first name'
    };
  }

  // 2. Last name
  if (
    /\b(last|family)\s*name\b|surname/i.test(label) ||
    auto === 'family-name'
  ) {
    return {
      matched: true,
      value: profile.lastName || '',
      missingThing: 'last name'
    };
  }

  // 3. Full name
  if (/^(your |full |legal )?name$/i.test(label) || auto === 'name') {
    const val = [profile.firstName, profile.lastName].filter(Boolean).join(' ');
    return {
      matched: true,
      value: val,
      missingThing: 'name'
    };
  }

  // 4. Email
  if (/e-?mail/i.test(label) || auto === 'email' || type === 'email') {
    return {
      matched: true,
      value: profile.email || '',
      missingThing: 'email'
    };
  }

  // 5. Phone
  if (
    /phone|mobile|telephone|whatsapp/i.test(label) ||
    auto === 'tel' ||
    type === 'tel'
  ) {
    return {
      matched: true,
      value: profile.phone || '',
      missingThing: 'phone'
    };
  }

  // 6. LinkedIn
  if (/linked\s*in/i.test(label)) {
    return {
      matched: true,
      value: profile.linkedin || '',
      missingThing: 'LinkedIn profile'
    };
  }

  // 7. GitHub
  if (/git\s*hub/i.test(label)) {
    return {
      matched: true,
      value: profile.github || '',
      missingThing: 'GitHub profile'
    };
  }

  // Twitter / X
  if (/\b(twitter|x\s*profile|twitter\s*handle)\b/i.test(label)) {
    return {
      matched: true,
      value: profile.twitter || '',
      missingThing: 'Twitter profile'
    };
  }

  // Portfolio
  if (/\bportfolio\b/i.test(label)) {
    return {
      matched: true,
      value: profile.portfolio || profile.website || '',
      missingThing: 'portfolio'
    };
  }

  // 8. Website
  if (/website|personal (site|url)/i.test(label)) {
    return {
      matched: true,
      value: profile.website || profile.portfolio || '',
      missingThing: 'website'
    };
  }

  // Street address
  if (
    /\b(street\s*address|address\s*line\s*1|street)\b/i.test(label) ||
    auto === 'street-address' ||
    auto === 'address-line1'
  ) {
    return {
      matched: true,
      value: profile.streetAddress || '',
      missingThing: 'street address'
    };
  }

  // State / Province
  if (
    /\b(state|province|region)\b/i.test(label) ||
    auto === 'address-level1'
  ) {
    return {
      matched: true,
      value: profile.stateProvince || '',
      missingThing: 'state / province'
    };
  }

  // Postal code / Zip
  if (
    /\b(postal\s*code|zip\s*code|postcode|zip)\b/i.test(label) ||
    auto === 'postal-code'
  ) {
    return {
      matched: true,
      value: profile.postalCode || '',
      missingThing: 'postal code'
    };
  }

  // City (standalone)
  if (
    /^(your )?city$/i.test(label) ||
    auto === 'address-level2'
  ) {
    return {
      matched: true,
      value: profile.city || '',
      missingThing: 'city'
    };
  }

  // Country (standalone)
  if (
    /^(your )?country$/i.test(label) ||
    auto === 'country-name' ||
    auto === 'country'
  ) {
    return {
      matched: true,
      value: profile.country || '',
      missingThing: 'country'
    };
  }

  // 9. Location (city, country combination)
  if (
    /^(current )?(location|city)( of residence)?$|where are you (currently )?(based|located)/i.test(
      label
    )
  ) {
    const loc = [profile.city, profile.country].filter(Boolean).join(', ');
    return {
      matched: true,
      value: loc,
      missingThing: 'location'
    };
  }

  // Start Date
  if (
    /\b(start\s*date|earliest\s*start|available\s*(start\s*)?date|when\s*can\s*you\s*start)\b/i.test(
      label
    )
  ) {
    return {
      matched: true,
      value: profile.startDate || '',
      missingThing: 'start date'
    };
  }

  // Pronouns
  if (/\b(pronouns|preferred\s*pronouns)\b/i.test(label)) {
    return {
      matched: true,
      value: profile.pronouns || '',
      missingThing: 'pronouns'
    };
  }

  // School / University
  if (/\b(university|college|school|institution)\b/i.test(label)) {
    return {
      matched: true,
      value: profile.school || '',
      missingThing: 'school / university'
    };
  }

  // Degree / Highest Education
  if (
    /\b(highest\s*(degree|education)|degree\s*level|education\s*level)\b/i.test(
      label
    )
  ) {
    return {
      matched: true,
      value: profile.highestDegree || '',
      missingThing: 'highest degree'
    };
  }

  // Field of Study / Major
  if (/\b(field\s*of\s*study|major|degree\s*subject)\b/i.test(label)) {
    return {
      matched: true,
      value: profile.fieldOfStudy || '',
      missingThing: 'field of study'
    };
  }

  // Graduation Year
  if (/\b(graduat(ion|ed)\s*year|year\s*of\s*graduation)\b/i.test(label)) {
    return {
      matched: true,
      value: profile.graduationYear || '',
      missingThing: 'graduation year'
    };
  }

  // Skills
  if (/\b(skills|key\s*skills|technologies)\b/i.test(label)) {
    return {
      matched: true,
      value: profile.skills || '',
      missingThing: 'skills'
    };
  }

  return { matched: false, value: '' };
}

function cleanOptionText(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function matchOption(
  options: FieldOption[],
  target: string
): FieldOption | null {
  if (!options || options.length === 0) return null;
  const targetClean = cleanOptionText(target);
  if (!targetClean) return null;

  // 1. exact label
  for (const opt of options) {
    if (cleanOptionText(opt.label) === targetClean) return opt;
  }
  // 2. exact value
  for (const opt of options) {
    if (cleanOptionText(opt.value) === targetClean) return opt;
  }
  // 3. prefix either way
  for (const opt of options) {
    const l = cleanOptionText(opt.label);
    const v = cleanOptionText(opt.value);
    if (l.startsWith(targetClean) || targetClean.startsWith(l)) return opt;
    if (v.startsWith(targetClean) || targetClean.startsWith(v)) return opt;
  }
  // 4. substring
  for (const opt of options) {
    const l = cleanOptionText(opt.label);
    if (l.includes(targetClean) || targetClean.includes(l)) return opt;
  }
  return null;
}

async function fillCombobox(
  frame: Frame,
  fieldId: string,
  val: string
): Promise<void> {
  const loc = frame.locator(`[data-ja-id="${fieldId}"]`);
  await loc.click({ timeout: 2000 }).catch(() => {});
  await loc.fill(val).catch(() => {});
  await new Promise((r) => setTimeout(r, 900));

  const clicked = (await frame
    .evaluate((targetVal: string) => {
      const els = Array.from(document.querySelectorAll('[role="option"]'));
      const visible = els.filter((el) => {
        const s = window.getComputedStyle(el);
        if (s.display === 'none' || s.visibility === 'hidden') return false;
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0;
      });

      if (visible.length === 0) return false;

      const tClean = targetVal
        .toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      let match = visible.find((el) => {
        const text = ((el as HTMLElement).innerText || el.textContent || '')
          .toLowerCase()
          .replace(/[^\w\s]/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
        return text === tClean;
      });

      if (!match) {
        match = visible.find((el) => {
          const text = ((el as HTMLElement).innerText || el.textContent || '')
            .toLowerCase()
            .replace(/[^\w\s]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
          return text.includes(tClean) || tClean.includes(text);
        });
      }

      if (!match) {
        match = visible[0];
      }

      if (match) {
        (match as HTMLElement).click();
        return true;
      }
      return false;
    }, val)
    .catch(() => false)) as boolean;

  if (!clicked) {
    await frame.page().keyboard.press('Enter').catch(() => {});
  }
}

async function randomPaceDelay(): Promise<void> {
  const ms = Math.floor(Math.random() * (500 - 150 + 1)) + 150;
  await new Promise((r) => setTimeout(r, ms));
}
