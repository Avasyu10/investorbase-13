export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      companies: {
        Row: {
          assessment_points: string[] | null
          created_at: string
          id: string
          name: string
          overall_score: number
          perplexity_prompt: string | null
          perplexity_requested_at: string | null
          perplexity_response: string | null
          prompt_sent: string | null
          report_id: string | null
          response_received: string | null
          source: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          assessment_points?: string[] | null
          created_at?: string
          id?: string
          name: string
          overall_score?: number
          perplexity_prompt?: string | null
          perplexity_requested_at?: string | null
          perplexity_response?: string | null
          prompt_sent?: string | null
          report_id?: string | null
          response_received?: string | null
          source?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          assessment_points?: string[] | null
          created_at?: string
          id?: string
          name?: string
          overall_score?: number
          perplexity_prompt?: string | null
          perplexity_requested_at?: string | null
          perplexity_response?: string | null
          prompt_sent?: string | null
          report_id?: string | null
          response_received?: string | null
          source?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "companies_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
        ]
      }
      company_details: {
        Row: {
          company_id: string
          created_at: string
          id: string
          industry: string | null
          introduction: string | null
          stage: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          industry?: string | null
          introduction?: string | null
          stage?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          industry?: string | null
          introduction?: string | null
          stage?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_details_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      linkedin_profile_scrapes: {
        Row: {
          content: string | null
          created_at: string
          error_message: string | null
          id: string
          report_id: string | null
          scraped_at: string
          status: string
          url: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          report_id?: string | null
          scraped_at?: string
          status?: string
          url: string
        }
        Update: {
          content?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          report_id?: string | null
          scraped_at?: string
          status?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "linkedin_profile_scrapes_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          is_admin: boolean
          updated_at: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          is_admin?: boolean
          updated_at?: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          is_admin?: boolean
          updated_at?: string
          username?: string | null
        }
        Relationships: []
      }
      public_form_submissions: {
        Row: {
          company_stage: string | null
          created_at: string
          description: string | null
          form_slug: string
          founder_linkedin_profiles: string[] | null
          id: string
          industry: string | null
          pdf_url: string | null
          report_id: string | null
          supplementary_materials_urls: string[] | null
          title: string
          website_url: string | null
        }
        Insert: {
          company_stage?: string | null
          created_at?: string
          description?: string | null
          form_slug: string
          founder_linkedin_profiles?: string[] | null
          id?: string
          industry?: string | null
          pdf_url?: string | null
          report_id?: string | null
          supplementary_materials_urls?: string[] | null
          title: string
          website_url?: string | null
        }
        Update: {
          company_stage?: string | null
          created_at?: string
          description?: string | null
          form_slug?: string
          founder_linkedin_profiles?: string[] | null
          id?: string
          industry?: string | null
          pdf_url?: string | null
          report_id?: string | null
          supplementary_materials_urls?: string[] | null
          title?: string
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "public_form_submissions_form_slug_fkey"
            columns: ["form_slug"]
            isOneToOne: false
            referencedRelation: "public_submission_forms"
            referencedColumns: ["form_slug"]
          },
          {
            foreignKeyName: "public_form_submissions_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
        ]
      }
      public_submission_forms: {
        Row: {
          auto_analyze: boolean
          created_at: string
          form_name: string
          form_slug: string
          id: string
          is_active: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          auto_analyze?: boolean
          created_at?: string
          form_name: string
          form_slug: string
          id?: string
          is_active?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          auto_analyze?: boolean
          created_at?: string
          form_name?: string
          form_slug?: string
          id?: string
          is_active?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          analysis_error: string | null
          analysis_status: string
          company_id: string | null
          created_at: string
          description: string | null
          id: string
          is_public_submission: boolean | null
          pdf_url: string
          submission_form_id: string | null
          submitter_email: string | null
          title: string
          user_id: string | null
        }
        Insert: {
          analysis_error?: string | null
          analysis_status?: string
          company_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_public_submission?: boolean | null
          pdf_url: string
          submission_form_id?: string | null
          submitter_email?: string | null
          title: string
          user_id?: string | null
        }
        Update: {
          analysis_error?: string | null
          analysis_status?: string
          company_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_public_submission?: boolean | null
          pdf_url?: string
          submission_form_id?: string | null
          submitter_email?: string | null
          title?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reports_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_submission_form_id_fkey"
            columns: ["submission_form_id"]
            isOneToOne: false
            referencedRelation: "public_submission_forms"
            referencedColumns: ["id"]
          },
        ]
      }
      section_details: {
        Row: {
          content: string
          created_at: string
          detail_type: string
          id: string
          section_id: string
        }
        Insert: {
          content: string
          created_at?: string
          detail_type: string
          id?: string
          section_id: string
        }
        Update: {
          content?: string
          created_at?: string
          detail_type?: string
          id?: string
          section_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "section_details_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
        ]
      }
      sections: {
        Row: {
          company_id: string
          created_at: string
          description: string | null
          id: string
          score: number
          section_type: string | null
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          description?: string | null
          id?: string
          score?: number
          section_type?: string | null
          title: string
          type: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          description?: string | null
          id?: string
          score?: number
          section_type?: string | null
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sections_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      user_feedback: {
        Row: {
          created_at: string
          id: string
          message: string
          rating: number | null
          status: string | null
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          rating?: number | null
          status?: string | null
          subject: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          rating?: number | null
          status?: string | null
          subject?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      vc_profiles: {
        Row: {
          areas_of_interest: string[] | null
          companies_invested: string[] | null
          created_at: string
          fund_name: string | null
          fund_size: string | null
          fund_thesis_url: string | null
          id: string
          investment_stage: string[] | null
          updated_at: string
          website_url: string | null
        }
        Insert: {
          areas_of_interest?: string[] | null
          companies_invested?: string[] | null
          created_at?: string
          fund_name?: string | null
          fund_size?: string | null
          fund_thesis_url?: string | null
          id: string
          investment_stage?: string[] | null
          updated_at?: string
          website_url?: string | null
        }
        Update: {
          areas_of_interest?: string[] | null
          companies_invested?: string[] | null
          created_at?: string
          fund_name?: string | null
          fund_size?: string | null
          fund_thesis_url?: string | null
          id?: string
          investment_stage?: string[] | null
          updated_at?: string
          website_url?: string | null
        }
        Relationships: []
      }
      website_scrapes: {
        Row: {
          content: string | null
          created_at: string
          error_message: string | null
          id: string
          report_id: string | null
          scraped_at: string
          status: string
          url: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          report_id?: string | null
          scraped_at?: string
          status?: string
          url: string
        }
        Update: {
          content?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          report_id?: string | null
          scraped_at?: string
          status?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "website_scrapes_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_find_company_by_numeric_id_bigint_function: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      find_company_by_numeric_id: {
        Args: {
          numeric_id: string
        }
        Returns: {
          id: string
        }[]
      }
      find_company_by_numeric_id_bigint: {
        Args: {
          numeric_id: string
        }
        Returns: {
          id: string
        }[]
      }
      get_company_by_numeric_id: {
        Args: {
          p_numeric_id: number
        }
        Returns: {
          assessment_points: string[] | null
          created_at: string
          id: string
          name: string
          overall_score: number
          perplexity_prompt: string | null
          perplexity_requested_at: string | null
          perplexity_response: string | null
          prompt_sent: string | null
          report_id: string | null
          response_received: string | null
          source: string
          updated_at: string
          user_id: string | null
        }[]
      }
      get_section_stats: {
        Args: {
          section_id: string
        }
        Returns: {
          strength_count: number
          weakness_count: number
        }[]
      }
      is_admin: {
        Args: {
          user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never
