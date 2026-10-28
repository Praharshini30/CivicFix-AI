/**
 * CivicFix-AI: Complaint Rules, Taxonomy & Fallback Engine
 * Strictly aligned with API-CONTRACT.md:
 * - Categories: pothole, garbage, water leakage, streetlight, other
 * - Departments: Roads, Sanitation, Water Supply, Electrical Maintenance, General Civic Services
 * - Statuses: Open, In Progress, Resolved, Duplicate
 * - Severities: Low, Medium, High, Critical
 */

export const CATEGORIES = {
  POTHOLE: 'pothole',
  GARBAGE: 'garbage',
  WATER_LEAKAGE: 'water leakage',
  STREETLIGHT: 'streetlight',
  OTHER: 'other'
};

export const DEPARTMENTS = {
  [CATEGORIES.POTHOLE]: 'Roads',
  [CATEGORIES.GARBAGE]: 'Sanitation',
  [CATEGORIES.WATER_LEAKAGE]: 'Water Supply',
  [CATEGORIES.STREETLIGHT]: 'Electrical Maintenance',
  [CATEGORIES.OTHER]: 'General Civic Services'
};

export const SEVERITY_LEVELS = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  CRITICAL: 'Critical'
};

// Also export PRIORITY_LEVELS for backwards compatibility
export const PRIORITY_LEVELS = SEVERITY_LEVELS;

export const COMPLAINT_STATUS = {
  OPEN: 'Open',
  IN_PROGRESS: 'In Progress',
  RESOLVED: 'Resolved',
  DUPLICATE: 'Duplicate'
};

// Keyword mapping for deterministic rule-based triage
const CATEGORY_KEYWORDS = {
  [CATEGORIES.POTHOLE]: ['pothole', 'road', 'asphalt', 'crater', 'tar', 'divider', 'sidewalk', 'pavement', 'footpath', 'manhole'],
  [CATEGORIES.STREETLIGHT]: ['light', 'lamp', 'dark', 'streetlight', 'bulb', 'wire', 'pole', 'blackout', 'illumination', 'electrical'],
  [CATEGORIES.GARBAGE]: ['garbage', 'trash', 'waste', 'dump', 'dustbin', 'litter', 'stench', 'smell', 'debris', 'filth', 'dead animal'],
  [CATEGORIES.WATER_LEAKAGE]: ['water', 'pipe', 'leak', 'leakage', 'burst', 'contamination', 'sewage', 'drainage', 'gutter', 'overflow', 'drain clogged'],
  [CATEGORIES.OTHER]: ['traffic', 'hazard', 'safety', 'noise', 'tree', 'illegal parking']
};

const CRITICAL_KEYWORDS = ['emergency', 'urgent', 'danger', 'hazard', 'severe', 'hospital', 'accident', 'fire', 'collapsed', 'live wire'];
const HIGH_KEYWORDS = ['overflowing', 'blocked road', 'dark street', 'major leak', 'deep crater', 'health risk', 'flooded'];

/**
 * Validates complaint intake according to API-CONTRACT.md.
 * Required: description, location. Title is optional.
 */
