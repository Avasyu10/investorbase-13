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
      companies: {
        Row: {
          assessment_points: string[] | null
          created_at: string
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
          source: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          assessment_points?: string[] | null
          created_at?: string
          email?: string | null
          id?: string
          industry?: string | null
          name: string
          overall_score?: number
          perplexity_prompt?: string | null
          perplexity_requested_at?: string | null
          perplexity_response?: string | null
          phonenumber?: string | null
          poc_name?: string | null
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
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          is_admin: boolean
          is_iitbombay: boolean
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
          is_iitbombay?: boolean
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
          is_iitbombay?: boolean
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
      bytea_to_text: {
        Args: { data: string }
        Returns: string
      }
      can_access_company: {
        Args: { company_user_id: string; company_report_id: string }
        Returns: boolean
      }
      can_access_report: {
        Args: {
          report_user_id: string
          report_is_public: boolean
          report_submitter_email: string
        }
        Returns: boolean
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
          | { uri: string }
          | { uri: string; content: string; content_type: string }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
      }
      http_get: {
        Args: { uri: string } | { uri: string; data: Json }
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
        Args: { uri: string; content: string; content_type: string }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
      }
      http_post: {
        Args:
          | { uri: string; content: string; content_type: string }
          | { uri: string; data: Json }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
      }
      http_put: {
        Args: { uri: string; content: string; content_type: string }
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
      [_ in never]: never
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

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
