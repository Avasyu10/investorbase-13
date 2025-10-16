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
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      analysis_limits: {
        Row: {
          analysis_count: number
          created_at: string | null
          max_analysis_allowed: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          analysis_count?: number
          created_at?: string | null
          max_analysis_allowed?: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          analysis_count?: number
          created_at?: string | null
          max_analysis_allowed?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      barc_form_submissions: {
        Row: {
          analysis_error: string | null
          analysis_result: Json | null
          analysis_status: string | null
          analyzed_at: string | null
          company_id: string | null
          company_linkedin_url: string | null
          company_name: string
          company_registration_type: string | null
          company_type: string | null
          created_at: string
          executive_summary: string | null
          form_slug: string
          founder_linkedin_urls: string[] | null
          id: string
          phoneno: string | null
          poc_name: string | null
          question_1: string | null
          question_2: string | null
          question_3: string | null
          question_4: string | null
          question_5: string | null
          report_id: string | null
          submitter_email: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          analysis_error?: string | null
          analysis_result?: Json | null
          analysis_status?: string | null
          analyzed_at?: string | null
          company_id?: string | null
          company_linkedin_url?: string | null
          company_name: string
          company_registration_type?: string | null
          company_type?: string | null
          created_at?: string
          executive_summary?: string | null
          form_slug: string
          founder_linkedin_urls?: string[] | null
          id?: string
          phoneno?: string | null
          poc_name?: string | null
          question_1?: string | null
          question_2?: string | null
          question_3?: string | null
          question_4?: string | null
          question_5?: string | null
          report_id?: string | null
          submitter_email: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          analysis_error?: string | null
          analysis_result?: Json | null
          analysis_status?: string | null
          analyzed_at?: string | null
          company_id?: string | null
          company_linkedin_url?: string | null
          company_name?: string
          company_registration_type?: string | null
          company_type?: string | null
          created_at?: string
          executive_summary?: string | null
          form_slug?: string
          founder_linkedin_urls?: string[] | null
          id?: string
          phoneno?: string | null
          poc_name?: string | null
          question_1?: string | null
          question_2?: string | null
          question_3?: string | null
          question_4?: string | null
          question_5?: string | null
          report_id?: string | null
          submitter_email?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "barc_form_submissions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      bitsanalysis: {
        Row: {
          analysis_result: Json | null
          created_at: string
          deck_name: string
          id: string
          updated_at: string
        }
        Insert: {
          analysis_result?: Json | null
          created_at?: string
          deck_name: string
          id?: string
          updated_at?: string
        }
        Update: {
          analysis_result?: Json | null
          created_at?: string
          deck_name?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      companies: {
        Row: {
          assessment_points: string[] | null
          created_at: string
          deck_url: string | null
          email: string | null
          id: string
          industry: string | null
          name: string
          overall_score: number
          perplexity_prompt: string | null
          perplexity_requested_at: string | null
          perplexity_response: string | null
          phonenumber: string | null
          poc_name: string | null
          prompt_sent: string | null
          report_id: string | null
          response_received: string | null
          scoring_reason: string | null
          source: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          assessment_points?: string[] | null
          created_at?: string
          deck_url?: string | null
          email?: string | null
          id?: string
          industry?: string | null
          name: string
          overall_score: number
          perplexity_prompt?: string | null
          perplexity_requested_at?: string | null
          perplexity_response?: string | null
          phonenumber?: string | null
          poc_name?: string | null
          prompt_sent?: string | null
          report_id?: string | null
          response_received?: string | null
          scoring_reason?: string | null
          source?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          assessment_points?: string[] | null
          created_at?: string
          deck_url?: string | null
          email?: string | null
          id?: string
          industry?: string | null
          name?: string
          overall_score?: number
          perplexity_prompt?: string | null
          perplexity_requested_at?: string | null
          perplexity_response?: string | null
          phonenumber?: string | null
          poc_name?: string | null
          prompt_sent?: string | null
          report_id?: string | null
          response_received?: string | null
          scoring_reason?: string | null
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
          account_manager: string | null
          company_id: string
          contact_email: string | null
          created_at: string
          id: string
          industry: string | null
          introduction: string | null
          linkedin_url: string | null
          notes: string | null
          pipeline_stage:
            | Database["public"]["Enums"]["pipeline_stage_enum"]
            | null
          point_of_contact: string | null
          source_of_introduction: string | null
          stage: string | null
          status: string
          status_date: string
          teammember_name: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          account_manager?: string | null
          company_id: string
          contact_email?: string | null
          created_at?: string
          id?: string
          industry?: string | null
          introduction?: string | null
          linkedin_url?: string | null
          notes?: string | null
          pipeline_stage?:
            | Database["public"]["Enums"]["pipeline_stage_enum"]
            | null
          point_of_contact?: string | null
          source_of_introduction?: string | null
          stage?: string | null
          status?: string
          status_date?: string
          teammember_name?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          account_manager?: string | null
          company_id?: string
          contact_email?: string | null
          created_at?: string
          id?: string
          industry?: string | null
          introduction?: string | null
          linkedin_url?: string | null
          notes?: string | null
          pipeline_stage?:
            | Database["public"]["Enums"]["pipeline_stage_enum"]
            | null
          point_of_contact?: string | null
          source_of_introduction?: string | null
          stage?: string | null
          status?: string
          status_date?: string
          teammember_name?: string | null
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
      company_enrichment: {
        Row: {
          company_id: string
          competitive_landscape: string | null
          created_at: string | null
          enrichment_data: Json | null
          growth_potential: string | null
          id: string
          investment_thesis: string | null
          market_analysis: string | null
          risk_factors: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          company_id: string
          competitive_landscape?: string | null
          created_at?: string | null
          enrichment_data?: Json | null
          growth_potential?: string | null
          id?: string
          investment_thesis?: string | null
          market_analysis?: string | null
          risk_factors?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          company_id?: string
          competitive_landscape?: string | null
          created_at?: string | null
          enrichment_data?: Json | null
          growth_potential?: string | null
          id?: string
          investment_thesis?: string | null
          market_analysis?: string | null
          risk_factors?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_enrichment_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_scrapes: {
        Row: {
          company_id: string | null
          created_at: string
          error_message: string | null
          id: string
          linkedin_url: string
          scraped_data: Json | null
          search_query: Json | null
          status: string
          updated_at: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          linkedin_url: string
          scraped_data?: Json | null
          search_query?: Json | null
          status?: string
          updated_at?: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          linkedin_url?: string
          scraped_data?: Json | null
          search_query?: Json | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      custom_alerts: {
        Row: {
          created_at: string
          id: string
          industry: string | null
          min_score: number | null
          stage: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          industry?: string | null
          min_score?: number | null
          stage?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          industry?: string | null
          min_score?: number | null
          stage?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      email_pitch_submissions: {
        Row: {
          analysis_error: string | null
          analysis_status: string | null
          attachment_name: string | null
          attachment_url: string | null
          company_name: string | null
          created_at: string
          external_id: string | null
          has_attachment: boolean | null
          id: string
          processed_at: string | null
          received_at: string | null
          report_id: string | null
          sender_email: string
          sender_name: string | null
          updated_at: string
        }
        Insert: {
          analysis_error?: string | null
          analysis_status?: string | null
          attachment_name?: string | null
          attachment_url?: string | null
          company_name?: string | null
          created_at?: string
          external_id?: string | null
          has_attachment?: boolean | null
          id?: string
          processed_at?: string | null
          received_at?: string | null
          report_id?: string | null
          sender_email: string
          sender_name?: string | null
          updated_at?: string
        }
        Update: {
          analysis_error?: string | null
          analysis_status?: string | null
          attachment_name?: string | null
          attachment_url?: string | null
          company_name?: string | null
          created_at?: string
          external_id?: string | null
          has_attachment?: boolean | null
          id?: string
          processed_at?: string | null
          received_at?: string | null
          report_id?: string | null
          sender_email?: string
          sender_name?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_pitch_submissions_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
        ]
      }
      email_submissions: {
        Row: {
          attachment_url: string | null
          created_at: string
          email_body: string | null
          email_html: string | null
          from_email: string
          has_attachments: boolean
          id: string
          received_at: string
          report_id: string | null
          subject: string | null
          to_email: string
          updated_at: string
        }
        Insert: {
          attachment_url?: string | null
          created_at?: string
          email_body?: string | null
          email_html?: string | null
          from_email: string
          has_attachments?: boolean
          id?: string
          received_at?: string
          report_id?: string | null
          subject?: string | null
          to_email: string
          updated_at?: string
        }
        Update: {
          attachment_url?: string | null
          created_at?: string
          email_body?: string | null
          email_html?: string | null
          from_email?: string
          has_attachments?: boolean
          id?: string
          received_at?: string
          report_id?: string | null
          subject?: string | null
          to_email?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_submissions_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
        ]
      }
      end_of_day_alerts: {
        Row: {
          created_at: string
          enabled: boolean
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      eureka_form_submissions: {
        Row: {
          analysis_error: string | null
          analysis_result: Json | null
          analysis_status: string | null
          analyzed_at: string | null
          company_id: string | null
          company_linkedin_url: string | null
          company_name: string
          company_registration_type: string | null
          company_type: string | null
          created_at: string
          eureka_id: string | null
          executive_summary: string | null
          form_slug: string
          founder_linkedin_urls: string[] | null
          id: string
          idea_id: string | null
          phoneno: string | null
          poc_name: string | null
          question_1: string | null
          question_2: string | null
          question_3: string | null
          question_4: string | null
          question_5: string | null
          question_6: string | null
          question_7: string | null
          question_8: string | null
          question_9: string | null
          report_id: string | null
          submitter_email: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          analysis_error?: string | null
          analysis_result?: Json | null
          analysis_status?: string | null
          analyzed_at?: string | null
          company_id?: string | null
          company_linkedin_url?: string | null
          company_name: string
          company_registration_type?: string | null
          company_type?: string | null
          created_at?: string
          eureka_id?: string | null
          executive_summary?: string | null
          form_slug: string
          founder_linkedin_urls?: string[] | null
          id?: string
          idea_id?: string | null
          phoneno?: string | null
          poc_name?: string | null
          question_1?: string | null
          question_2?: string | null
          question_3?: string | null
          question_4?: string | null
          question_5?: string | null
          question_6?: string | null
          question_7?: string | null
          question_8?: string | null
          question_9?: string | null
          report_id?: string | null
          submitter_email: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          analysis_error?: string | null
          analysis_result?: Json | null
          analysis_status?: string | null
          analyzed_at?: string | null
          company_id?: string | null
          company_linkedin_url?: string | null
          company_name?: string
          company_registration_type?: string | null
          company_type?: string | null
          created_at?: string
          eureka_id?: string | null
          executive_summary?: string | null
          form_slug?: string
          founder_linkedin_urls?: string[] | null
          id?: string
          idea_id?: string | null
          phoneno?: string | null
          poc_name?: string | null
          question_1?: string | null
          question_2?: string | null
          question_3?: string | null
          question_4?: string | null
          question_5?: string | null
          question_6?: string | null
          question_7?: string | null
          question_8?: string | null
          question_9?: string | null
          report_id?: string | null
          submitter_email?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      fund_thesis_analysis: {
        Row: {
          analysis_text: string
          company_id: string
          created_at: string
          id: string
          prompt_sent: string | null
          response_received: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          analysis_text: string
          company_id: string
          created_at?: string
          id?: string
          prompt_sent?: string | null
          response_received?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          analysis_text?: string
          company_id?: string
          created_at?: string
          id?: string
          prompt_sent?: string | null
          response_received?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fund_thesis_analysis_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      investor_pitch_emails: {
        Row: {
          approved_at: string | null
          auto_analyze: boolean
          created_at: string
          email_address: string | null
          id: string
          request_status: string
          requested_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          approved_at?: string | null
          auto_analyze?: boolean
          created_at?: string
          email_address?: string | null
          id?: string
          request_status?: string
          requested_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          approved_at?: string | null
          auto_analyze?: boolean
          created_at?: string
          email_address?: string | null
          id?: string
          request_status?: string
          requested_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      investor_research: {
        Row: {
          company_id: string
          completed_at: string | null
          created_at: string
          error_message: string | null
          id: string
          market_insights: Json | null
          news_highlights: Json | null
          prompt: string | null
          requested_at: string
          research_summary: string | null
          response: string | null
          sources: Json | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          company_id: string
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          market_insights?: Json | null
          news_highlights?: Json | null
          prompt?: string | null
          requested_at?: string
          research_summary?: string | null
          response?: string | null
          sources?: Json | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          company_id?: string
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          market_insights?: Json | null
          news_highlights?: Json | null
          prompt?: string | null
          requested_at?: string
          research_summary?: string | null
          response?: string | null
          sources?: Json | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "investor_research_company_id_fkey"
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
      market_research: {
        Row: {
          company_id: string
          completed_at: string | null
          error_message: string | null
          id: string
          market_insights: Json | null
          news_highlights: Json | null
          prompt: string | null
          requested_at: string
          research_summary: string | null
          research_text: string | null
          sources: Json | null
          status: string
        }
        Insert: {
          company_id: string
          completed_at?: string | null
          error_message?: string | null
          id?: string
          market_insights?: Json | null
          news_highlights?: Json | null
          prompt?: string | null
          requested_at?: string
          research_summary?: string | null
          research_text?: string | null
          sources?: Json | null
          status?: string
        }
        Update: {
          company_id?: string
          completed_at?: string | null
          error_message?: string | null
          id?: string
          market_insights?: Json | null
          news_highlights?: Json | null
          prompt?: string | null
          requested_at?: string
          research_summary?: string | null
          research_text?: string | null
          sources?: Json | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_company"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "market_research_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      problem_statement_evaluations: {
        Row: {
          ai_analysis_summary: string | null
          ai_recommendations: string | null
          average_score: number
          created_at: string
          evaluator_user_id: string | null
          existence_score: number
          frequency_score: number
          id: string
          problem_statement: string
          severity_score: number
          startup_name: string
          unmet_need_score: number
          updated_at: string
        }
        Insert: {
          ai_analysis_summary?: string | null
          ai_recommendations?: string | null
          average_score: number
          created_at?: string
          evaluator_user_id?: string | null
          existence_score: number
          frequency_score: number
          id?: string
          problem_statement: string
          severity_score: number
          startup_name: string
          unmet_need_score: number
          updated_at?: string
        }
        Update: {
          ai_analysis_summary?: string | null
          ai_recommendations?: string | null
          average_score?: number
          created_at?: string
          evaluator_user_id?: string | null
          existence_score?: number
          frequency_score?: number
          id?: string
          problem_statement?: string
          severity_score?: number
          startup_name?: string
          unmet_need_score?: number
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          is_admin: boolean
          is_bits: boolean | null
          is_bits_question: boolean | null
          is_eximius: boolean | null
          is_iitbombay: boolean
          is_manager: boolean
          is_vc: boolean
          is_view: boolean | null
          signup_source: string | null
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
          is_bits?: boolean | null
          is_bits_question?: boolean | null
          is_eximius?: boolean | null
          is_iitbombay?: boolean
          is_manager?: boolean
          is_vc?: boolean
          is_view?: boolean | null
          signup_source?: string | null
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
          is_bits?: boolean | null
          is_bits_question?: boolean | null
          is_eximius?: boolean | null
          is_iitbombay?: boolean
          is_manager?: boolean
          is_vc?: boolean
          is_view?: boolean | null
          signup_source?: string | null
          updated_at?: string
          username?: string | null
        }
        Relationships: []
      }
      public_form_submissions: {
        Row: {
          company_linkedin: string | null
          company_registration_type: string | null
          company_stage: string | null
          company_type: string | null
          created_at: string
          description: string | null
          dpiit_recognition_number: string | null
          employee_count: number | null
          executive_summary: string | null
          form_slug: string | null
          founder_address: string | null
          founder_contact: string | null
          founder_email: string | null
          founder_gender: string | null
          founder_linkedin_profiles: string[] | null
          founder_name: string | null
          founder_state: string | null
          funds_raised: string | null
          id: string
          indian_citizen_shareholding: string | null
          industry: string | null
          last_fy_revenue: string | null
          last_quarter_revenue: string | null
          pdf_url: string | null
          products_services: string | null
          question: string | null
          registration_number: string | null
          report_id: string | null
          submitter_email: string | null
          supplementary_materials_urls: string[] | null
          title: string
          valuation: string | null
          website_url: string | null
        }
        Insert: {
          company_linkedin?: string | null
          company_registration_type?: string | null
          company_stage?: string | null
          company_type?: string | null
          created_at?: string
          description?: string | null
          dpiit_recognition_number?: string | null
          employee_count?: number | null
          executive_summary?: string | null
          form_slug?: string | null
          founder_address?: string | null
          founder_contact?: string | null
          founder_email?: string | null
          founder_gender?: string | null
          founder_linkedin_profiles?: string[] | null
          founder_name?: string | null
          founder_state?: string | null
          funds_raised?: string | null
          id?: string
          indian_citizen_shareholding?: string | null
          industry?: string | null
          last_fy_revenue?: string | null
          last_quarter_revenue?: string | null
          pdf_url?: string | null
          products_services?: string | null
          question?: string | null
          registration_number?: string | null
          report_id?: string | null
          submitter_email?: string | null
          supplementary_materials_urls?: string[] | null
          title: string
          valuation?: string | null
          website_url?: string | null
        }
        Update: {
          company_linkedin?: string | null
          company_registration_type?: string | null
          company_stage?: string | null
          company_type?: string | null
          created_at?: string
          description?: string | null
          dpiit_recognition_number?: string | null
          employee_count?: number | null
          executive_summary?: string | null
          form_slug?: string | null
          founder_address?: string | null
          founder_contact?: string | null
          founder_email?: string | null
          founder_gender?: string | null
          founder_linkedin_profiles?: string[] | null
          founder_name?: string | null
          founder_state?: string | null
          funds_raised?: string | null
          id?: string
          indian_citizen_shareholding?: string | null
          industry?: string | null
          last_fy_revenue?: string | null
          last_quarter_revenue?: string | null
          pdf_url?: string | null
          products_services?: string | null
          question?: string | null
          registration_number?: string | null
          report_id?: string | null
          submitter_email?: string | null
          supplementary_materials_urls?: string[] | null
          title?: string
          valuation?: string | null
          website_url?: string | null
        }
        Relationships: [
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
          form_type: string
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
          form_type?: string
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
          form_type?: string
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
          analysis_result: Json | null
          analysis_status: string
          analyzed_at: string | null
          company_id: string | null
          created_at: string
          description: string | null
          id: string
          is_public_submission: boolean | null
          overall_score: number | null
          pdf_url: string
          submission_form_id: string | null
          submitter_email: string | null
          title: string
          user_id: string | null
        }
        Insert: {
          analysis_error?: string | null
          analysis_result?: Json | null
          analysis_status?: string
          analyzed_at?: string | null
          company_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_public_submission?: boolean | null
          overall_score?: number | null
          pdf_url: string
          submission_form_id?: string | null
          submitter_email?: string | null
          title: string
          user_id?: string | null
        }
        Update: {
          analysis_error?: string | null
          analysis_result?: Json | null
          analysis_status?: string
          analyzed_at?: string | null
          company_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_public_submission?: boolean | null
          overall_score?: number | null
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
      startup_submissions: {
        Row: {
          campus_affiliation: boolean
          competitive_understanding: string
          created_at: string
          customer_understanding: string
          founder_email: string
          id: string
          linkedin_profile_url: string | null
          market_understanding: string
          pdf_file_url: string | null
          ppt_file_url: string | null
          problem_statement: string
          solution: string
          startup_name: string
          technical_understanding: string
          unique_selling_proposition: string
          updated_at: string
          user_id: string | null
          vision: string
        }
        Insert: {
          campus_affiliation?: boolean
          competitive_understanding: string
          created_at?: string
          customer_understanding: string
          founder_email: string
          id?: string
          linkedin_profile_url?: string | null
          market_understanding: string
          pdf_file_url?: string | null
          ppt_file_url?: string | null
          problem_statement: string
          solution: string
          startup_name: string
          technical_understanding: string
          unique_selling_proposition: string
          updated_at?: string
          user_id?: string | null
          vision: string
        }
        Update: {
          campus_affiliation?: boolean
          competitive_understanding?: string
          created_at?: string
          customer_understanding?: string
          founder_email?: string
          id?: string
          linkedin_profile_url?: string | null
          market_understanding?: string
          pdf_file_url?: string | null
          ppt_file_url?: string | null
          problem_statement?: string
          solution?: string
          startup_name?: string
          technical_understanding?: string
          unique_selling_proposition?: string
          updated_at?: string
          user_id?: string | null
          vision?: string
        }
        Relationships: []
      }
      submission_evaluations: {
        Row: {
          accessibility_score: number | null
          acquisition_approach_score: number | null
          ai_analysis_summary: string | null
          ai_recommendations: string | null
          created_at: string
          differentiation_score: number | null
          differentiation_vs_players_score: number | null
          direct_competitors_score: number | null
          direct_fit_score: number | null
          dynamics_score: number | null
          effectiveness_score: number | null
          evaluator_user_id: string | null
          existence_score: number | null
          external_catalysts_score: number | null
          feasibility_score: number | null
          first_customers_score: number | null
          frequency_score: number | null
          growth_trajectory_score: number | null
          id: string
          market_size_score: number | null
          overall_average: number | null
          pain_recognition_score: number | null
          problem_statement: string | null
          severity_score: number | null
          startup_name: string | null
          startup_submission_id: string | null
          substitutes_score: number | null
          tech_alignment_score: number | null
          tech_coherence_score: number | null
          tech_complexity_awareness_score: number | null
          tech_components_score: number | null
          tech_feasibility_score: number | null
          tech_realism_score: number | null
          tech_roadmap_score: number | null
          tech_vision_ambition_score: number | null
          timing_readiness_score: number | null
          unmet_need_score: number | null
          updated_at: string
          usp_alignment_score: number | null
          usp_clarity_score: number | null
          usp_defensibility_score: number | null
          usp_differentiation_strength_score: number | null
        }
        Insert: {
          accessibility_score?: number | null
          acquisition_approach_score?: number | null
          ai_analysis_summary?: string | null
          ai_recommendations?: string | null
          created_at?: string
          differentiation_score?: number | null
          differentiation_vs_players_score?: number | null
          direct_competitors_score?: number | null
          direct_fit_score?: number | null
          dynamics_score?: number | null
          effectiveness_score?: number | null
          evaluator_user_id?: string | null
          existence_score?: number | null
          external_catalysts_score?: number | null
          feasibility_score?: number | null
          first_customers_score?: number | null
          frequency_score?: number | null
          growth_trajectory_score?: number | null
          id?: string
          market_size_score?: number | null
          overall_average?: number | null
          pain_recognition_score?: number | null
          problem_statement?: string | null
          severity_score?: number | null
          startup_name?: string | null
          startup_submission_id?: string | null
          substitutes_score?: number | null
          tech_alignment_score?: number | null
          tech_coherence_score?: number | null
          tech_complexity_awareness_score?: number | null
          tech_components_score?: number | null
          tech_feasibility_score?: number | null
          tech_realism_score?: number | null
          tech_roadmap_score?: number | null
          tech_vision_ambition_score?: number | null
          timing_readiness_score?: number | null
          unmet_need_score?: number | null
          updated_at?: string
          usp_alignment_score?: number | null
          usp_clarity_score?: number | null
          usp_defensibility_score?: number | null
          usp_differentiation_strength_score?: number | null
        }
        Update: {
          accessibility_score?: number | null
          acquisition_approach_score?: number | null
          ai_analysis_summary?: string | null
          ai_recommendations?: string | null
          created_at?: string
          differentiation_score?: number | null
          differentiation_vs_players_score?: number | null
          direct_competitors_score?: number | null
          direct_fit_score?: number | null
          dynamics_score?: number | null
          effectiveness_score?: number | null
          evaluator_user_id?: string | null
          existence_score?: number | null
          external_catalysts_score?: number | null
          feasibility_score?: number | null
          first_customers_score?: number | null
          frequency_score?: number | null
          growth_trajectory_score?: number | null
          id?: string
          market_size_score?: number | null
          overall_average?: number | null
          pain_recognition_score?: number | null
          problem_statement?: string | null
          severity_score?: number | null
          startup_name?: string | null
          startup_submission_id?: string | null
          substitutes_score?: number | null
          tech_alignment_score?: number | null
          tech_coherence_score?: number | null
          tech_complexity_awareness_score?: number | null
          tech_components_score?: number | null
          tech_feasibility_score?: number | null
          tech_realism_score?: number | null
          tech_roadmap_score?: number | null
          tech_vision_ambition_score?: number | null
          timing_readiness_score?: number | null
          unmet_need_score?: number | null
          updated_at?: string
          usp_alignment_score?: number | null
          usp_clarity_score?: number | null
          usp_defensibility_score?: number | null
          usp_differentiation_strength_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "submission_evaluations_startup_submission_id_fkey"
            columns: ["startup_submission_id"]
            isOneToOne: false
            referencedRelation: "startup_submissions"
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
      vc_chat_messages: {
        Row: {
          conversation_type: string | null
          created_at: string
          id: string
          message: string
          name: string
          recipient_id: string | null
          time: string
          to_recipient: string
          user_id: string | null
        }
        Insert: {
          conversation_type?: string | null
          created_at?: string
          id?: string
          message: string
          name: string
          recipient_id?: string | null
          time?: string
          to_recipient?: string
          user_id?: string | null
        }
        Update: {
          conversation_type?: string | null
          created_at?: string
          id?: string
          message?: string
          name?: string
          recipient_id?: string | null
          time?: string
          to_recipient?: string
          user_id?: string | null
        }
        Relationships: []
      }
      vc_connection_requests: {
        Row: {
          company_id: string
          company_name: string
          created_at: string
          founder_email: string
          founder_name: string
          founder_user_id: string
          id: string
          message: string | null
          status: string
          vc_email: string | null
          vc_linkedin: string | null
          vc_name: string
          vc_phone: string | null
          vc_website: string | null
        }
        Insert: {
          company_id: string
          company_name: string
          created_at?: string
          founder_email: string
          founder_name: string
          founder_user_id: string
          id?: string
          message?: string | null
          status?: string
          vc_email?: string | null
          vc_linkedin?: string | null
          vc_name: string
          vc_phone?: string | null
          vc_website?: string | null
        }
        Update: {
          company_id?: string
          company_name?: string
          created_at?: string
          founder_email?: string
          founder_name?: string
          founder_user_id?: string
          id?: string
          message?: string | null
          status?: string
          vc_email?: string | null
          vc_linkedin?: string | null
          vc_name?: string
          vc_phone?: string | null
          vc_website?: string | null
        }
        Relationships: []
      }
      vc_notifications: {
        Row: {
          company_id: string
          company_industry: string | null
          company_name: string
          company_stage: string | null
          created_at: string
          founder_user_id: string
          id: string
          is_read: boolean
          message: string | null
          read_at: string | null
          vc_profile_id: string
        }
        Insert: {
          company_id: string
          company_industry?: string | null
          company_name: string
          company_stage?: string | null
          created_at?: string
          founder_user_id: string
          id?: string
          is_read?: boolean
          message?: string | null
          read_at?: string | null
          vc_profile_id: string
        }
        Update: {
          company_id?: string
          company_industry?: string | null
          company_name?: string
          company_stage?: string | null
          created_at?: string
          founder_user_id?: string
          id?: string
          is_read?: boolean
          message?: string | null
          read_at?: string | null
          vc_profile_id?: string
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
      vccontact: {
        Row: {
          City: string | null
          Description: string | null
          Emails: string | null
          "Feed Name": string | null
          "Founded Year": number | null
          "Investment Score": number | null
          "Investor Name": string | null
          "Investor Type": string | null
          LinkedIn: string | null
          Overview: string | null
          "Phone Numbers": string | null
          "Practice Areas": string | null
          "SNo.": number | null
          State: string | null
          Twitter: string | null
          Website: string | null
          "Website Status": number | null
          "Website Status Last Updated": string | null
        }
        Insert: {
          City?: string | null
          Description?: string | null
          Emails?: string | null
          "Feed Name"?: string | null
          "Founded Year"?: number | null
          "Investment Score"?: number | null
          "Investor Name"?: string | null
          "Investor Type"?: string | null
          LinkedIn?: string | null
          Overview?: string | null
          "Phone Numbers"?: string | null
          "Practice Areas"?: string | null
          "SNo."?: number | null
          State?: string | null
          Twitter?: string | null
          Website?: string | null
          "Website Status"?: number | null
          "Website Status Last Updated"?: string | null
        }
        Update: {
          City?: string | null
          Description?: string | null
          Emails?: string | null
          "Feed Name"?: string | null
          "Founded Year"?: number | null
          "Investment Score"?: number | null
          "Investor Name"?: string | null
          "Investor Type"?: string | null
          LinkedIn?: string | null
          Overview?: string | null
          "Phone Numbers"?: string | null
          "Practice Areas"?: string | null
          "SNo."?: number | null
          State?: string | null
          Twitter?: string | null
          Website?: string | null
          "Website Status"?: number | null
          "Website Status Last Updated"?: string | null
        }
        Relationships: []
      }
      vcdata: {
        Row: {
          "Investor Name": string | null
          "Locations of Investment - as per applied filters": string | null
          "Locations of Investment - Overall": string | null
          "Portfolio Count - as per applied filters": number | null
          "Portfolio Count - Overall": number | null
          "Portfolio IPOs - as per applied filters": string | null
          "Portfolio IPOs - Overall": string | null
          "Rounds of Investment - as per applied filters": number | null
          "Rounds of Investment - Overall": number | null
          "Sectors of Investments - Overall": string | null
          "SNo.": number | null
          "Stages of Entry - Overall": string | null
        }
        Insert: {
          "Investor Name"?: string | null
          "Locations of Investment - as per applied filters"?: string | null
          "Locations of Investment - Overall"?: string | null
          "Portfolio Count - as per applied filters"?: number | null
          "Portfolio Count - Overall"?: number | null
          "Portfolio IPOs - as per applied filters"?: string | null
          "Portfolio IPOs - Overall"?: string | null
          "Rounds of Investment - as per applied filters"?: number | null
          "Rounds of Investment - Overall"?: number | null
          "Sectors of Investments - Overall"?: string | null
          "SNo."?: number | null
          "Stages of Entry - Overall"?: string | null
        }
        Update: {
          "Investor Name"?: string | null
          "Locations of Investment - as per applied filters"?: string | null
          "Locations of Investment - Overall"?: string | null
          "Portfolio Count - as per applied filters"?: number | null
          "Portfolio Count - Overall"?: number | null
          "Portfolio IPOs - as per applied filters"?: string | null
          "Portfolio IPOs - Overall"?: string | null
          "Rounds of Investment - as per applied filters"?: number | null
          "Rounds of Investment - Overall"?: number | null
          "Sectors of Investments - Overall"?: string | null
          "SNo."?: number | null
          "Stages of Entry - Overall"?: string | null
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
      bytea_to_text: {
        Args: { data: string }
        Returns: string
      }
      can_access_company: {
        Args: { company_report_id: string; company_user_id: string }
        Returns: boolean
      }
      can_access_report: {
        Args: {
          report_is_public: boolean
          report_submitter_email: string
          report_user_id: string
        }
        Returns: boolean
      }
      cleanup_test_companies: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      create_find_company_by_numeric_id_bigint_function: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      find_company_by_numeric_id: {
        Args: { numeric_id: string }
        Returns: {
          id: string
        }[]
      }
      find_company_by_numeric_id_bigint: {
        Args: { numeric_id: string }
        Returns: {
          id: string
        }[]
      }
      get_company_by_numeric_id: {
        Args: { p_numeric_id: number }
        Returns: {
          assessment_points: string[] | null
          created_at: string
          deck_url: string | null
          email: string | null
          id: string
          industry: string | null
          name: string
          overall_score: number
          perplexity_prompt: string | null
          perplexity_requested_at: string | null
          perplexity_response: string | null
          phonenumber: string | null
          poc_name: string | null
          prompt_sent: string | null
          report_id: string | null
          response_received: string | null
          scoring_reason: string | null
          source: string
          updated_at: string
          user_id: string | null
        }[]
      }
      get_section_stats: {
        Args: { section_id: string }
        Returns: {
          strength_count: number
          weakness_count: number
        }[]
      }
      http: {
        Args: { request: Database["public"]["CompositeTypes"]["http_request"] }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
      }
      http_delete: {
        Args:
          | { content: string; content_type: string; uri: string }
          | { uri: string }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
      }
      http_get: {
        Args: { data: Json; uri: string } | { uri: string }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
      }
      http_head: {
        Args: { uri: string }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
      }
      http_header: {
        Args: { field: string; value: string }
        Returns: Database["public"]["CompositeTypes"]["http_header"]
      }
      http_list_curlopt: {
        Args: Record<PropertyKey, never>
        Returns: {
          curlopt: string
          value: string
        }[]
      }
      http_patch: {
        Args: { content: string; content_type: string; uri: string }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
      }
      http_post: {
        Args:
          | { content: string; content_type: string; uri: string }
          | { data: Json; uri: string }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
      }
      http_put: {
        Args: { content: string; content_type: string; uri: string }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
      }
      http_reset_curlopt: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      http_set_curlopt: {
        Args: { curlopt: string; value: string }
        Returns: boolean
      }
      is_admin: {
        Args: { user_id: string }
        Returns: boolean
      }
      text_to_bytea: {
        Args: { data: string }
        Returns: string
      }
      update_investor_pitch_email_setting: {
        Args: { auto_analyze_value: boolean; record_id: string }
        Returns: boolean
      }
      urlencode: {
        Args: { data: Json } | { string: string } | { string: string }
        Returns: string
      }
    }
    Enums: {
      pipeline_stage_enum:
        | "pitch_received"
        | "initial_review"
        | "deck_evaluated"
        | "shortlisted"
        | "due_diligence"
        | "term_sheet_offer"
        | "negotiation"
        | "investment_decision"
        | "closed_won"
        | "closed_lost"
    }
    CompositeTypes: {
      http_header: {
        field: string | null
        value: string | null
      }
      http_request: {
        method: unknown | null
        uri: string | null
        headers: Database["public"]["CompositeTypes"]["http_header"][] | null
        content_type: string | null
        content: string | null
      }
      http_response: {
        status: number | null
        content_type: string | null
        headers: Database["public"]["CompositeTypes"]["http_header"][] | null
        content: string | null
      }
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
      pipeline_stage_enum: [
        "pitch_received",
        "initial_review",
        "deck_evaluated",
        "shortlisted",
        "due_diligence",
        "term_sheet_offer",
        "negotiation",
        "investment_decision",
        "closed_won",
        "closed_lost",
      ],
    },
  },
} as const
