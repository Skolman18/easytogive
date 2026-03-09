// Auto-generated Supabase database types for EasyToGive
// Regenerate with: supabase gen types typescript --project-id dfktfiruzulhpwcafaey

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type OrgCategory =
  | "churches"
  | "animal-rescue"
  | "nonprofits"
  | "education"
  | "environment"
  | "local";

export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string;
          name: string;
          tagline: string;
          description: string;
          category: OrgCategory;
          location: string;
          raised: number;
          goal: number;
          donors: number;
          verified: boolean;
          featured: boolean;
          image_url: string;
          cover_url: string;
          ein: string;
          founded: number | null;
          website: string;
          impact_stats: Json;
          tags: string[];
          recommended_orgs: string[];
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["organizations"]["Row"],
          "created_at" | "updated_at"
        >;
        Update: Partial<
          Database["public"]["Tables"]["organizations"]["Insert"]
        >;
      };
      users: {
        Row: {
          id: string;
          full_name: string;
          email: string;
          phone: string;
          avatar_url: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["users"]["Row"],
          "created_at" | "updated_at"
        >;
        Update: Partial<Database["public"]["Tables"]["users"]["Insert"]>;
      };
      donations: {
        Row: {
          id: string;
          user_id: string | null;
          org_id: string;
          amount: number;
          receipt_id: string;
          donated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["donations"]["Row"], "id" | "donated_at">;
        Update: Partial<Database["public"]["Tables"]["donations"]["Insert"]>;
      };
      portfolio_allocations: {
        Row: {
          id: string;
          user_id: string;
          org_id: string;
          percentage: number;
          color: string;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["portfolio_allocations"]["Row"],
          "id" | "created_at" | "updated_at"
        >;
        Update: Partial<
          Database["public"]["Tables"]["portfolio_allocations"]["Insert"]
        >;
      };
      watchlist: {
        Row: {
          id: string;
          user_id: string;
          org_id: string;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["watchlist"]["Row"], "id" | "created_at">;
        Update: never;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      org_category: OrgCategory;
    };
  };
}

// Convenience row types
export type OrganizationRow =
  Database["public"]["Tables"]["organizations"]["Row"];
export type UserRow = Database["public"]["Tables"]["users"]["Row"];
export type DonationRow = Database["public"]["Tables"]["donations"]["Row"];
export type PortfolioAllocationRow =
  Database["public"]["Tables"]["portfolio_allocations"]["Row"];
export type WatchlistRow = Database["public"]["Tables"]["watchlist"]["Row"];
