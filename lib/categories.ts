// Single source of truth for all category constants across EasyToGive.
// Import from here — do not redefine in individual files.

// ─── Top-level categories ────────────────────────────────────────────────────

export const TOP_LEVEL_CATEGORIES = ['community', 'missionaries'] as const;
export type TopCategory = (typeof TOP_LEVEL_CATEGORIES)[number];

/** Backward-compat alias — Category is now any string */
export type Category = string;

// ─── Subcategories per top-level ─────────────────────────────────────────────

export const SUBCATEGORY_OPTIONS: Record<TopCategory, readonly string[]> = {
  community: [
    'nonprofit', 'church', 'food_hunger', 'education', 'health_medical',
    'disaster_relief', 'animal_welfare', 'community_development',
    'international_aid', 'youth_children',
  ],
  missionaries: ['missionary'],
};

// ─── Display labels (single source of truth) ─────────────────────────────────

export const CATEGORY_LABELS: Record<string, string> = {
  // Top-level
  community:     'Community',
  missionaries:  'Missionaries',
  politics:      'Politics',
  // Community subcategories
  nonprofit:              'Nonprofit / 501(c)(3)',
  church:                 'Church / Religious Org',
  food_hunger:            'Food & Hunger',
  education:              'Education',
  health_medical:         'Health & Medical',
  disaster_relief:        'Disaster Relief',
  animal_welfare:         'Animal Welfare',
  community_development:  'Community Development',
  international_aid:      'International Aid',
  youth_children:         'Youth & Children',
  // Missionaries subcategories
  missionary:      'Missionary',
  // Politics subcategories
  campaign:        'Campaign',
  pac:             'PAC',
  super_pac:       'Super PAC',
  grassroots_group:'Grassroots Group',
  // Legacy values — kept so old DB rows still display correctly
  churches:        'Church',
  'animal-rescue': 'Animal Rescue',
  nonprofits:      'Nonprofit',
  environment:     'Environment',
  local:           'Local Cause',
};

// ─── Filter-chip lists ────────────────────────────────────────────────────────

/** Top-level chips used on the Discover page and admin dropdowns */
export const CATEGORIES: { value: string; label: string }[] = [
  { value: 'community',    label: 'Community' },
  { value: 'missionaries', label: 'Missionaries' },
];

/** Kept for backward compatibility (previously the 6-value enum list) */
export const CATEGORY_VALUES = TOP_LEVEL_CATEGORIES;

// ─── Cause → category mapping (onboarding interests) ─────────────────────────

/**
 * Maps every onboarding cause ID to its canonical top-level category.
 * All current interests map to 'community'; faith/missionary causes stay community.
 */
export const CAUSE_TO_CATEGORY: Record<string, string> = {
  // Current onboarding cause IDs (12)
  'faith-church':         'community',
  'animals-rescue':       'community',
  education:              'community',
  environment:            'community',
  'local-community':      'community',
  'food-hunger':          'community',
  'housing-homelessness': 'community',
  'international-aid':    'community',
  'health-medicine':      'community',
  'children-youth':       'community',
  'arts-culture':         'community',
  'veterans-military':    'community',
  // Legacy cause IDs (backward compatibility)
  animals:      'community',
  community:    'community',
  health:       'community',
  hunger:       'community',
  housing:      'community',
  'civil-rights':'community',
  children:     'community',
  veterans:     'community',
  arts:         'community',
  disaster:     'community',
};
