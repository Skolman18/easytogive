export type { Category } from "@/lib/categories";
export { CATEGORIES } from "@/lib/categories";
import type { Category } from "@/lib/categories";

export interface Organization {
  id: string;
  name: string;
  tagline: string;
  description: string;
  category: Category;
  location: string;
  raised: number;
  goal: number;
  donors: number;
  verified: boolean;
  featured: boolean;
  imageUrl: string;
  coverUrl: string;
  ein: string;
  founded: number;
  website: string;
  impactStats: { label: string; value: string }[];
  tags: string[];
  recommended_orgs?: string[];
  sort_order?: number;
}

export interface GivingRecord {
  id: string;
  date: string;
  orgId: string;
  orgName: string;
  amount: number;
  category: Category;
  receiptId: string;
}

export interface PortfolioAllocation {
  orgId: string;
  orgName: string;
  percentage: number;
  color: string;
}


export const ORGANIZATIONS: Organization[] = [
  {
    id: "grace-community-church",
    name: "Grace Community Church",
    tagline: "Serving our neighbors since 1978",
    description:
      "Grace Community Church has been a cornerstone of our city for over four decades. We run weekly food pantries, after-school tutoring programs, and emergency housing assistance for families in crisis. Every dollar given goes directly to community programs with zero administrative overhead taken from donations.",
    category: "churches",
    location: "Austin, TX",
    raised: 128400,
    goal: 200000,
    donors: 847,
    verified: true,
    featured: true,
    imageUrl: "https://images.unsplash.com/photo-1438032005730-c779502df39b?w=600&q=80",
    coverUrl: "https://images.unsplash.com/photo-1519817650390-64a93db51149?w=1200&q=80",
    ein: "74-1234567",
    founded: 1978,
    website: "https://gracecc.org",
    impactStats: [
      { label: "Meals served monthly", value: "3,200+" },
      { label: "Families housed", value: "124" },
      { label: "Students tutored", value: "89" },
    ],
    tags: ["food", "housing", "community", "youth"],
  },
  {
    id: "second-chance-rescue",
    name: "Second Chance Animal Rescue",
    tagline: "Every animal deserves a loving home",
    description:
      "We are a no-kill shelter dedicated to rescuing abandoned and abused animals across the tri-county area. Our foster network of 200+ volunteers has helped place over 12,000 animals into permanent homes since 2005. We also offer low-cost spay/neuter clinics and pet food banks for families facing hardship.",
    category: "animal-rescue",
    location: "Nashville, TN",
    raised: 67200,
    goal: 100000,
    donors: 1203,
    verified: true,
    featured: true,
    imageUrl: "https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=600&q=80",
    coverUrl: "https://images.unsplash.com/photo-1601758125946-6ec2ef64daf8?w=1200&q=80",
    ein: "62-2345678",
    founded: 2005,
    website: "https://secondchancerescue.org",
    impactStats: [
      { label: "Animals rescued yearly", value: "1,400+" },
      { label: "Adoption rate", value: "98%" },
      { label: "Foster volunteers", value: "200+" },
    ],
    tags: ["animals", "shelter", "foster", "no-kill"],
  },
  {
    id: "clean-rivers-project",
    name: "Clean Rivers Project",
    tagline: "Protecting waterways for future generations",
    description:
      "The Clean Rivers Project organizes watershed cleanups, advocates for stronger water quality legislation, and runs environmental education programs in K-12 schools. Our citizen science network monitors water quality at 47 sites across the state, providing critical data to regulatory agencies.",
    category: "environment",
    location: "Portland, OR",
    raised: 94100,
    goal: 150000,
    donors: 2341,
    verified: true,
    featured: true,
    imageUrl: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&q=80",
    coverUrl: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1200&q=80",
    ein: "93-3456789",
    founded: 2011,
    website: "https://cleanriversproject.org",
    impactStats: [
      { label: "Pounds of trash removed", value: "180,000" },
      { label: "Monitoring sites", value: "47" },
      { label: "Students reached", value: "8,500" },
    ],
    tags: ["water", "cleanup", "advocacy", "education"],
  },
  {
    id: "literacy-first",
    name: "Literacy First Foundation",
    tagline: "Reading opens every door",
    description:
      "Literacy First provides free tutoring, books, and reading programs to underserved children ages 5-18. Our signature Summer Reading Camp has helped over 6,000 children gain grade-level reading skills since 2008. We partner with 34 public schools and 12 libraries to deliver programming where it's needed most.",
    category: "education",
    location: "Chicago, IL",
    raised: 211500,
    goal: 300000,
    donors: 3892,
    verified: true,
    featured: true,
    imageUrl: "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=600&q=80",
    coverUrl: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=1200&q=80",
    ein: "36-4567890",
    founded: 2008,
    website: "https://literacyfirst.org",
    impactStats: [
      { label: "Children served yearly", value: "4,200" },
      { label: "Reading improvement avg", value: "2.1 grade levels" },
      { label: "Books distributed", value: "95,000+" },
    ],
    tags: ["reading", "youth", "tutoring", "schools"],
  },
  {
    id: "neighbors-helping-neighbors",
    name: "Neighbors Helping Neighbors",
    tagline: "Building community, one family at a time",
    description:
      "A hyperlocal nonprofit serving the east side of Denver through emergency rent assistance, utility bill support, and a free store stocked with household essentials. We believe every neighbor deserves dignity, and we provide wraparound support without bureaucratic barriers.",
    category: "local",
    location: "Denver, CO",
    raised: 43800,
    goal: 75000,
    donors: 612,
    verified: true,
    featured: false,
    imageUrl: "https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=600&q=80",
    coverUrl: "https://images.unsplash.com/photo-1593113598332-cd288d649433?w=1200&q=80",
    ein: "84-5678901",
    founded: 2016,
    website: "https://neighborshelpingneighbors.org",
    impactStats: [
      { label: "Families assisted monthly", value: "340" },
      { label: "Evictions prevented", value: "127" },
      { label: "Volunteer hours logged", value: "11,400" },
    ],
    tags: ["rent", "utilities", "emergency", "community"],
  },
  {
    id: "highland-presbyterian",
    name: "Highland Presbyterian Church",
    tagline: "Faith in action, love in service",
    description:
      "Highland Presbyterian is a welcoming congregation with a deep commitment to justice and mercy. Our outreach arm operates a weekly meal service for unhoused neighbors, a refugee resettlement program, and a community garden that donates 100% of its harvest to local food banks.",
    category: "churches",
    location: "Louisville, KY",
    raised: 88900,
    goal: 120000,
    donors: 534,
    verified: true,
    featured: false,
    imageUrl: "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=600&q=80",
    coverUrl: "https://images.unsplash.com/photo-1487058792275-0ad4aaf24ca7?w=1200&q=80",
    ein: "61-6789012",
    founded: 1923,
    website: "https://highlandpres.org",
    impactStats: [
      { label: "Meals served weekly", value: "280" },
      { label: "Refugees resettled", value: "34 families" },
      { label: "Pounds of produce donated", value: "4,200" },
    ],
    tags: ["refugee", "food", "garden", "community"],
  },
  {
    id: "stem-for-all",
    name: "STEM for All Initiative",
    tagline: "Closing the opportunity gap in science and tech",
    description:
      "STEM for All provides free robotics clubs, coding bootcamps, and science fair mentorship to Title I schools. Our hardware lending library lets students borrow laptops, microscopes, and lab equipment. Over 90% of our alumni report pursuing STEM-related studies or careers.",
    category: "education",
    location: "Atlanta, GA",
    raised: 156700,
    goal: 250000,
    donors: 1876,
    verified: true,
    featured: false,
    imageUrl: "https://images.unsplash.com/photo-1517077304055-6e89abbf09b0?w=600&q=80",
    coverUrl: "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=1200&q=80",
    ein: "58-7890123",
    founded: 2013,
    website: "https://stemforall.org",
    impactStats: [
      { label: "Students enrolled yearly", value: "2,800" },
      { label: "Schools partnered", value: "41" },
      { label: "STEM alumni in college", value: "91%" },
    ],
    tags: ["coding", "robotics", "youth", "STEM"],
  },
  {
    id: "urban-tree-canopy",
    name: "Urban Tree Canopy Alliance",
    tagline: "Greening our cities, cooling our streets",
    description:
      "We plant, maintain, and protect trees in urban neighborhoods that lack green space — with a focus on heat islands and communities with limited access to parks. Each tree is maintained for five years to ensure survival. We've planted 42,000 trees across 18 cities and counting.",
    category: "environment",
    location: "Phoenix, AZ",
    raised: 72300,
    goal: 110000,
    donors: 988,
    verified: true,
    featured: false,
    imageUrl: "https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?w=600&q=80",
    coverUrl: "https://images.unsplash.com/photo-1448375240586-882707db888b?w=1200&q=80",
    ein: "85-8901234",
    founded: 2017,
    website: "https://urbantreecanopy.org",
    impactStats: [
      { label: "Trees planted", value: "42,000" },
      { label: "Cities served", value: "18" },
      { label: "5-year survival rate", value: "87%" },
    ],
    tags: ["trees", "urban", "heat", "environment"],
  },
  {
    id: "paws-and-claws",
    name: "Paws & Claws Sanctuary",
    tagline: "Sanctuary for animals great and small",
    description:
      "A licensed wildlife rehabilitation center and domestic animal sanctuary in the Texas Hill Country. We care for injured wildlife, exotic animals surrendered from unsuitable situations, and senior dogs and cats who have trouble finding adopters. Our acreage gives every animal room to heal.",
    category: "animal-rescue",
    location: "Fredericksburg, TX",
    raised: 38400,
    goal: 80000,
    donors: 741,
    verified: false,
    featured: false,
    imageUrl: "https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=600&q=80",
    coverUrl: "https://images.unsplash.com/photo-1425082661705-1834bfd09dca?w=1200&q=80",
    ein: "Pending",
    founded: 2020,
    website: "https://pawsandclaws.org",
    impactStats: [
      { label: "Animals in care", value: "120" },
      { label: "Wildlife rehabbed yearly", value: "600+" },
      { label: "Acres of sanctuary", value: "34" },
    ],
    tags: ["wildlife", "sanctuary", "senior pets", "rehab"],
  },
  {
    id: "eastside-community-fund",
    name: "Eastside Community Fund",
    tagline: "Investing in people, not programs",
    description:
      "The Eastside Community Fund gives unrestricted cash grants directly to low-income residents experiencing financial emergencies — medical bills, car repairs, childcare gaps — with no strings attached. We trust our neighbors to know what they need. 95 cents of every dollar goes directly to recipients.",
    category: "local",
    location: "Seattle, WA",
    raised: 189200,
    goal: 250000,
    donors: 4231,
    verified: true,
    featured: false,
    imageUrl: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=600&q=80",
    coverUrl: "https://images.unsplash.com/photo-1577495508048-b635879837f1?w=1200&q=80",
    ein: "91-9012345",
    founded: 2019,
    website: "https://eastsidecommunityfund.org",
    impactStats: [
      { label: "Grants distributed", value: "$1.2M" },
      { label: "Residents helped", value: "2,100" },
      { label: "Overhead rate", value: "5%" },
    ],
    tags: ["direct cash", "emergency", "trust-based"],
  },
  {
    id: "bethel-tabernacle",
    name: "Bethel Tabernacle Ministries",
    tagline: "Hope for the whole person",
    description:
      "Bethel Tabernacle runs one of the largest urban ministry networks in the mid-Atlantic, including addiction recovery programs, transitional housing, a GED prep academy, and a community health clinic. We serve everyone regardless of faith background, and every program is free of charge.",
    category: "churches",
    location: "Baltimore, MD",
    raised: 312000,
    goal: 500000,
    donors: 2109,
    verified: true,
    featured: false,
    imageUrl: "https://images.unsplash.com/photo-1460355976672-71b23b8be6bc?w=600&q=80",
    coverUrl: "https://images.unsplash.com/photo-1477281765962-ef34e8bb0967?w=1200&q=80",
    ein: "52-0123456",
    founded: 1987,
    website: "https://betheltab.org",
    impactStats: [
      { label: "In recovery program", value: "380" },
      { label: "GED graduates yearly", value: "95" },
      { label: "Clinic visits annually", value: "7,400" },
    ],
    tags: ["recovery", "housing", "health", "education"],
  },
  {
    id: "ocean-keepers",
    name: "Ocean Keepers Alliance",
    tagline: "Clean oceans, thriving seas",
    description:
      "Ocean Keepers organizes beach cleanups, ocean plastic removal expeditions, and advocates for single-use plastic bans at the local and state level. Our underwater cleanup dives have removed over 80,000 pounds of ghost gear — abandoned fishing nets that entangle marine wildlife.",
    category: "environment",
    location: "San Diego, CA",
    raised: 118600,
    goal: 180000,
    donors: 3102,
    verified: true,
    featured: false,
    imageUrl: "https://images.unsplash.com/photo-1505118380757-91f5f5632de0?w=600&q=80",
    coverUrl: "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=1200&q=80",
    ein: "95-1234560",
    founded: 2014,
    website: "https://oceankeepers.org",
    impactStats: [
      { label: "Ghost gear removed", value: "80,000 lbs" },
      { label: "Beach miles cleaned", value: "340" },
      { label: "Plastic bans passed", value: "12" },
    ],
    tags: ["ocean", "plastic", "marine", "policy"],
  },
];