export function validateComplaintInput(data = {}) {
  const errors = [];

  if (!data || typeof data !== 'object') {
    return { isValid: false, errors: ['Request body must be a valid JSON object'] };
  }

  const description = typeof data.description === 'string' ? data.description.trim() : '';
  if (!description || description.length < 5) {
    errors.push('description is required and must be at least 5 characters long');
  }

  const location = data.location;
  if (!location) {
    errors.push('location is required');
  } else if (typeof location === 'string' && location.trim().length < 2) {
    errors.push('location must be at least 2 characters long');
  } else if (typeof location === 'object') {
    const address = location.address || location.name || '';
    if (!address && location.lat === undefined && location.lng === undefined) {
      errors.push('location must include an address or coordinates');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Normalizes input category to valid contract enum
 */
export function normalizeCategory(cat) {
  if (!cat) return null;
  const str = String(cat).toLowerCase().trim();
  if (str.includes('pothole') || str.includes('road')) return CATEGORIES.POTHOLE;
  if (str.includes('garbage') || str.includes('trash') || str.includes('waste') || str.includes('sanitation')) return CATEGORIES.GARBAGE;
  if (str.includes('water') || str.includes('sewage') || str.includes('drain')) return CATEGORIES.WATER_LEAKAGE;
  if (str.includes('light') || str.includes('lamp') || str.includes('electric')) return CATEGORIES.STREETLIGHT;
  if (Object.values(CATEGORIES).includes(str)) return str;
  return CATEGORIES.OTHER;
}

/**
 * Normalizes status strings (e.g. "in progress", "IN_PROGRESS", "Open")
 */
export function normalizeStatus(status) {
  if (!status) return null;
  const cleaned = String(status).trim().toLowerCase().replace(/[_\s]+/g, ' ');
  if (cleaned === 'open' || cleaned === 'submitted') return COMPLAINT_STATUS.OPEN;
  if (cleaned === 'in progress' || cleaned === 'in review') return COMPLAINT_STATUS.IN_PROGRESS;
  if (cleaned === 'resolved') return COMPLAINT_STATUS.RESOLVED;
  if (cleaned === 'duplicate') return COMPLAINT_STATUS.DUPLICATE;
  return null;
}

/**
 * Rule-based fallback classifier
 */
export function fallbackAnalyzeComplaint({ title = '', description = '', category = null }) {
  const titleLower = title.toLowerCase();
  const descLower = description.toLowerCase();
  const fullText = `${titleLower} ${descLower}`.trim();

  let matchedCategory = normalizeCategory(category);

  if (!matchedCategory) {
    let bestCategory = CATEGORIES.OTHER;
    let highestScore = 0;

    for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
      let score = 0;
      for (const kw of keywords) {
        const regex = new RegExp(`\\b${kw}\\b`, 'i');
        if (regex.test(titleLower)) score += 3;
        else if (titleLower.includes(kw)) score += 2;

        if (regex.test(descLower)) score += 2;
        else if (descLower.includes(kw)) score += 1;
      }

      // If category name itself is in description (e.g. "garbage", "pothole", "streetlight")
      if (descLower.includes(cat)) {
        score += 4;
      }

      if (score > highestScore) {
        highestScore = score;
        bestCategory = cat;
      }
    }
    matchedCategory = bestCategory;
  }

  let severity = SEVERITY_LEVELS.LOW;
  if (CRITICAL_KEYWORDS.some(kw => fullText.includes(kw))) {
    severity = SEVERITY_LEVELS.CRITICAL;
  } else if (HIGH_KEYWORDS.some(kw => fullText.includes(kw))) {
    severity = SEVERITY_LEVELS.HIGH;
  } else if (matchedCategory === CATEGORIES.WATER_LEAKAGE || matchedCategory === CATEGORIES.POTHOLE) {
    severity = SEVERITY_LEVELS.MEDIUM;
  }

  const department = DEPARTMENTS[matchedCategory] || DEPARTMENTS[CATEGORIES.OTHER];

  // Generate concise summary
  let summary = title.trim();
  if (!summary) {
    summary = description.length > 60 ? `${description.slice(0, 57)}...` : description;
  }

  return {
    category: matchedCategory,
    department,
    severity,
    priority: severity, // Alias
    summary,
    source: 'rule-based fallback'
  };
}

function tokenize(str = '') {
  return new Set(
    str
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2)
  );
}

export function calculateTextSimilarity(str1 = '', str2 = '') {
  const setA = tokenize(str1);
  const setB = tokenize(str2);

  if (setA.size === 0 || setB.size === 0) return 0;

  let intersection = 0;
  for (const item of setA) {
    if (setB.has(item)) intersection++;
  }

  const union = new Set([...setA, ...setB]).size;
  return union === 0 ? 0 : intersection / union;
}

export function normalizeLocation(loc) {
  if (!loc) return '';
  if (typeof loc === 'string') return loc.trim().toLowerCase();
  return (loc.address || loc.name || '').trim().toLowerCase();
}

export function isPotentialDuplicate(newComplaint, existingComplaint, threshold = 0.5) {
  if (existingComplaint.status === COMPLAINT_STATUS.RESOLVED) {
    return false;
  }

  // Check category match
  const catNew = normalizeCategory(newComplaint.category);
  const catExist = normalizeCategory(existingComplaint.category);
  if (catNew && catExist && catNew !== catExist) return false;

  // Check location similarity
  const locNew = normalizeLocation(newComplaint.location);
  const locExist = normalizeLocation(existingComplaint.location);

  let locationMatches = false;
  if (locNew && locExist) {
    if (locNew === locExist || locNew.includes(locExist) || locExist.includes(locNew)) {
      locationMatches = true;
    } else {
      const locSim = calculateTextSimilarity(locNew, locExist);
      if (locSim >= 0.4) locationMatches = true;
    }
  }

  if (!locationMatches) return false;

  // Text similarity
  const textNew = `${newComplaint.title || ''} ${newComplaint.description || ''}`;
  const textExist = `${existingComplaint.title || ''} ${existingComplaint.description || ''}`;
  const similarity = calculateTextSimilarity(textNew, textExist);

  return similarity >= threshold;
}
