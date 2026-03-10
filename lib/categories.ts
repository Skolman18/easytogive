// Single source of truth for all category constants across EasyToGive.
// Import from here — do not redefine in individual files.

export const CATEGORY_VALUES = [
  "churches",
  "animal-rescue",
  "nonprofits",
  "education",
  "environment",
  "local",
] as const;

export type Category = (typeof CATEGORY_VALUES)[number];

/** Singular display labels for badges, pills, and table cells */
export const CATEGORY_LABELS: Record<Category, string> = {
  churches: "Church",
  "animal-rescue": "Animal Rescue",
  nonprofits: "Nonprofit",
  education: "Education",
  environment: "Environment",
  local: "Local Cause",
};

/** Full category list used in filter chips and admin dropdowns */
export const CATEGORIES: { value: Category; label: string; icon: string }[] = [
  { value: "churches",      label: "Church",        icon: "⛪" },
  { value: "animal-rescue", label: "Animal Rescue",  icon: "🐾" },
  { value: "nonprofits",    label: "Nonprofit",      icon: "🤝" },
  { value: "education",     label: "Education",      icon: "📚" },
  { value: "environment",   label: "Environment",    icon: "🌿" },
  { value: "local",         label: "Local Cause",    icon: "🏘️" },
];

/**
 * Maps every onboarding cause ID to its canonical category value.
 * Covers all 12 current cause IDs plus legacy IDs for backward compatibility.
 */
export const CAUSE_TO_CATEGORY: Record<string, Category> = {
  // Current onboarding cause IDs (12)
  "faith-church":          "churches",
  "animals-rescue":        "animal-rescue",
  education:               "education",
  environment:             "environment",
  "local-community":       "local",
  "food-hunger":           "nonprofits",
  "housing-homelessness":  "nonprofits",
  "international-aid":     "nonprofits",
  "health-medicine":       "nonprofits",
  "children-youth":        "nonprofits",
  "arts-culture":          "nonprofits",
  "veterans-military":     "nonprofits",
  // Legacy cause IDs (backwards compatibility)
  animals:       "animal-rescue",
  community:     "local",
  health:        "nonprofits",
  hunger:        "nonprofits",
  housing:       "nonprofits",
  "civil-rights":"nonprofits",
  children:      "nonprofits",
  veterans:      "nonprofits",
  arts:          "nonprofits",
  disaster:      "nonprofits",
};