export const GIVING_HISTORY: GivingRecord[] = [
  {
    id: "g1",
    date: "2026-02-14",
    orgId: "grace-community-church",
    orgName: "Grace Community Church",
    amount: 50,
    category: "churches",
    receiptId: "ETG-2026-001",
  },
  {
    id: "g2",
    date: "2026-02-14",
    orgId: "second-chance-rescue",
    orgName: "Second Chance Animal Rescue",
    amount: 25,
    category: "animal-rescue",
    receiptId: "ETG-2026-001",
  },
  {
    id: "g3",
    date: "2026-02-14",
    orgId: "clean-rivers-project",
    orgName: "Clean Rivers Project",
    amount: 25,
    category: "environment",
    receiptId: "ETG-2026-001",
  },
  {
    id: "g4",
    date: "2026-01-15",
    orgId: "literacy-first",
    orgName: "Literacy First Foundation",
    amount: 75,
    category: "education",
    receiptId: "ETG-2026-002",
  },
  {
    id: "g5",
    date: "2026-01-15",
    orgId: "stem-for-all",
    orgName: "STEM for All Initiative",
    amount: 25,
    category: "education",
    receiptId: "ETG-2026-002",
  },
  {
    id: "g6",
    date: "2025-12-24",
    orgId: "neighbors-helping-neighbors",
    orgName: "Neighbors Helping Neighbors",
    amount: 100,
    category: "local",
    receiptId: "ETG-2025-018",
  },
  {
    id: "g7",
    date: "2025-12-24",
    orgId: "bethel-tabernacle",
    orgName: "Bethel Tabernacle Ministries",
    amount: 50,
    category: "churches",
    receiptId: "ETG-2025-018",
  },
  {
    id: "g8",
    date: "2025-11-28",
    orgId: "urban-tree-canopy",
    orgName: "Urban Tree Canopy Alliance",
    amount: 40,
    category: "environment",
    receiptId: "ETG-2025-014",
  },
];

export const PORTFOLIO_ALLOCATIONS: PortfolioAllocation[] = [
  {
    orgId: "grace-community-church",
    orgName: "Grace Community Church",
    percentage: 40,
    color: "#1a7a4a",
  },
  {
    orgId: "second-chance-rescue",
    orgName: "Second Chance Animal Rescue",
    percentage: 25,
    color: "#2db673",
  },
  {
    orgId: "clean-rivers-project",
    orgName: "Clean Rivers Project",
    percentage: 20,
    color: "#f59e0b",
  },
  {
    orgId: "literacy-first",
    orgName: "Literacy First Foundation",
    percentage: 15,
    color: "#6366f1",
  },
];

export const WATCHLIST_IDS = [
  "stem-for-all",
  "ocean-keepers",
  "urban-tree-canopy",
];

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function getProgressPercent(raised: number, goal: number): number {
  return Math.min(Math.round((raised / goal) * 100), 100);
}
