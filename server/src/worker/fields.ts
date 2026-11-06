import type { Page, Frame } from 'playwright';

export type FieldType =
  | 'text'
  | 'textarea'
  | 'email'
  | 'tel'
  | 'url'
  | 'number'
  | 'date'
  | 'select'
  | 'radio'
  | 'checkbox'
  | 'checkboxes'
  | 'combobox'
  | 'file';

export interface FieldOption {
  label: string;
  value: string;
  key?: string; // key = data-ja-id of that radio/checkbox input
}

export interface FormField {
  id: string;
  type: FieldType;
  label: string;
  required: boolean;
  filled: boolean;
  options?: FieldOption[];
  context?: string;
  placeholder?: string;
  autocomplete?: string;
}

export const EXTRACT_SCRIPT = String.raw`(() => {
  if (!window.__jaN) window.__jaN = 0;

  function isVisible(el) {
    if (!el || el.nodeType !== 1) return false;
    const style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden') return false;
    const rect = el.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) return true;
    const parent = el.parentElement;
    if (parent) {
      const pStyle = window.getComputedStyle(parent);
      if (pStyle.display === 'none' || pStyle.visibility === 'hidden') return false;
      const pRect = parent.getBoundingClientRect();
      if (pRect.width > 0 && pRect.height > 0) return true;
    }
    return false;
  }

  function getElementOwnLabel(el) {
    // 1. aria-labelledby
    const labelledby = el.getAttribute('aria-labelledby');
    if (labelledby) {
      const parts = labelledby
        .split(/\s+/)
        .map(function(id) {
          const target = document.getElementById(id);
          return target ? (target.innerText || target.textContent || '').trim() : '';
        })
        .filter(Boolean);
      if (parts.length > 0) return parts.join(' ');
    }

    // 2. <label for=id>
    if (el.id) {
      try {
        const forLabel = document.querySelector('label[for="' + CSS.escape(el.id) + '"]');
        if (forLabel) {
          const text = (forLabel.innerText || forLabel.textContent || '').trim();
          if (text) return text;
        }
      } catch (e) {}
    }

    // 3. Wrapping <label>
    const wrapping = el.closest('label');
    if (wrapping) {
      const clone = wrapping.cloneNode(true);
      const inputs = clone.querySelectorAll('input, select, textarea');
      inputs.forEach(function(i) { i.remove(); });
      const text = (clone.innerText || clone.textContent || '').trim();
      if (text) return text;
    }

    // 4. aria-label
    const ariaLabel = el.getAttribute('aria-label');
    if (ariaLabel && ariaLabel.trim()) return ariaLabel.trim();

    // 5. Nearest ancestor (up to 4 levels) that has any text (cap 200 chars)
    let p = el.parentElement;
    for (let i = 0; i < 4 && p && p !== document.body; i++) {
      const clone = p.cloneNode(true);
      const inputs = clone.querySelectorAll('input, select, textarea');
      inputs.forEach(function(inp) { inp.remove(); });
      const text = (clone.innerText || clone.textContent || '').replace(/\s+/g, ' ').trim();
      if (text && text.length > 0) {
        return text.slice(0, 200);
      }
      p = p.parentElement;
    }

    // 6. placeholder
    const placeholder = el.getAttribute('placeholder');
    if (placeholder && placeholder.trim()) return placeholder.trim();

    // 7. name
    const name = el.getAttribute('name');
    if (name && name.trim()) return name.trim();

    return '';
  }

  function cleanRequiredAndLabel(rawLabel, el) {
    let req = Boolean(el && (el.required || el.getAttribute('aria-required') === 'true'));
    const first120 = rawLabel.slice(0, 120);
    if (first120.includes('*') || /\(required\)/i.test(first120)) {
      req = true;
    }
    const clean = rawLabel.replace(/\*|\(required\)/gi, '').replace(/\s+/g, ' ').trim();
    return { required: req, label: clean };
  }

  const allElements = Array.from(document.querySelectorAll('input, textarea, select'));
  const results = [];
  const radioCheckboxGroups = new Map();

  for (const el of allElements) {
    if (el.disabled) continue;

    const tag = el.tagName.toUpperCase();
    const inputType = tag === 'INPUT' ? (el.getAttribute('type') || el.type || 'text').toLowerCase() : '';

    if (tag === 'INPUT') {
      if (['hidden', 'submit', 'button', 'reset', 'image', 'search', 'password'].includes(inputType)) {
        continue;
      }
    }

    // File inputs: included even when invisible
    const isFile = tag === 'INPUT' && inputType === 'file';
    if (!isFile) {
      if (el.readOnly) continue;
      if (!isVisible(el)) continue;
    }

    // Stamp data-ja-id
    let jaId = el.getAttribute('data-ja-id');
    if (!jaId) {
      window.__jaN++;
      jaId = 'f' + window.__jaN;
      el.setAttribute('data-ja-id', jaId);
    }

    // Group radios and checkboxes
    if (tag === 'INPUT' && (inputType === 'radio' || inputType === 'checkbox')) {
      const name = el.getAttribute('name') || jaId;
      const groupKey = inputType + '::' + name;
      if (!radioCheckboxGroups.has(groupKey)) {
        radioCheckboxGroups.set(groupKey, []);
      }
      const rawOwn = getElementOwnLabel(el);
      const cleaned = cleanRequiredAndLabel(rawOwn, el);
      radioCheckboxGroups.get(groupKey).push({
        el: el,
        jaId: jaId,
        type: inputType,
        name: name,
        ownLabel: cleaned.label || el.value || '',
        value: el.value || 'on',
        checked: Boolean(el.checked),
        required: cleaned.required
      });
      continue;
    }

    // Single fields
    const rawLabel = getElementOwnLabel(el);
    const cleaned = cleanRequiredAndLabel(rawLabel, el);
    const label = cleaned.label;
    const required = cleaned.required;
    const placeholder = el.getAttribute('placeholder') || undefined;
    const autocomplete = el.getAttribute('autocomplete') || undefined;

    if (tag === 'SELECT') {
      const options = [];
      const opts = Array.from(el.querySelectorAll('option'));
      for (let idx = 0; idx < opts.length; idx++) {
        const opt = opts[idx];
        const text = (opt.innerText || opt.textContent || '').trim();
        const val = opt.value;
        if (idx === 0) {
          const lower = text.toLowerCase();
          if (val === '' || lower.startsWith('select') || lower.startsWith('choose') || lower.startsWith('please') || lower.startsWith('--')) {
            continue;
          }
        }
        if (val === '' && (text === '' || text.toLowerCase().startsWith('select') || text.toLowerCase().startsWith('choose'))) {
          continue;
        }
        options.push({ label: text, value: val });
      }

      results.push({
        id: jaId,
        type: 'select',
        label: label,
        required: required,
        filled: false,
        options: options,
        placeholder: placeholder,
        autocomplete: autocomplete
      });
      continue;
    }

    const role = (el.getAttribute('role') || '').toLowerCase();
    const ariaAuto = (el.getAttribute('aria-autocomplete') || '').toLowerCase();

    if (role === 'combobox' || ariaAuto === 'list' || ariaAuto === 'both') {
      const filled = Boolean(el.value && el.value.trim().length > 0);
      results.push({
        id: jaId,
        type: 'combobox',
        label: label,
        required: required,
        filled: filled,
        placeholder: placeholder,
        autocomplete: autocomplete
      });
      continue;
    }

    if (tag === 'TEXTAREA') {
      const filled = Boolean(el.value && el.value.trim().length > 0);
      results.push({
        id: jaId,
        type: 'textarea',
        label: label,
        required: required,
        filled: filled,
        placeholder: placeholder,
        autocomplete: autocomplete
      });
      continue;
    }

    if (isFile) {
      const filled = Boolean(el.files && el.files.length > 0);
      results.push({
        id: jaId,
        type: 'file',
        label: label,
        required: required,
        filled: filled,
        placeholder: placeholder,
        autocomplete: autocomplete
      });
      continue;
    }

    // Other inputs
    let fieldType = 'text';
    if (['email', 'tel', 'url', 'number', 'date'].includes(inputType)) {
      fieldType = inputType;
    }

    const filled = Boolean(el.value && el.value.trim().length > 0);
    results.push({
      id: jaId,
      type: fieldType,
      label: label,
      required: required,
      filled: filled,
      placeholder: placeholder,
      autocomplete: autocomplete
    });
  }

  function getGroupLabel(firstEl, allEls) {
    const fieldset = firstEl.closest('fieldset');
    if (fieldset) {
      const legend = fieldset.querySelector('legend');
      if (legend) {
        const text = (legend.innerText || legend.textContent || '').trim();
        if (text) return text;
      }
    }

    const groupContainer = firstEl.closest('[role="radiogroup"], [role="group"]');
    if (groupContainer) {
      const labelledby = groupContainer.getAttribute('aria-labelledby');
      if (labelledby) {
        const target = document.getElementById(labelledby);
        if (target) {
          const text = (target.innerText || target.textContent || '').trim();
          if (text) return text;
        }
      }
      const ariaLabel = groupContainer.getAttribute('aria-label');
      if (ariaLabel && ariaLabel.trim()) return ariaLabel.trim();
    }

    let p = firstEl.parentElement;
    while (p && p !== document.body) {
      const containsAll = allEls.every(function(el) { return p.contains(el); });
      if (containsAll) {
        const clone = p.cloneNode(true);
        const inputs = clone.querySelectorAll('input, select, textarea');
        inputs.forEach(function(inp) { inp.remove(); });
        const labels = clone.querySelectorAll('label');
        labels.forEach(function(l) { l.remove(); });
        const text = (clone.innerText || clone.textContent || '').replace(/\s+/g, ' ').trim();
        if (text) return text.slice(0, 300);
      }
      p = p.parentElement;
    }

    return '';
  }

  for (const entry of Array.from(radioCheckboxGroups.entries())) {
    const items = entry[1];
    if (items.length === 0) continue;
    const isRadio = items[0].type === 'radio';

    // Single checkbox
    if (!isRadio && items.length === 1) {
      const single = items[0];
      const surroundingText = getGroupLabel(single.el, [single.el]);
      const cleanedGroup = cleanRequiredAndLabel(surroundingText, single.el);
      const isDifferent = cleanedGroup.label && cleanedGroup.label !== single.ownLabel;
      const finalLabel = single.ownLabel || cleanedGroup.label;
      const context = isDifferent ? cleanedGroup.label : undefined;
      const required = single.required || cleanedGroup.required;

      results.push({
        id: single.jaId,
        type: 'checkbox',
        label: finalLabel,
        required: required,
        filled: single.checked,
        context: context,
        options: [{ label: single.ownLabel, value: single.value, key: single.jaId }]
      });
      continue;
    }

    // Multiple checkboxes or radio group
    const firstEl = items[0].el;
    const allEls = items.map(function(it) { return it.el; });
    const groupLabelRaw = getGroupLabel(firstEl, allEls);
    const anyRequired = items.some(function(it) { return it.required; });
    const cleanedGroup = cleanRequiredAndLabel(groupLabelRaw, firstEl);
    const required = anyRequired || cleanedGroup.required;
    const filled = items.some(function(it) { return it.checked; });

    const options = items.map(function(it) {
      return {
        label: it.ownLabel,
        value: it.value,
        key: it.jaId
      };
    });

    results.push({
      id: items[0].jaId,
      type: isRadio ? 'radio' : 'checkboxes',
      label: cleanedGroup.label,
      required: required,
      filled: filled,
      options: options
    });
  }

  return results;
})()`;

export async function extractFields(frame: Frame | Page): Promise<FormField[]> {
  const fields = (await frame.evaluate(EXTRACT_SCRIPT)) as FormField[];
  return fields;
}
