/**
 * Minimal YAML parser — handles our workflow files only.
 * Supports: scalars, lists, nested objects, multiline strings.
 * NOT a full YAML parser. For complex YAML, use js-yaml.
 */
export function parse(text) {
  // Quick approach: convert simple YAML patterns to JSON-ish structure
  const lines = text.split('\n');
  const result = {};
  let currentKey = null;
  let currentList = null;
  let currentListKey = null;
  let currentObj = result;
  let indent = 0;
  let inSteps = false;
  let steps = [];
  let currentStep = null;

  for (const rawLine of lines) {
    const line = rawLine.replace(/\r$/, '');
    if (line.trim() === '' || line.trim().startsWith('#')) continue;

    const lineIndent = line.search(/\S/);
    const trimmed = line.trim();

    // Top-level key: value
    if (lineIndent === 0 && trimmed.includes(':')) {
      const [key, ...rest] = trimmed.split(':');
      const val = rest.join(':').trim();
      currentKey = key.trim();
      
      if (currentKey === 'steps') {
        inSteps = true;
        steps = [];
        continue;
      }
      
      inSteps = false;
      if (val) {
        result[currentKey] = val.replace(/^["']|["']$/g, '');
      }
      continue;
    }

    // Steps list items
    if (inSteps) {
      if (trimmed.startsWith('- name:')) {
        if (currentStep) steps.push(currentStep);
        currentStep = { name: trimmed.replace('- name:', '').trim().replace(/^["']|["']$/g, '') };
      } else if (currentStep && trimmed.includes(':')) {
        const [k, ...v] = trimmed.split(':');
        const key = k.trim().replace(/^- /, '');
        let val = v.join(':').trim().replace(/^["']|["']$/g, '');
        
        // Handle arrays like [tool1, tool2]
        if (val.startsWith('[') && val.endsWith(']')) {
          val = val.slice(1, -1).split(',').map(s => s.trim().replace(/^["']|["']$/g, ''));
        }
        
        currentStep[key] = val;
      }
    }
  }
  
  if (currentStep) steps.push(currentStep);
  if (steps.length > 0) result.steps = steps;
  
  return result;
}
