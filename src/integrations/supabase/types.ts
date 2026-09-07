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
      agent_approval_audit: {
        Row: {
          agent_id: string
          agent_name: string | null
          approval_method: string
          approved_by: string | null
          created_at: string
          id: string
          new_status: string
          previous_status: string
        }
        Insert: {
          agent_id: string
          agent_name?: string | null
          approval_method?: string
          approved_by?: string | null
          created_at?: string
          id?: string
          new_status: string
          previous_status: string
        }
        Update: {
          agent_id?: string
          agent_name?: string | null
          approval_method?: string
          approved_by?: string | null
          created_at?: string
          id?: string
          new_status?: string
          previous_status?: string
        }
        Relationships: []
      }
      agents: {
        Row: {
          active_assignments: number
          applied_at: string
          approved_at: string | null
          area: string | null
          availability: Database["public"]["Enums"]["implementer_availability"]
          county: string | null
          email: string
          full_name: string
          id: string
          id_number: string | null
          phone: string
          reason: string | null
          referral_code: string | null
          service_categories: string[]
          social: string | null
          status: string
          town: string | null
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          active_assignments?: number
          applied_at?: string
          approved_at?: string | null
          area?: string | null
          availability?: Database["public"]["Enums"]["implementer_availability"]
          county?: string | null
          email: string
          full_name: string
          id: string
          id_number?: string | null
          phone: string
          reason?: string | null
          referral_code?: string | null
          service_categories?: string[]
          social?: string | null
          status?: string
          town?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          active_assignments?: number
          applied_at?: string
          approved_at?: string | null
          area?: string | null
          availability?: Database["public"]["Enums"]["implementer_availability"]
          county?: string | null
          email?: string
          full_name?: string
          id?: string
          id_number?: string | null
          phone?: string
          reason?: string | null
          referral_code?: string | null
          service_categories?: string[]
          social?: string | null
          status?: string
          town?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      businesses: {
        Row: {
          business_name: string
          contact_person: string
          county: string
          created_at: string
          description: string | null
          email: string
          id: string
          location: string
          owner_id: string
          phone: string
          pi_referral_code: string | null
          product_introducer_id: string | null
          status: Database["public"]["Enums"]["business_status"]
          updated_at: string
        }
        Insert: {
          business_name: string
          contact_person: string
          county: string
          created_at?: string
          description?: string | null
          email: string
          id?: string
          location: string
          owner_id: string
          phone: string
          pi_referral_code?: string | null
          product_introducer_id?: string | null
          status?: Database["public"]["Enums"]["business_status"]
          updated_at?: string
        }
        Update: {
          business_name?: string
          contact_person?: string
          county?: string
          created_at?: string
          description?: string | null
          email?: string
          id?: string
          location?: string
          owner_id?: string
          phone?: string
          pi_referral_code?: string | null
          product_introducer_id?: string | null
          status?: Database["public"]["Enums"]["business_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "businesses_product_introducer_id_fkey"
            columns: ["product_introducer_id"]
            isOneToOne: false
            referencedRelation: "product_introducers"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          active: boolean
          created_at: string
          id: string
          name: string
          parent_id: string | null
          slug: string
          sort_order: number
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          name: string
          parent_id?: string | null
          slug: string
          sort_order?: number
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          name?: string
          parent_id?: string | null
          slug?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      mpesa_payments: {
        Row: {
          amount: number | null
          checkout_request_id: string | null
          created_at: string
          id: string
          merchant_request_id: string | null
          mpesa_receipt_number: string | null
          order_id: string | null
          payment_status: Database["public"]["Enums"]["mpesa_payment_status"]
          phone_number: string | null
          result_code: number | null
          result_description: string | null
          transaction_date: string | null
          updated_at: string
        }
        Insert: {
          amount?: number | null
          checkout_request_id?: string | null
          created_at?: string
          id?: string
          merchant_request_id?: string | null
          mpesa_receipt_number?: string | null
          order_id?: string | null
          payment_status?: Database["public"]["Enums"]["mpesa_payment_status"]
          phone_number?: string | null
          result_code?: number | null
          result_description?: string | null
          transaction_date?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number | null
          checkout_request_id?: string | null
          created_at?: string
          id?: string
          merchant_request_id?: string | null
          mpesa_receipt_number?: string | null
          order_id?: string | null
          payment_status?: Database["public"]["Enums"]["mpesa_payment_status"]
          phone_number?: string | null
          result_code?: number | null
          result_description?: string | null
          transaction_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mpesa_payments_order_fk"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "sales_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          link: string | null
          read_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      order_assignment_history: {
        Row: {
          changed_by: string | null
          created_at: string
          from_agent_id: string | null
          id: string
          notes: string | null
          order_id: string
          reason: string | null
          to_agent_id: string | null
        }
        Insert: {
          changed_by?: string | null
          created_at?: string
          from_agent_id?: string | null
          id?: string
          notes?: string | null
          order_id: string
          reason?: string | null
          to_agent_id?: string | null
        }
        Update: {
          changed_by?: string | null
          created_at?: string
          from_agent_id?: string | null
          id?: string
          notes?: string | null
          order_id?: string
          reason?: string | null
          to_agent_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_assignment_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "sales_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_status_history: {
        Row: {
          changed_by: string | null
          changed_by_role: string | null
          created_at: string
          from_status: string | null
          id: string
          notes: string | null
          order_id: string
          to_status: string
        }
        Insert: {
          changed_by?: string | null
          changed_by_role?: string | null
          created_at?: string
          from_status?: string | null
          id?: string
          notes?: string | null
          order_id: string
          to_status: string
        }
        Update: {
          changed_by?: string | null
          changed_by_role?: string | null
          created_at?: string
          from_status?: string | null
          id?: string
          notes?: string | null
          order_id?: string
          to_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_status_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "sales_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      pi_commissions: {
        Row: {
          admin_note: string | null
          business_id: string | null
          commission_amount: number
          created_at: string
          id: string
          order_id: string
          paid_at: string | null
          payment_reference: string | null
          product_id: string | null
          product_introducer_id: string
          product_name: string | null
          rate: number
          sale_amount: number
          status: string
          updated_at: string
        }
        Insert: {
          admin_note?: string | null
          business_id?: string | null
          commission_amount?: number
          created_at?: string
          id?: string
          order_id: string
          paid_at?: string | null
          payment_reference?: string | null
          product_id?: string | null
          product_introducer_id: string
          product_name?: string | null
          rate?: number
          sale_amount?: number
          status?: string
          updated_at?: string
        }
        Update: {
          admin_note?: string | null
          business_id?: string | null
          commission_amount?: number
          created_at?: string
          id?: string
          order_id?: string
          paid_at?: string | null
          payment_reference?: string | null
          product_id?: string | null
          product_introducer_id?: string
          product_name?: string | null
          rate?: number
          sale_amount?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pi_commissions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pi_commissions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "sales_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pi_commissions_product_introducer_id_fkey"
            columns: ["product_introducer_id"]
            isOneToOne: false
            referencedRelation: "product_introducers"
            referencedColumns: ["id"]
          },
        ]
      }
      pia_activity_log: {
        Row: {
          action: string
          actor_id: string | null
          actor_role: string | null
          agent_id: string | null
          created_at: string
          details: Json | null
          id: string
          submission_id: string | null
          supplier_id: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_role?: string | null
          agent_id?: string | null
          created_at?: string
          details?: Json | null
          id?: string
          submission_id?: string | null
          supplier_id?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_role?: string | null
          agent_id?: string | null
          created_at?: string
          details?: Json | null
          id?: string
          submission_id?: string | null
          supplier_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pia_activity_log_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "product_intro_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pia_activity_log_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "product_submissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pia_activity_log_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "supplier_introductions"
            referencedColumns: ["id"]
          },
        ]
      }
      pia_commission_adjustments: {
        Row: {
          adjustment_type: string
          admin_id: string | null
          agent_id: string | null
          amount: number
          commission_id: string | null
          created_at: string
          id: string
          internal_note: string | null
          reason: string
        }
        Insert: {
          adjustment_type: string
          admin_id?: string | null
          agent_id?: string | null
          amount: number
          commission_id?: string | null
          created_at?: string
          id?: string
          internal_note?: string | null
          reason: string
        }
        Update: {
          adjustment_type?: string
          admin_id?: string | null
          agent_id?: string | null
          amount?: number
          commission_id?: string | null
          created_at?: string
          id?: string
          internal_note?: string | null
          reason?: string
        }
        Relationships: [
          {
            foreignKeyName: "pia_commission_adjustments_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "product_intro_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pia_commission_adjustments_commission_id_fkey"
            columns: ["commission_id"]
            isOneToOne: false
            referencedRelation: "pia_commissions"
            referencedColumns: ["id"]
          },
        ]
      }
      pia_commission_audit: {
        Row: {
          actor_id: string | null
          agent_id: string | null
          amount: number | null
          commission_id: string | null
          created_at: string
          details: Json
          event: string
          from_status: string | null
          id: string
          to_status: string | null
        }
        Insert: {
          actor_id?: string | null
          agent_id?: string | null
          amount?: number | null
          commission_id?: string | null
          created_at?: string
          details?: Json
          event: string
          from_status?: string | null
          id?: string
          to_status?: string | null
        }
        Update: {
          actor_id?: string | null
          agent_id?: string | null
          amount?: number | null
          commission_id?: string | null
          created_at?: string
          details?: Json
          event?: string
          from_status?: string | null
          id?: string
          to_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pia_commission_audit_commission_id_fkey"
            columns: ["commission_id"]
            isOneToOne: false
            referencedRelation: "pia_commissions"
            referencedColumns: ["id"]
          },
        ]
      }
      pia_commission_payments: {
        Row: {
          admin_id: string | null
          admin_note: string | null
          amount: number
          commission_id: string
          created_at: string
          id: string
          mpesa_number: string | null
          payment_date: string
          payment_method: string
          payment_reference: string | null
        }
        Insert: {
          admin_id?: string | null
          admin_note?: string | null
          amount: number
          commission_id: string
          created_at?: string
          id?: string
          mpesa_number?: string | null
          payment_date?: string
          payment_method: string
          payment_reference?: string | null
        }
        Update: {
          admin_id?: string | null
          admin_note?: string | null
          amount?: number
          commission_id?: string
          created_at?: string
          id?: string
          mpesa_number?: string | null
          payment_date?: string
          payment_method?: string
          payment_reference?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pia_commission_payments_commission_id_fkey"
            columns: ["commission_id"]
            isOneToOne: false
            referencedRelation: "pia_commissions"
            referencedColumns: ["id"]
          },
        ]
      }
      pia_commissions: {
        Row: {
          admin_notes: string | null
          agent_code: string | null
          agent_id: string | null
          agent_name: string | null
          approved_at: string | null
          commission_amount: number
          commission_rate: number
          commission_status: string
          completion_date: string | null
          confirmed_at: string | null
          created_at: string
          customer_name: string | null
          customer_phone: string | null
          dispute_status: string | null
          id: string
          line_value: number
          order_date: string | null
          order_id: string
          order_item_key: string
          order_status: string | null
          paid_at: string | null
          payment_method: string | null
          payment_reference: string | null
          product_id: string | null
          product_name: string
          quantity: number
          reversal_reason: string | null
          supplier_introduction_id: string | null
          supplier_name: string | null
          unit_price: number
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          agent_code?: string | null
          agent_id?: string | null
          agent_name?: string | null
          approved_at?: string | null
          commission_amount?: number
          commission_rate?: number
          commission_status?: string
          completion_date?: string | null
          confirmed_at?: string | null
          created_at?: string
          customer_name?: string | null
          customer_phone?: string | null
          dispute_status?: string | null
          id?: string
          line_value?: number
          order_date?: string | null
          order_id: string
          order_item_key: string
          order_status?: string | null
          paid_at?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          product_id?: string | null
          product_name: string
          quantity?: number
          reversal_reason?: string | null
          supplier_introduction_id?: string | null
          supplier_name?: string | null
          unit_price?: number
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          agent_code?: string | null
          agent_id?: string | null
          agent_name?: string | null
          approved_at?: string | null
          commission_amount?: number
          commission_rate?: number
          commission_status?: string
          completion_date?: string | null
          confirmed_at?: string | null
          created_at?: string
          customer_name?: string | null
          customer_phone?: string | null
          dispute_status?: string | null
          id?: string
          line_value?: number
          order_date?: string | null
          order_id?: string
          order_item_key?: string
          order_status?: string | null
          paid_at?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          product_id?: string | null
          product_name?: string
          quantity?: number
          reversal_reason?: string | null
          supplier_introduction_id?: string | null
          supplier_name?: string | null
          unit_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pia_commissions_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "product_intro_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pia_commissions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "sales_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pia_commissions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pia_commissions_supplier_introduction_id_fkey"
            columns: ["supplier_introduction_id"]
            isOneToOne: false
            referencedRelation: "supplier_introductions"
            referencedColumns: ["id"]
          },
        ]
      }
      product_images: {
        Row: {
          created_at: string
          id: string
          is_primary: boolean
          product_id: string
          sort_order: number
          storage_path: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_primary?: boolean
          product_id: string
          sort_order?: number
          storage_path: string
        }
        Update: {
          created_at?: string
          id?: string
          is_primary?: boolean
          product_id?: string
          sort_order?: number
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_intro_agents: {
        Row: {
          admin_notes: string | null
          agent_code: string | null
          applied_at: string
          approved_at: string | null
          approved_by: string | null
          assigned_region: string | null
          county: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          last_login_at: string | null
          mpesa_number: string | null
          national_id: string | null
          phone: string
          referred_by_code: string | null
          status: Database["public"]["Enums"]["pia_status"]
          town: string | null
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          agent_code?: string | null
          applied_at?: string
          approved_at?: string | null
          approved_by?: string | null
          assigned_region?: string | null
          county?: string | null
          created_at?: string
          email: string
          full_name: string
          id: string
          last_login_at?: string | null
          mpesa_number?: string | null
          national_id?: string | null
          phone: string
          referred_by_code?: string | null
          status?: Database["public"]["Enums"]["pia_status"]
          town?: string | null
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          agent_code?: string | null
          applied_at?: string
          approved_at?: string | null
          approved_by?: string | null
          assigned_region?: string | null
          county?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          last_login_at?: string | null
          mpesa_number?: string | null
          national_id?: string | null
          phone?: string
          referred_by_code?: string | null
          status?: Database["public"]["Enums"]["pia_status"]
          town?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      product_introducers: {
        Row: {
          applied_at: string
          approved_at: string | null
          county: string | null
          email: string
          full_name: string
          id: string
          id_number: string | null
          mpesa_number: string | null
          payment_method: string
          phone: string
          referral_code: string | null
          status: string
          town: string | null
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          applied_at?: string
          approved_at?: string | null
          county?: string | null
          email: string
          full_name: string
          id: string
          id_number?: string | null
          mpesa_number?: string | null
          payment_method?: string
          phone: string
          referral_code?: string | null
          status?: string
          town?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          applied_at?: string
          approved_at?: string | null
          county?: string | null
          email?: string
          full_name?: string
          id?: string
          id_number?: string | null
          mpesa_number?: string | null
          payment_method?: string
          phone?: string
          referral_code?: string | null
          status?: string
          town?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      product_submission_reviews: {
        Row: {
          action: string
          admin_id: string | null
          created_at: string
          from_status: string | null
          id: string
          notes: string | null
          reason_codes: string[] | null
          submission_id: string
          to_status: string | null
        }
        Insert: {
          action: string
          admin_id?: string | null
          created_at?: string
          from_status?: string | null
          id?: string
          notes?: string | null
          reason_codes?: string[] | null
          submission_id: string
          to_status?: string | null
        }
        Update: {
          action?: string
          admin_id?: string | null
          created_at?: string
          from_status?: string | null
          id?: string
          notes?: string | null
          reason_codes?: string[] | null
          submission_id?: string
          to_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_submission_reviews_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "product_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      product_submissions: {
        Row: {
          admin_notes: string | null
          agent_code: string | null
          agent_id: string
          agent_notes: string | null
          approved_at: string | null
          approved_by: string | null
          brand: string | null
          category: string | null
          condition: string | null
          confirmations: Json | null
          created_at: string
          delivery_available: boolean | null
          delivery_locations: string | null
          description: string | null
          id: string
          images: string[] | null
          main_image: string | null
          min_order_qty: number | null
          model: string | null
          name: string
          proposed_selling_price: number | null
          published_at: string | null
          published_product_id: string | null
          rejection_reason: string | null
          resubmission_allowed: boolean | null
          review_started_at: string | null
          reviewer_id: string | null
          specifications: string | null
          status: Database["public"]["Enums"]["product_submission_status"]
          stock: number | null
          stock_status: string | null
          subcategory: string | null
          supplier_introduction_id: string | null
          supplier_price: number | null
          updated_at: string
          warranty: string | null
        }
        Insert: {
          admin_notes?: string | null
          agent_code?: string | null
          agent_id: string
          agent_notes?: string | null
          approved_at?: string | null
          approved_by?: string | null
          brand?: string | null
          category?: string | null
          condition?: string | null
          confirmations?: Json | null
          created_at?: string
          delivery_available?: boolean | null
          delivery_locations?: string | null
          description?: string | null
          id?: string
          images?: string[] | null
          main_image?: string | null
          min_order_qty?: number | null
          model?: string | null
          name: string
          proposed_selling_price?: number | null
          published_at?: string | null
          published_product_id?: string | null
          rejection_reason?: string | null
          resubmission_allowed?: boolean | null
          review_started_at?: string | null
          reviewer_id?: string | null
          specifications?: string | null
          status?: Database["public"]["Enums"]["product_submission_status"]
          stock?: number | null
          stock_status?: string | null
          subcategory?: string | null
          supplier_introduction_id?: string | null
          supplier_price?: number | null
          updated_at?: string
          warranty?: string | null
        }
        Update: {
          admin_notes?: string | null
          agent_code?: string | null
          agent_id?: string
          agent_notes?: string | null
          approved_at?: string | null
          approved_by?: string | null
          brand?: string | null
          category?: string | null
          condition?: string | null
          confirmations?: Json | null
          created_at?: string
          delivery_available?: boolean | null
          delivery_locations?: string | null
          description?: string | null
          id?: string
          images?: string[] | null
          main_image?: string | null
          min_order_qty?: number | null
          model?: string | null
          name?: string
          proposed_selling_price?: number | null
          published_at?: string | null
          published_product_id?: string | null
          rejection_reason?: string | null
          resubmission_allowed?: boolean | null
          review_started_at?: string | null
          reviewer_id?: string | null
          specifications?: string | null
          status?: Database["public"]["Enums"]["product_submission_status"]
          stock?: number | null
          stock_status?: string | null
          subcategory?: string | null
          supplier_introduction_id?: string | null
          supplier_price?: number | null
          updated_at?: string
          warranty?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_submissions_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "product_intro_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_submissions_published_product_id_fkey"
            columns: ["published_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_submissions_supplier_introduction_id_fkey"
            columns: ["supplier_introduction_id"]
            isOneToOne: false
            referencedRelation: "supplier_introductions"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          availability: string
          business_id: string
          category_id: string | null
          county: string | null
          created_at: string
          custom_made: boolean
          description_long: string | null
          description_short: string | null
          dimensions: string | null
          id: string
          introduced_by_pia_id: string | null
          lead_time: string | null
          material: string | null
          pia_agent_code: string | null
          pia_agent_name: string | null
          pia_date_approved: string | null
          pia_date_introduced: string | null
          pia_date_published: string | null
          pia_submission_id: string | null
          pia_supplier_introduction_id: string | null
          price_kes: number
          rejection_reason: string | null
          status: Database["public"]["Enums"]["product_status"]
          stock: number
          title: string
          updated_at: string
        }
        Insert: {
          availability?: string
          business_id: string
          category_id?: string | null
          county?: string | null
          created_at?: string
          custom_made?: boolean
          description_long?: string | null
          description_short?: string | null
          dimensions?: string | null
          id?: string
          introduced_by_pia_id?: string | null
          lead_time?: string | null
          material?: string | null
          pia_agent_code?: string | null
          pia_agent_name?: string | null
          pia_date_approved?: string | null
          pia_date_introduced?: string | null
          pia_date_published?: string | null
          pia_submission_id?: string | null
          pia_supplier_introduction_id?: string | null
          price_kes: number
          rejection_reason?: string | null
          status?: Database["public"]["Enums"]["product_status"]
          stock?: number
          title: string
          updated_at?: string
        }
        Update: {
          availability?: string
          business_id?: string
          category_id?: string | null
          county?: string | null
          created_at?: string
          custom_made?: boolean
          description_long?: string | null
          description_short?: string | null
          dimensions?: string | null
          id?: string
          introduced_by_pia_id?: string | null
          lead_time?: string | null
          material?: string | null
          pia_agent_code?: string | null
          pia_agent_name?: string | null
          pia_date_approved?: string | null
          pia_date_introduced?: string | null
          pia_date_published?: string | null
          pia_submission_id?: string | null
          pia_supplier_introduction_id?: string | null
          price_kes?: number
          rejection_reason?: string | null
          status?: Database["public"]["Enums"]["product_status"]
          stock?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_introduced_by_pia_id_fkey"
            columns: ["introduced_by_pia_id"]
            isOneToOne: false
            referencedRelation: "product_intro_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_pia_submission_id_fkey"
            columns: ["pia_submission_id"]
            isOneToOne: false
            referencedRelation: "product_submissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_pia_supplier_introduction_id_fkey"
            columns: ["pia_supplier_introduction_id"]
            isOneToOne: false
            referencedRelation: "supplier_introductions"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          account_type: Database["public"]["Enums"]["account_type"]
          avatar_url: string | null
          county: string | null
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          account_type?: Database["public"]["Enums"]["account_type"]
          avatar_url?: string | null
          county?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          account_type?: Database["public"]["Enums"]["account_type"]
          avatar_url?: string | null
          county?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      referral_agents: {
        Row: {
          active: boolean
          code: string
          created_at: string
          id: string
          name: string
          phone: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          id?: string
          name: string
          phone: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          id?: string
          name?: string
          phone?: string
          updated_at?: string
        }
        Relationships: []
      }
      sales_orders: {
        Row: {
          account_type: string | null
          admin_approved: boolean
          agent_id: string | null
          agent_name: string | null
          approved_at: string | null
          assigned_agent_id: string | null
          assigned_at: string | null
          assigned_by: string | null
          assignment_notes: string | null
          commission_amount: number
          commission_status: string
          created_at: string
          customer_area: string | null
          customer_county: string | null
          customer_email: string | null
          customer_name: string | null
          customer_phone: string | null
          customer_town: string | null
          id: string
          implementation_status: Database["public"]["Enums"]["implementation_status"]
          items: Json
          last_status_at: string | null
          order_type: string
          payment_status: string
          referral_code: string | null
          status: string
          total: number
          tracking_status: string
          user_id: string | null
        }
        Insert: {
          account_type?: string | null
          admin_approved?: boolean
          agent_id?: string | null
          agent_name?: string | null
          approved_at?: string | null
          assigned_agent_id?: string | null
          assigned_at?: string | null
          assigned_by?: string | null
          assignment_notes?: string | null
          commission_amount?: number
          commission_status?: string
          created_at?: string
          customer_area?: string | null
          customer_county?: string | null
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          customer_town?: string | null
          id?: string
          implementation_status?: Database["public"]["Enums"]["implementation_status"]
          items: Json
          last_status_at?: string | null
          order_type?: string
          payment_status?: string
          referral_code?: string | null
          status?: string
          total?: number
          tracking_status?: string
          user_id?: string | null
        }
        Update: {
          account_type?: string | null
          admin_approved?: boolean
          agent_id?: string | null
          agent_name?: string | null
          approved_at?: string | null
          assigned_agent_id?: string | null
          assigned_at?: string | null
          assigned_by?: string | null
          assignment_notes?: string | null
          commission_amount?: number
          commission_status?: string
          created_at?: string
          customer_area?: string | null
          customer_county?: string | null
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          customer_town?: string | null
          id?: string
          implementation_status?: Database["public"]["Enums"]["implementation_status"]
          items?: Json
          last_status_at?: string | null
          order_type?: string
          payment_status?: string
          referral_code?: string | null
          status?: string
          total?: number
          tracking_status?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_orders_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_orders_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_orders_assigned_agent_id_fkey"
            columns: ["assigned_agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_orders_assigned_agent_id_fkey"
            columns: ["assigned_agent_id"]
            isOneToOne: false
            referencedRelation: "agents_public"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_introductions: {
        Row: {
          address: string | null
          admin_notes: string | null
          agent_code: string | null
          agent_id: string
          alt_phone: string | null
          contact_person: string | null
          county: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          phone: string
          product_categories: string[] | null
          registration_number: string | null
          status: Database["public"]["Enums"]["supplier_intro_status"]
          town: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          admin_notes?: string | null
          agent_code?: string | null
          agent_id: string
          alt_phone?: string | null
          contact_person?: string | null
          county?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          phone: string
          product_categories?: string[] | null
          registration_number?: string | null
          status?: Database["public"]["Enums"]["supplier_intro_status"]
          town?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          admin_notes?: string | null
          agent_code?: string | null
          agent_id?: string
          alt_phone?: string | null
          contact_person?: string | null
          county?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          phone?: string
          product_categories?: string[] | null
          registration_number?: string | null
          status?: Database["public"]["Enums"]["supplier_intro_status"]
          town?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_introductions_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "product_intro_agents"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      agents_public: {
        Row: {
          full_name: string | null
          id: string | null
          referral_code: string | null
        }
        Insert: {
          full_name?: string | null
          id?: string | null
          referral_code?: string | null
        }
        Update: {
          full_name?: string | null
          id?: string | null
          referral_code?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      assign_implementer: {
        Args: {
          _new_agent_id: string
          _notes?: string
          _order_id: string
          _reason?: string
        }
        Returns: undefined
      }
      bulk_approve_pending_agents: {
        Args: never
        Returns: {
          approved_count: number
          failed_count: number
          skipped_count: number
        }[]
      }
      get_assignment_candidates: {
        Args: { _order_id: string }
        Returns: {
          active_assignments: number
          area: string
          availability: Database["public"]["Enums"]["implementer_availability"]
          county: string
          full_name: string
          id: string
          match_label: string
          match_rank: number
          phone: string
          referral_code: string
          town: string
          whatsapp: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      lookup_referral_agent: {
        Args: { _code: string }
        Returns: {
          code: string
          id: string
          name: string
          phone: string
        }[]
      }
      mark_pia_commission_paid: {
        Args: {
          _amount: number
          _commission_id: string
          _method: string
          _mpesa?: string
          _note?: string
          _reference: string
        }
        Returns: undefined
      }
      publish_product_submission: {
        Args: { _submission_id: string }
        Returns: string
      }
      set_pia_commission_status: {
        Args: { _commission_id: string; _new_status: string; _note?: string }
        Returns: undefined
      }
      update_implementation_status: {
        Args: {
          _new_status: Database["public"]["Enums"]["implementation_status"]
          _notes?: string
          _order_id: string
        }
        Returns: undefined
      }
    }
    Enums: {
      account_type: "personal" | "business"
      app_role:
        | "admin"
        | "business"
        | "customer"
        | "agent"
        | "product_introducer"
        | "product_intro_agent"
      business_status: "pending" | "approved" | "suspended"
      implementation_status:
        | "unassigned"
        | "assigned"
        | "customer_contacted"
        | "visit_scheduled"
        | "quotation_sent"
        | "awaiting_customer_confirmation"
        | "confirmed"
        | "in_progress"
        | "awaiting_payment"
        | "completed"
        | "unable_to_complete"
        | "cancelled"
      implementer_availability:
        | "available"
        | "busy"
        | "unavailable"
        | "inactive"
      mpesa_payment_status: "pending" | "paid" | "failed" | "cancelled"
      pia_status: "pending" | "active" | "suspended" | "rejected"
      product_status:
        | "draft"
        | "submitted"
        | "approved"
        | "rejected"
        | "archived"
      product_submission_status:
        | "draft"
        | "submitted"
        | "under_review"
        | "changes_requested"
        | "resubmitted"
        | "approved"
        | "live"
        | "rejected"
        | "archived"
        | "suspended"
      supplier_intro_status:
        | "new"
        | "contacted"
        | "verification_pending"
        | "verified"
        | "active"
        | "rejected"
        | "suspended"
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
      account_type: ["personal", "business"],
      app_role: [
        "admin",
        "business",
        "customer",
        "agent",
        "product_introducer",
        "product_intro_agent",
      ],
      business_status: ["pending", "approved", "suspended"],
      implementation_status: [
        "unassigned",
        "assigned",
        "customer_contacted",
        "visit_scheduled",
        "quotation_sent",
        "awaiting_customer_confirmation",
        "confirmed",
        "in_progress",
        "awaiting_payment",
        "completed",
        "unable_to_complete",
        "cancelled",
      ],
      implementer_availability: [
        "available",
        "busy",
        "unavailable",
        "inactive",
      ],
      mpesa_payment_status: ["pending", "paid", "failed", "cancelled"],
      pia_status: ["pending", "active", "suspended", "rejected"],
      product_status: [
        "draft",
        "submitted",
        "approved",
        "rejected",
        "archived",
      ],
      product_submission_status: [
        "draft",
        "submitted",
        "under_review",
        "changes_requested",
        "resubmitted",
        "approved",
        "live",
        "rejected",
        "archived",
        "suspended",
      ],
      supplier_intro_status: [
        "new",
        "contacted",
        "verification_pending",
        "verified",
        "active",
        "rejected",
        "suspended",
      ],
    },
  },
} as const
