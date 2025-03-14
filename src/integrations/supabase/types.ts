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
          report_id: string | null
          updated_at: string
        }
        Insert: {
          assessment_points?: string[] | null
          created_at?: string
          id?: string
          name: string
          overall_score?: number
          report_id?: string | null
          updated_at?: string
        }
        Update: {
          assessment_points?: string[] | null
          created_at?: string
          id?: string
          name?: string
          overall_score?: number
          report_id?: string | null
          updated_at?: string
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
      reports: {
        Row: {
          analysis_error: string | null
          analysis_status: string
          company_id: string | null
          created_at: string
          description: string | null
          id: string
          pdf_url: string
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
          pdf_url: string
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
          pdf_url?: string
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
      get_section_stats: {
        Args: {
          section_id: string
        }
        Returns: {
          strength_count: number
          weakness_count: number
        }[]
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
