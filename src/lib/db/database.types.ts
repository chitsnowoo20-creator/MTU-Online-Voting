export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          detail: Json | null
          entity_id: string | null
          entity_type: string | null
          id: number
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          detail?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: never
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          detail?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: never
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "admin_user_directory"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "audit_log_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      awards: {
        Row: {
          category_id: string
          id: string
          label: string
          rank: number
        }
        Insert: {
          category_id: string
          id?: string
          label: string
          rank: number
        }
        Update: {
          category_id?: string
          id?: string
          label?: string
          rank?: number
        }
        Relationships: [
          {
            foreignKeyName: "awards_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "awards_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "election_results"
            referencedColumns: ["category_id"]
          },
        ]
      }
      ballot_issued: {
        Row: {
          category_id: string
          election_id: string
          id: string
          issued_at: string
          voter_id: string
        }
        Insert: {
          category_id: string
          election_id: string
          id?: string
          issued_at?: string
          voter_id: string
        }
        Update: {
          category_id?: string
          election_id?: string
          id?: string
          issued_at?: string
          voter_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ballot_issued_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ballot_issued_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "election_results"
            referencedColumns: ["category_id"]
          },
          {
            foreignKeyName: "ballot_issued_election_id_fkey"
            columns: ["election_id"]
            isOneToOne: false
            referencedRelation: "elections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ballot_issued_voter_id_fkey"
            columns: ["voter_id"]
            isOneToOne: false
            referencedRelation: "admin_user_directory"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "ballot_issued_voter_id_fkey"
            columns: ["voter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      candidates: {
        Row: {
          category_id: string
          department_code: string | null
          display_name: string
          display_order: number
          id: string
          photo_path: string
          tagline: string | null
        }
        Insert: {
          category_id: string
          department_code?: string | null
          display_name: string
          display_order?: number
          id?: string
          photo_path: string
          tagline?: string | null
        }
        Update: {
          category_id?: string
          department_code?: string | null
          display_name?: string
          display_order?: number
          id?: string
          photo_path?: string
          tagline?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "candidates_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidates_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "election_results"
            referencedColumns: ["category_id"]
          },
          {
            foreignKeyName: "candidates_department_code_fkey"
            columns: ["department_code"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["code"]
          },
        ]
      }
      categories: {
        Row: {
          display_order: number
          election_id: string
          id: string
          name: string
        }
        Insert: {
          display_order?: number
          election_id: string
          id?: string
          name: string
        }
        Update: {
          display_order?: number
          election_id?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_election_id_fkey"
            columns: ["election_id"]
            isOneToOne: false
            referencedRelation: "elections"
            referencedColumns: ["id"]
          },
        ]
      }
      departments: {
        Row: {
          active: boolean
          code: string
          name: string
        }
        Insert: {
          active?: boolean
          code: string
          name: string
        }
        Update: {
          active?: boolean
          code?: string
          name?: string
        }
        Relationships: []
      }
      elections: {
        Row: {
          closes_at: string | null
          created_at: string
          created_by: string
          id: string
          name: string
          opens_at: string | null
          state: Database["public"]["Enums"]["election_state"]
          verification_deadline: string | null
        }
        Insert: {
          closes_at?: string | null
          created_at?: string
          created_by: string
          id?: string
          name: string
          opens_at?: string | null
          state?: Database["public"]["Enums"]["election_state"]
          verification_deadline?: string | null
        }
        Update: {
          closes_at?: string | null
          created_at?: string
          created_by?: string
          id?: string
          name?: string
          opens_at?: string | null
          state?: Database["public"]["Enums"]["election_state"]
          verification_deadline?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "elections_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admin_user_directory"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "elections_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string
          id: string
          member_type: Database["public"]["Enums"]["member_type"] | null
          updated_at: string
          voter_status: Database["public"]["Enums"]["voter_status"]
        }
        Insert: {
          created_at?: string
          full_name: string
          id: string
          member_type?: Database["public"]["Enums"]["member_type"] | null
          updated_at?: string
          voter_status?: Database["public"]["Enums"]["voter_status"]
        }
        Update: {
          created_at?: string
          full_name?: string
          id?: string
          member_type?: Database["public"]["Enums"]["member_type"] | null
          updated_at?: string
          voter_status?: Database["public"]["Enums"]["voter_status"]
        }
        Relationships: []
      }
      tie_resolutions: {
        Row: {
          category_id: string
          created_at: string
          election_id: string
          id: string
          justification: string
          resolution: Json
          resolved_by: string
        }
        Insert: {
          category_id: string
          created_at?: string
          election_id: string
          id?: string
          justification: string
          resolution: Json
          resolved_by: string
        }
        Update: {
          category_id?: string
          created_at?: string
          election_id?: string
          id?: string
          justification?: string
          resolution?: Json
          resolved_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "tie_resolutions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: true
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tie_resolutions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: true
            referencedRelation: "election_results"
            referencedColumns: ["category_id"]
          },
          {
            foreignKeyName: "tie_resolutions_election_id_fkey"
            columns: ["election_id"]
            isOneToOne: false
            referencedRelation: "elections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tie_resolutions_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "admin_user_directory"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "tie_resolutions_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          granted_at: string
          granted_by: string | null
          profile_id: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          granted_at?: string
          granted_by?: string | null
          profile_id: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          granted_at?: string
          granted_by?: string | null
          profile_id?: string
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "admin_user_directory"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "user_roles_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "admin_user_directory"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "user_roles_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      verification_submissions: {
        Row: {
          decided_at: string | null
          decided_by: string | null
          id: string
          id_card_path: string | null
          profile_id: string
          rejection_reason: string | null
          status: Database["public"]["Enums"]["voter_status"]
          submitted_at: string
        }
        Insert: {
          decided_at?: string | null
          decided_by?: string | null
          id?: string
          id_card_path?: string | null
          profile_id: string
          rejection_reason?: string | null
          status?: Database["public"]["Enums"]["voter_status"]
          submitted_at?: string
        }
        Update: {
          decided_at?: string | null
          decided_by?: string | null
          id?: string
          id_card_path?: string | null
          profile_id?: string
          rejection_reason?: string | null
          status?: Database["public"]["Enums"]["voter_status"]
          submitted_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "verification_submissions_decided_by_fkey"
            columns: ["decided_by"]
            isOneToOne: false
            referencedRelation: "admin_user_directory"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "verification_submissions_decided_by_fkey"
            columns: ["decided_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "verification_submissions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "admin_user_directory"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "verification_submissions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      voter_identity: {
        Row: {
          department_code: string | null
          id: string
          member_type: Database["public"]["Enums"]["member_type"]
          profile_id: string
          reviewed_at: string
          reviewed_by: string
          staff_username: string | null
          urn_normalized: string | null
        }
        Insert: {
          department_code?: string | null
          id?: string
          member_type: Database["public"]["Enums"]["member_type"]
          profile_id: string
          reviewed_at?: string
          reviewed_by: string
          staff_username?: string | null
          urn_normalized?: string | null
        }
        Update: {
          department_code?: string | null
          id?: string
          member_type?: Database["public"]["Enums"]["member_type"]
          profile_id?: string
          reviewed_at?: string
          reviewed_by?: string
          staff_username?: string | null
          urn_normalized?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "voter_identity_department_code_fkey"
            columns: ["department_code"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "voter_identity_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "admin_user_directory"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "voter_identity_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "voter_identity_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "admin_user_directory"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "voter_identity_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      votes: {
        Row: {
          candidate_id: string
          cast_on: string
          category_id: string
          election_id: string
          id: string
        }
        Insert: {
          candidate_id: string
          cast_on?: string
          category_id: string
          election_id: string
          id?: string
        }
        Update: {
          candidate_id?: string
          cast_on?: string
          category_id?: string
          election_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "votes_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "votes_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "election_results"
            referencedColumns: ["candidate_id"]
          },
          {
            foreignKeyName: "votes_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "votes_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "election_results"
            referencedColumns: ["category_id"]
          },
          {
            foreignKeyName: "votes_election_id_fkey"
            columns: ["election_id"]
            isOneToOne: false
            referencedRelation: "elections"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      admin_user_directory: {
        Row: {
          created_at: string | null
          email: string | null
          full_name: string | null
          member_type: Database["public"]["Enums"]["member_type"] | null
          profile_id: string | null
          roles: Database["public"]["Enums"]["app_role"][] | null
          voter_status: Database["public"]["Enums"]["voter_status"] | null
        }
        Relationships: []
      }
      election_results: {
        Row: {
          candidate_id: string | null
          category_id: string | null
          category_name: string | null
          category_order: number | null
          department_code: string | null
          display_name: string | null
          election_id: string | null
          photo_path: string | null
          result_rank: number | null
          tagline: string | null
          vote_count: number | null
        }
        Relationships: [
          {
            foreignKeyName: "candidates_department_code_fkey"
            columns: ["department_code"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "categories_election_id_fkey"
            columns: ["election_id"]
            isOneToOne: false
            referencedRelation: "elections"
            referencedColumns: ["id"]
          },
        ]
      }
      verification_queue: {
        Row: {
          email: string | null
          full_name: string | null
          id_card_path: string | null
          profile_id: string | null
          submission_id: string | null
          submitted_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "verification_submissions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "admin_user_directory"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "verification_submissions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      auto_close_elections: { Args: never; Returns: number }
      cast_vote: {
        Args: { p_candidate_id: string; p_category_id: string }
        Returns: undefined
      }
      decide_review: {
        Args: {
          p_approve: boolean
          p_dept?: string
          p_member_type?: Database["public"]["Enums"]["member_type"]
          p_reason?: string
          p_submission_id: string
          p_urn?: string
          p_username?: string
        }
        Returns: string
      }
      election_of_category: { Args: { p_category_id: string }; Returns: string }
      election_state_of: {
        Args: { p_election_id: string }
        Returns: Database["public"]["Enums"]["election_state"]
      }
      generate_staff_username: {
        Args: { p_dept: string; p_full_name: string }
        Returns: string
      }
      has_unresolved_tie: { Args: { p_election_id: string }; Returns: boolean }
      is_admin: { Args: never; Returns: boolean }
      is_approved_voter: { Args: never; Returns: boolean }
      is_officer: { Args: never; Returns: boolean }
      is_reviewer: { Args: never; Returns: boolean }
      purge_id_images: { Args: { p_retain?: string }; Returns: number }
      submit_verification: { Args: { p_id_card_path: string }; Returns: string }
      tied_candidates: {
        Args: { p_election_id: string }
        Returns: {
          candidate_id: string
          category_id: string
          category_name: string
          display_name: string
          result_rank: number
        }[]
      }
      transition_election: {
        Args: {
          p_election_id: string
          p_note?: string
          p_to: Database["public"]["Enums"]["election_state"]
        }
        Returns: Database["public"]["Enums"]["election_state"]
      }
    }
    Enums: {
      app_role: "REVIEWER" | "ELECTION_OFFICER" | "ADMIN"
      election_state:
        | "DRAFT"
        | "CANDIDATES_LOCKED"
        | "OPEN"
        | "CLOSED"
        | "PUBLISHED"
      member_type: "STUDENT" | "STAFF"
      voter_status: "UNVERIFIED" | "PENDING" | "APPROVED" | "REJECTED"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["REVIEWER", "ELECTION_OFFICER", "ADMIN"],
      election_state: [
        "DRAFT",
        "CANDIDATES_LOCKED",
        "OPEN",
        "CLOSED",
        "PUBLISHED",
      ],
      member_type: ["STUDENT", "STAFF"],
      voter_status: ["UNVERIFIED", "PENDING", "APPROVED", "REJECTED"],
    },
  },
} as const
