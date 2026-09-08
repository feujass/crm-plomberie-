/** Généré par supabase gen types typescript — ne pas éditer à la main. */
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
      affiliate_applications: {
        Row: {
          audience_size: string | null
          audience_type: string
          brand_name: string
          created_at: string
          display_name: string
          email: string
          id: string
          partner_id: string | null
          phone: string | null
          pitch: string
          reviewed_at: string | null
          status: string
          website_or_social: string | null
        }
        Insert: {
          audience_size?: string | null
          audience_type: string
          brand_name: string
          created_at?: string
          display_name: string
          email: string
          id?: string
          partner_id?: string | null
          phone?: string | null
          pitch: string
          reviewed_at?: string | null
          status?: string
          website_or_social?: string | null
        }
        Update: {
          audience_size?: string | null
          audience_type?: string
          brand_name?: string
          created_at?: string
          display_name?: string
          email?: string
          id?: string
          partner_id?: string | null
          phone?: string | null
          pitch?: string
          reviewed_at?: string | null
          status?: string
          website_or_social?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_applications_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "affiliate_partners"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_clicks: {
        Row: {
          created_at: string
          id: string
          landing_path: string | null
          partner_id: string
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          landing_path?: string | null
          partner_id: string
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          landing_path?: string | null
          partner_id?: string
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_clicks_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "affiliate_partners"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_commissions: {
        Row: {
          commission_eur: number
          created_at: string
          gross_amount_eur: number
          id: string
          partner_id: string
          period_start: string | null
          referred_user_id: string | null
          status: string
          stripe_invoice_id: string | null
        }
        Insert: {
          commission_eur: number
          created_at?: string
          gross_amount_eur: number
          id?: string
          partner_id: string
          period_start?: string | null
          referred_user_id?: string | null
          status?: string
          stripe_invoice_id?: string | null
        }
        Update: {
          commission_eur?: number
          created_at?: string
          gross_amount_eur?: number
          id?: string
          partner_id?: string
          period_start?: string | null
          referred_user_id?: string | null
          status?: string
          stripe_invoice_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_commissions_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "affiliate_partners"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_partners: {
        Row: {
          brand_name: string
          commission_rate_percent: number
          created_at: string
          display_name: string
          email: string
          id: string
          payout_min_eur: number
          phone: string | null
          referral_code: string
          slug: string
          status: string
          stripe_connect_account_id: string | null
          stripe_connect_onboarded: boolean
          total_earned_eur: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          brand_name: string
          commission_rate_percent?: number
          created_at?: string
          display_name: string
          email: string
          id?: string
          payout_min_eur?: number
          phone?: string | null
          referral_code: string
          slug: string
          status?: string
          stripe_connect_account_id?: string | null
          stripe_connect_onboarded?: boolean
          total_earned_eur?: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          brand_name?: string
          commission_rate_percent?: number
          created_at?: string
          display_name?: string
          email?: string
          id?: string
          payout_min_eur?: number
          phone?: string | null
          referral_code?: string
          slug?: string
          status?: string
          stripe_connect_account_id?: string | null
          stripe_connect_onboarded?: boolean
          total_earned_eur?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      affiliate_payouts: {
        Row: {
          amount_eur: number
          created_at: string
          id: string
          partner_id: string
          status: string
          stripe_transfer_id: string | null
        }
        Insert: {
          amount_eur: number
          created_at?: string
          id?: string
          partner_id: string
          status?: string
          stripe_transfer_id?: string | null
        }
        Update: {
          amount_eur?: number
          created_at?: string
          id?: string
          partner_id?: string
          status?: string
          stripe_transfer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_payouts_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "affiliate_partners"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_referrals: {
        Row: {
          converted_at: string | null
          created_at: string
          id: string
          partner_id: string
          referred_user_id: string
          status: string
          subscribed_plan: string | null
        }
        Insert: {
          converted_at?: string | null
          created_at?: string
          id?: string
          partner_id: string
          referred_user_id: string
          status?: string
          subscribed_plan?: string | null
        }
        Update: {
          converted_at?: string | null
          created_at?: string
          id?: string
          partner_id?: string
          referred_user_id?: string
          status?: string
          subscribed_plan?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_referrals_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "affiliate_partners"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_chat_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          role: string
          session_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          role: string
          session_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          role?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_chat_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "ai_chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_chat_sessions: {
        Row: {
          created_at: string
          id: string
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      analytics_ad_spend: {
        Row: {
          amount: number
          campaign: string
          period_days: number
          updated_at: string
        }
        Insert: {
          amount: number
          campaign: string
          period_days: number
          updated_at?: string
        }
        Update: {
          amount?: number
          campaign?: string
          period_days?: number
          updated_at?: string
        }
        Relationships: []
      }
      analytics_events: {
        Row: {
          country: string | null
          created_at: string
          device: string | null
          event_type: string
          field: string | null
          id: string
          is_internal: boolean
          page_path: string
          properties: Json | null
          referrer: string | null
          session_id: string
          time_on_page_ms: number | null
          user_agent: string | null
          user_id: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
          value_filled: boolean | null
        }
        Insert: {
          country?: string | null
          created_at?: string
          device?: string | null
          event_type: string
          field?: string | null
          id?: string
          is_internal?: boolean
          page_path: string
          properties?: Json | null
          referrer?: string | null
          session_id: string
          time_on_page_ms?: number | null
          user_agent?: string | null
          user_id?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          value_filled?: boolean | null
        }
        Update: {
          country?: string | null
          created_at?: string
          device?: string | null
          event_type?: string
          field?: string | null
          id?: string
          is_internal?: boolean
          page_path?: string
          properties?: Json | null
          referrer?: string | null
          session_id?: string
          time_on_page_ms?: number | null
          user_agent?: string | null
          user_id?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          value_filled?: boolean | null
        }
        Relationships: []
      }
      analytics_milestones: {
        Row: {
          created_at: string
          date: string
          id: string
          label: string
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          label: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          label?: string
        }
        Relationships: []
      }
      analytics_sessions: {
        Row: {
          created_at: string
          device_type: string | null
          landing_path: string | null
          referrer: string | null
          referrer_domain: string | null
          session_id: string
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
          viewport_width: number | null
        }
        Insert: {
          created_at?: string
          device_type?: string | null
          landing_path?: string | null
          referrer?: string | null
          referrer_domain?: string | null
          session_id: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          viewport_width?: number | null
        }
        Update: {
          created_at?: string
          device_type?: string | null
          landing_path?: string | null
          referrer?: string | null
          referrer_domain?: string | null
          session_id?: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          viewport_width?: number | null
        }
        Relationships: []
      }
      booking_requests: {
        Row: {
          address: string
          ai_suggested_slots: Json
          channel: string
          client_id: number | null
          contact_email: string | null
          contact_name: string
          contact_phone: string
          created_at: string
          id: number
          internal_notes: string
          problem_detail: string
          problem_type: string
          scheduled_at: string | null
          status: string
          updated_at: string
          urgency: string
          user_id: number
        }
        Insert: {
          address?: string
          ai_suggested_slots?: Json
          channel?: string
          client_id?: number | null
          contact_email?: string | null
          contact_name?: string
          contact_phone?: string
          created_at?: string
          id?: number
          internal_notes?: string
          problem_detail?: string
          problem_type?: string
          scheduled_at?: string | null
          status?: string
          updated_at?: string
          urgency?: string
          user_id: number
        }
        Update: {
          address?: string
          ai_suggested_slots?: Json
          channel?: string
          client_id?: number | null
          contact_email?: string | null
          contact_name?: string
          contact_phone?: string
          created_at?: string
          id?: number
          internal_notes?: string
          problem_detail?: string
          problem_type?: string
          scheduled_at?: string | null
          status?: string
          updated_at?: string
          urgency?: string
          user_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "booking_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      chantier_documents: {
        Row: {
          chantier_id: string
          created_at: string
          id: string
          label: string | null
          url: string
        }
        Insert: {
          chantier_id: string
          created_at?: string
          id?: string
          label?: string | null
          url: string
        }
        Update: {
          chantier_id?: string
          created_at?: string
          id?: string
          label?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "chantier_documents_chantier_id_fkey"
            columns: ["chantier_id"]
            isOneToOne: false
            referencedRelation: "chantiers"
            referencedColumns: ["id"]
          },
        ]
      }
      chantier_journal: {
        Row: {
          chantier_id: string
          created_at: string
          date: string
          description: string
          duree_h: number | null
          id: string
          technicien: string | null
          user_id: string
        }
        Insert: {
          chantier_id: string
          created_at?: string
          date?: string
          description: string
          duree_h?: number | null
          id?: string
          technicien?: string | null
          user_id: string
        }
        Update: {
          chantier_id?: string
          created_at?: string
          date?: string
          description?: string
          duree_h?: number | null
          id?: string
          technicien?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chantier_journal_chantier_id_fkey"
            columns: ["chantier_id"]
            isOneToOne: false
            referencedRelation: "chantiers"
            referencedColumns: ["id"]
          },
        ]
      }
      chantier_photos: {
        Row: {
          chantier_id: string
          created_at: string
          id: string
          url: string
        }
        Insert: {
          chantier_id: string
          created_at?: string
          id?: string
          url: string
        }
        Update: {
          chantier_id?: string
          created_at?: string
          id?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "chantier_photos_chantier_id_fkey"
            columns: ["chantier_id"]
            isOneToOne: false
            referencedRelation: "chantiers"
            referencedColumns: ["id"]
          },
        ]
      }
      chantiers: {
        Row: {
          adresse: string | null
          avancement: number
          client_id: string | null
          created_at: string
          date_debut: string | null
          date_fin: string | null
          devis_id: string | null
          id: string
          nom: string
          notes: string | null
          statut: string
          updated_at: string
          user_id: string
        }
        Insert: {
          adresse?: string | null
          avancement?: number
          client_id?: string | null
          created_at?: string
          date_debut?: string | null
          date_fin?: string | null
          devis_id?: string | null
          id?: string
          nom: string
          notes?: string | null
          statut?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          adresse?: string | null
          avancement?: number
          client_id?: string | null
          created_at?: string
          date_debut?: string | null
          date_fin?: string | null
          devis_id?: string | null
          id?: string
          nom?: string
          notes?: string | null
          statut?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chantiers_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chantiers_devis_id_fkey"
            columns: ["devis_id"]
            isOneToOne: false
            referencedRelation: "devis"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          adresse: string | null
          adresse_facturation_cp: string | null
          adresse_facturation_ligne1: string | null
          adresse_facturation_ligne2: string | null
          adresse_facturation_pays: string | null
          adresse_facturation_ville: string | null
          adresse_livraison_cp: string | null
          adresse_livraison_ligne1: string | null
          adresse_livraison_ligne2: string | null
          adresse_livraison_pays: string | null
          adresse_livraison_ville: string | null
          adresse_structure_confirmee_at: string | null
          adresse_structure_proposition: Json | null
          categorie_fiscale: string | null
          chorus_service_code: string | null
          created_at: string
          email: string | null
          id: string
          inactive: boolean
          nom: string
          notes: string | null
          prenom: string | null
          secteur_public: boolean | null
          siren: string | null
          siret: string | null
          tel: string | null
          tva_intracom: string | null
          type: string
          type_client: Database["public"]["Enums"]["type_client"] | null
          user_id: string
        }
        Insert: {
          adresse?: string | null
          adresse_facturation_cp?: string | null
          adresse_facturation_ligne1?: string | null
          adresse_facturation_ligne2?: string | null
          adresse_facturation_pays?: string | null
          adresse_facturation_ville?: string | null
          adresse_livraison_cp?: string | null
          adresse_livraison_ligne1?: string | null
          adresse_livraison_ligne2?: string | null
          adresse_livraison_pays?: string | null
          adresse_livraison_ville?: string | null
          adresse_structure_confirmee_at?: string | null
          adresse_structure_proposition?: Json | null
          categorie_fiscale?: string | null
          chorus_service_code?: string | null
          created_at?: string
          email?: string | null
          id?: string
          inactive?: boolean
          nom: string
          notes?: string | null
          prenom?: string | null
          secteur_public?: boolean | null
          siren?: string | null
          siret?: string | null
          tel?: string | null
          tva_intracom?: string | null
          type?: string
          type_client?: Database["public"]["Enums"]["type_client"] | null
          user_id: string
        }
        Update: {
          adresse?: string | null
          adresse_facturation_cp?: string | null
          adresse_facturation_ligne1?: string | null
          adresse_facturation_ligne2?: string | null
          adresse_facturation_pays?: string | null
          adresse_facturation_ville?: string | null
          adresse_livraison_cp?: string | null
          adresse_livraison_ligne1?: string | null
          adresse_livraison_ligne2?: string | null
          adresse_livraison_pays?: string | null
          adresse_livraison_ville?: string | null
          adresse_structure_confirmee_at?: string | null
          adresse_structure_proposition?: Json | null
          categorie_fiscale?: string | null
          chorus_service_code?: string | null
          created_at?: string
          email?: string | null
          id?: string
          inactive?: boolean
          nom?: string
          notes?: string | null
          prenom?: string | null
          secteur_public?: boolean | null
          siren?: string | null
          siret?: string | null
          tel?: string | null
          tva_intracom?: string | null
          type?: string
          type_client?: Database["public"]["Enums"]["type_client"] | null
          user_id?: string
        }
        Relationships: []
      }
      clients_legacy_bigint: {
        Row: {
          address: string
          email: string | null
          id: number
          last_project: string | null
          name: string
          phone: string
          segment: string
          user_id: number
        }
        Insert: {
          address: string
          email?: string | null
          id?: number
          last_project?: string | null
          name: string
          phone: string
          segment: string
          user_id: number
        }
        Update: {
          address?: string
          email?: string | null
          id?: number
          last_project?: string | null
          name?: string
          phone?: string
          segment?: string
          user_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "clients_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      compliance_audit_events: {
        Row: {
          action: string
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          payload: Json
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          payload?: Json
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          payload?: Json
          user_id?: string
        }
        Relationships: []
      }
      compliance_transmissions: {
        Row: {
          created_at: string
          detail: string | null
          facture_id: string | null
          id: string
          kind: string
          payload_snapshot: Json | null
          provider_ref: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          detail?: string | null
          facture_id?: string | null
          id?: string
          kind: string
          payload_snapshot?: Json | null
          provider_ref?: string | null
          status: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          detail?: string | null
          facture_id?: string | null
          id?: string
          kind?: string
          payload_snapshot?: Json | null
          provider_ref?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "compliance_transmissions_facture_id_fkey"
            columns: ["facture_id"]
            isOneToOne: false
            referencedRelation: "factures"
            referencedColumns: ["id"]
          },
        ]
      }
      demo_monthly_usage: {
        Row: {
          hit_count: number
          month_key: string
          updated_at: string
        }
        Insert: {
          hit_count?: number
          month_key: string
          updated_at?: string
        }
        Update: {
          hit_count?: number
          month_key?: string
          updated_at?: string
        }
        Relationships: []
      }
      demo_quotes: {
        Row: {
          created_at: string
          demo_session_id: string
          devis_id: string | null
          expires_at: string
          id: string
          line_count: number
          linked_at: string | null
          preview_lines: Json
          quote_json: Json
          total_ttc: number
          transcript: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          demo_session_id: string
          devis_id?: string | null
          expires_at?: string
          id?: string
          line_count?: number
          linked_at?: string | null
          preview_lines?: Json
          quote_json: Json
          total_ttc?: number
          transcript: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          demo_session_id?: string
          devis_id?: string | null
          expires_at?: string
          id?: string
          line_count?: number
          linked_at?: string | null
          preview_lines?: Json
          quote_json?: Json
          total_ttc?: number
          transcript?: string
          user_id?: string | null
        }
        Relationships: []
      }
      demo_rate_limit: {
        Row: {
          hit_count: number
          ip_hash: string
          window_start: string
          window_type: string
        }
        Insert: {
          hit_count?: number
          ip_hash: string
          window_start: string
          window_type: string
        }
        Update: {
          hit_count?: number
          ip_hash?: string
          window_start?: string
          window_type?: string
        }
        Relationships: []
      }
      devis: {
        Row: {
          adresse_chantier: string | null
          archived_at: string | null
          client_id: string | null
          created_at: string
          date_creation: string
          date_envoi: string | null
          date_expiration: string | null
          derniere_relance_at: string | null
          esign_envelope_id: string | null
          esign_proof: Json | null
          esign_provider: string | null
          esign_signed_at: string | null
          esign_status: string | null
          ia_questions: Json
          id: string
          notes: string | null
          numero: string
          pdf_url: string | null
          relance_count: number
          remise_type: string | null
          remise_value: number | null
          share_token: string
          statut: string
          total_ht: number
          total_ttc: number
          total_tva: number
          transcription_brute: string | null
          transcription_corrigee: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          adresse_chantier?: string | null
          archived_at?: string | null
          client_id?: string | null
          created_at?: string
          date_creation?: string
          date_envoi?: string | null
          date_expiration?: string | null
          derniere_relance_at?: string | null
          esign_envelope_id?: string | null
          esign_proof?: Json | null
          esign_provider?: string | null
          esign_signed_at?: string | null
          esign_status?: string | null
          ia_questions?: Json
          id?: string
          notes?: string | null
          numero: string
          pdf_url?: string | null
          relance_count?: number
          remise_type?: string | null
          remise_value?: number | null
          share_token?: string
          statut?: string
          total_ht?: number
          total_ttc?: number
          total_tva?: number
          transcription_brute?: string | null
          transcription_corrigee?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          adresse_chantier?: string | null
          archived_at?: string | null
          client_id?: string | null
          created_at?: string
          date_creation?: string
          date_envoi?: string | null
          date_expiration?: string | null
          derniere_relance_at?: string | null
          esign_envelope_id?: string | null
          esign_proof?: Json | null
          esign_provider?: string | null
          esign_signed_at?: string | null
          esign_status?: string | null
          ia_questions?: Json
          id?: string
          notes?: string | null
          numero?: string
          pdf_url?: string | null
          relance_count?: number
          remise_type?: string | null
          remise_value?: number | null
          share_token?: string
          statut?: string
          total_ht?: number
          total_ttc?: number
          total_tva?: number
          transcription_brute?: string | null
          transcription_corrigee?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "devis_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      devis_lignes: {
        Row: {
          catalogue_ouvrage_id: string | null
          designation: string
          devis_id: string
          id: string
          ligne_type: Database["public"]["Enums"]["ligne_type"] | null
          ordre: number
          origine_prix: string | null
          prix_ht: number
          quantite: number
          section: string | null
          source: string | null
          total_ht: number
          tva: number
          tva_alerte: string | null
          unite: string
        }
        Insert: {
          catalogue_ouvrage_id?: string | null
          designation: string
          devis_id: string
          id?: string
          ligne_type?: Database["public"]["Enums"]["ligne_type"] | null
          ordre?: number
          origine_prix?: string | null
          prix_ht?: number
          quantite?: number
          section?: string | null
          source?: string | null
          total_ht?: number
          tva?: number
          tva_alerte?: string | null
          unite?: string
        }
        Update: {
          catalogue_ouvrage_id?: string | null
          designation?: string
          devis_id?: string
          id?: string
          ligne_type?: Database["public"]["Enums"]["ligne_type"] | null
          ordre?: number
          origine_prix?: string | null
          prix_ht?: number
          quantite?: number
          section?: string | null
          source?: string | null
          total_ht?: number
          tva?: number
          tva_alerte?: string | null
          unite?: string
        }
        Relationships: [
          {
            foreignKeyName: "devis_lignes_catalogue_ouvrage_id_fkey"
            columns: ["catalogue_ouvrage_id"]
            isOneToOne: false
            referencedRelation: "ouvrages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "devis_lignes_devis_id_fkey"
            columns: ["devis_id"]
            isOneToOne: false
            referencedRelation: "devis"
            referencedColumns: ["id"]
          },
        ]
      }
      devis_notes_internes: {
        Row: {
          body: string
          created_at: string
          devis_id: string
          id: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          devis_id: string
          id?: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          devis_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "devis_notes_internes_devis_id_fkey"
            columns: ["devis_id"]
            isOneToOne: false
            referencedRelation: "devis"
            referencedColumns: ["id"]
          },
        ]
      }
      einvoicing_connections: {
        Row: {
          company_verification_status: string | null
          connected_at: string | null
          last_error: string | null
          last_invoice_event_id: string | null
          provider: string
          provider_company_id: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          company_verification_status?: string | null
          connected_at?: string | null
          last_error?: string | null
          last_invoice_event_id?: string | null
          provider?: string
          provider_company_id?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          company_verification_status?: string | null
          connected_at?: string | null
          last_error?: string | null
          last_invoice_event_id?: string | null
          provider?: string
          provider_company_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      einvoicing_oauth_tokens: {
        Row: {
          auth_tag: string
          ciphertext: string
          expires_at: string
          iv: string
          key_id: string
          provider: string
          refresh_lock_until: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          auth_tag: string
          ciphertext: string
          expires_at: string
          iv: string
          key_id?: string
          provider?: string
          refresh_lock_until?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          auth_tag?: string
          ciphertext?: string
          expires_at?: string
          iv?: string
          key_id?: string
          provider?: string
          refresh_lock_until?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      facture_compteurs: {
        Row: {
          annee: number
          dernier_numero: number
          user_id: string
        }
        Insert: {
          annee: number
          dernier_numero?: number
          user_id: string
        }
        Update: {
          annee?: number
          dernier_numero?: number
          user_id?: string
        }
        Relationships: []
      }
      facture_cycle_events: {
        Row: {
          created_at: string
          facture_id: string
          id: string
          payload: Json
          provider: string
          provider_event_id: string
          provider_invoice_id: string
          status_code: string
          user_id: string
        }
        Insert: {
          created_at?: string
          facture_id: string
          id?: string
          payload?: Json
          provider: string
          provider_event_id: string
          provider_invoice_id: string
          status_code: string
          user_id: string
        }
        Update: {
          created_at?: string
          facture_id?: string
          id?: string
          payload?: Json
          provider?: string
          provider_event_id?: string
          provider_invoice_id?: string
          status_code?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "facture_cycle_events_facture_id_fkey"
            columns: ["facture_id"]
            isOneToOne: false
            referencedRelation: "factures"
            referencedColumns: ["id"]
          },
        ]
      }
      facture_lignes: {
        Row: {
          designation: string
          facture_id: string
          id: string
          ordre: number
          prix_ht: number
          quantite: number
          section: string | null
          total_ht: number
          tva: number
          type_ligne: Database["public"]["Enums"]["type_ligne"]
          unite: string
        }
        Insert: {
          designation: string
          facture_id: string
          id?: string
          ordre?: number
          prix_ht?: number
          quantite?: number
          section?: string | null
          total_ht?: number
          tva?: number
          type_ligne?: Database["public"]["Enums"]["type_ligne"]
          unite?: string
        }
        Update: {
          designation?: string
          facture_id?: string
          id?: string
          ordre?: number
          prix_ht?: number
          quantite?: number
          section?: string | null
          total_ht?: number
          tva?: number
          type_ligne?: Database["public"]["Enums"]["type_ligne"]
          unite?: string
        }
        Relationships: [
          {
            foreignKeyName: "facture_lignes_facture_id_fkey"
            columns: ["facture_id"]
            isOneToOne: false
            referencedRelation: "factures"
            referencedColumns: ["id"]
          },
        ]
      }
      factures: {
        Row: {
          adresse_livraison_chantier: string | null
          chorus_service_code: string | null
          client_id: string | null
          conformite_branche: string | null
          conformite_warnings: Json | null
          created_at: string
          date_echeance: string | null
          date_emission: string
          date_prestation_debut: string | null
          date_prestation_fin: string | null
          derniere_relance_at: string | null
          devis_id: string | null
          devise: string
          einvoicing_provider_invoice_id: string | null
          facture_origine_date: string | null
          facture_origine_id: string | null
          facture_origine_numero: string | null
          facture_type: string | null
          facturx_pdf_path: string | null
          facturx_xml: string | null
          id: string
          immutable: boolean | null
          locked_at: string | null
          nature_operation:
            | Database["public"]["Enums"]["nature_operation"]
            | null
          numero: string | null
          operations_type: string | null
          option_tva_debits: boolean
          pdf_url: string | null
          relance_count: number
          share_token: string
          snapshot_client: Json | null
          snapshot_emetteur: Json | null
          statut: string
          statut_cycle_vie: Database["public"]["Enums"]["statut_cycle_vie"]
          total_ht: number
          total_ttc: number
          total_tva: number
          updated_at: string
          user_id: string
        }
        Insert: {
          adresse_livraison_chantier?: string | null
          chorus_service_code?: string | null
          client_id?: string | null
          conformite_branche?: string | null
          conformite_warnings?: Json | null
          created_at?: string
          date_echeance?: string | null
          date_emission?: string
          date_prestation_debut?: string | null
          date_prestation_fin?: string | null
          derniere_relance_at?: string | null
          devis_id?: string | null
          devise?: string
          einvoicing_provider_invoice_id?: string | null
          facture_origine_date?: string | null
          facture_origine_id?: string | null
          facture_origine_numero?: string | null
          facture_type?: string | null
          facturx_pdf_path?: string | null
          facturx_xml?: string | null
          id?: string
          immutable?: boolean | null
          locked_at?: string | null
          nature_operation?:
            | Database["public"]["Enums"]["nature_operation"]
            | null
          numero?: string | null
          operations_type?: string | null
          option_tva_debits?: boolean
          pdf_url?: string | null
          relance_count?: number
          share_token?: string
          snapshot_client?: Json | null
          snapshot_emetteur?: Json | null
          statut?: string
          statut_cycle_vie?: Database["public"]["Enums"]["statut_cycle_vie"]
          total_ht?: number
          total_ttc?: number
          total_tva?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          adresse_livraison_chantier?: string | null
          chorus_service_code?: string | null
          client_id?: string | null
          conformite_branche?: string | null
          conformite_warnings?: Json | null
          created_at?: string
          date_echeance?: string | null
          date_emission?: string
          date_prestation_debut?: string | null
          date_prestation_fin?: string | null
          derniere_relance_at?: string | null
          devis_id?: string | null
          devise?: string
          einvoicing_provider_invoice_id?: string | null
          facture_origine_date?: string | null
          facture_origine_id?: string | null
          facture_origine_numero?: string | null
          facture_type?: string | null
          facturx_pdf_path?: string | null
          facturx_xml?: string | null
          id?: string
          immutable?: boolean | null
          locked_at?: string | null
          nature_operation?:
            | Database["public"]["Enums"]["nature_operation"]
            | null
          numero?: string | null
          operations_type?: string | null
          option_tva_debits?: boolean
          pdf_url?: string | null
          relance_count?: number
          share_token?: string
          snapshot_client?: Json | null
          snapshot_emetteur?: Json | null
          statut?: string
          statut_cycle_vie?: Database["public"]["Enums"]["statut_cycle_vie"]
          total_ht?: number
          total_ttc?: number
          total_tva?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "factures_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "factures_devis_id_fkey"
            columns: ["devis_id"]
            isOneToOne: false
            referencedRelation: "devis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "factures_facture_origine_id_fkey"
            columns: ["facture_origine_id"]
            isOneToOne: false
            referencedRelation: "factures"
            referencedColumns: ["id"]
          },
        ]
      }
      integrations: {
        Row: {
          description: string
          enabled: boolean
          id: number
          name: string
          user_id: number
        }
        Insert: {
          description: string
          enabled?: boolean
          id?: number
          name: string
          user_id: number
        }
        Update: {
          description?: string
          enabled?: boolean
          id?: number
          name?: string
          user_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "integrations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      intervention_reports: {
        Row: {
          client_email_sent_at: string | null
          client_id: number | null
          created_at: string
          id: number
          photo_urls: Json
          project_id: number | null
          report_body: string
          transcript: string
          user_id: number
        }
        Insert: {
          client_email_sent_at?: string | null
          client_id?: number | null
          created_at?: string
          id?: number
          photo_urls?: Json
          project_id?: number | null
          report_body?: string
          transcript?: string
          user_id: number
        }
        Update: {
          client_email_sent_at?: string | null
          client_id?: number | null
          created_at?: string
          id?: number
          photo_urls?: Json
          project_id?: number | null
          report_body?: string
          transcript?: string
          user_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "intervention_reports_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intervention_reports_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      landing_leads: {
        Row: {
          adresse: string | null
          capital_social: string | null
          country: string | null
          created_at: string
          email: string
          email_facturation: string | null
          entreprise: string | null
          error_message: string | null
          forme_juridique: string | null
          id: string
          metier: string | null
          nom: string | null
          numero_tva_intracom: string | null
          prenom: string | null
          rcs_ville: string | null
          session_id: string | null
          siren: string | null
          siret: string | null
          source_page: string
          success: boolean
          tel: string | null
        }
        Insert: {
          adresse?: string | null
          capital_social?: string | null
          country?: string | null
          created_at?: string
          email: string
          email_facturation?: string | null
          entreprise?: string | null
          error_message?: string | null
          forme_juridique?: string | null
          id?: string
          metier?: string | null
          nom?: string | null
          numero_tva_intracom?: string | null
          prenom?: string | null
          rcs_ville?: string | null
          session_id?: string | null
          siren?: string | null
          siret?: string | null
          source_page: string
          success?: boolean
          tel?: string | null
        }
        Update: {
          adresse?: string | null
          capital_social?: string | null
          country?: string | null
          created_at?: string
          email?: string
          email_facturation?: string | null
          entreprise?: string | null
          error_message?: string | null
          forme_juridique?: string | null
          id?: string
          metier?: string | null
          nom?: string | null
          numero_tva_intracom?: string | null
          prenom?: string | null
          rcs_ville?: string | null
          session_id?: string | null
          siren?: string | null
          siret?: string | null
          source_page?: string
          success?: boolean
          tel?: string | null
        }
        Relationships: []
      }
      material_orders: {
        Row: {
          created_at: string
          id: number
          lines: Json
          quote_id: number | null
          status: string
          supplier_notes: string
          title: string
          user_id: number
        }
        Insert: {
          created_at?: string
          id?: number
          lines?: Json
          quote_id?: number | null
          status?: string
          supplier_notes?: string
          title?: string
          user_id: number
        }
        Update: {
          created_at?: string
          id?: number
          lines?: Json
          quote_id?: number | null
          status?: string
          supplier_notes?: string
          title?: string
          user_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "material_orders_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      materials: {
        Row: {
          id: number
          name: string
          price: number
          user_id: number
        }
        Insert: {
          id?: number
          name: string
          price: number
          user_id: number
        }
        Update: {
          id?: number
          name?: string
          price?: number
          user_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "materials_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      meta: {
        Row: {
          key: string
          value: string | null
        }
        Insert: {
          key: string
          value?: string | null
        }
        Update: {
          key?: string
          value?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          id: number
          label: string
          type: string
          user_id: number
        }
        Insert: {
          id?: number
          label: string
          type: string
          user_id: number
        }
        Update: {
          id?: number
          label?: string
          type?: string
          user_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      ouvrages: {
        Row: {
          created_at: string
          description: string | null
          id: string
          nom: string
          prix_ht: number
          tags: string[] | null
          tva: number
          type: string
          unite: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          nom: string
          prix_ht?: number
          tags?: string[] | null
          tva?: number
          type: string
          unite?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          nom?: string
          prix_ht?: number
          tags?: string[] | null
          tva?: number
          type?: string
          unite?: string
          user_id?: string
        }
        Relationships: []
      }
      paiements: {
        Row: {
          created_at: string
          date: string
          facture_id: string
          id: string
          mode: string
          montant: number
        }
        Insert: {
          created_at?: string
          date?: string
          facture_id: string
          id?: string
          mode: string
          montant: number
        }
        Update: {
          created_at?: string
          date?: string
          facture_id?: string
          id?: string
          mode?: string
          montant?: number
        }
        Relationships: [
          {
            foreignKeyName: "paiements_facture_id_fkey"
            columns: ["facture_id"]
            isOneToOne: false
            referencedRelation: "factures"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          adresse: string | null
          adresse_cp: string | null
          adresse_ligne1: string | null
          adresse_ligne2: string | null
          adresse_pays: string
          adresse_structure_confirmee_at: string | null
          adresse_structure_proposition: Json | null
          adresse_ville: string | null
          assistant_name: string
          avatar_url: string | null
          bic: string | null
          capital_social: string | null
          conditions_paiement_defaut: string | null
          created_at: string
          decennale_mention: string | null
          email_facturation: string | null
          entreprise_nom: string | null
          feature_flag_chorus: boolean | null
          feature_flag_ereporting: boolean | null
          feature_flag_esign_advanced: boolean | null
          feature_flag_pdp: boolean | null
          forme_juridique: string | null
          ia_devis_count: number
          ia_devis_month: string | null
          iban: string | null
          id: string
          logo_url: string | null
          mention_legale: string | null
          metier: string | null
          nom: string | null
          notification_email: boolean
          notification_preferences: Json
          notification_push: boolean
          numero_tva_intracom: string | null
          onboarding_steps_completed: number
          pays: string
          pdf_primary_color: string | null
          prenom: string | null
          privacy_accepted_at: string | null
          privacy_policy_version: string | null
          profile_voice_prompt_skipped_at: string | null
          rcs_ville: string | null
          referred_by_partner_id: string | null
          regime_tva: Database["public"]["Enums"]["regime_tva"]
          relance_devis_echeances: string
          relance_devis_jours: number
          relance_facture_echeances: string
          relance_facture_jours: number
          sep_fourniture_pose: boolean
          siren: string | null
          siret: string | null
          specialites: string | null
          stripe_customer_id: string | null
          structure_devis: string
          subscription_plan: string | null
          subscription_status: string | null
          tarif_horaire: number | null
          tel: string | null
          trial_ends_at: string | null
          tva_defaut: number
          tva_periodicite_declaration: string | null
          tva_sur_debits_opt_in: boolean | null
          tva_sur_encaissements: boolean | null
          updated_at: string
          use_personal_library: boolean
        }
        Insert: {
          adresse?: string | null
          adresse_cp?: string | null
          adresse_ligne1?: string | null
          adresse_ligne2?: string | null
          adresse_pays?: string
          adresse_structure_confirmee_at?: string | null
          adresse_structure_proposition?: Json | null
          adresse_ville?: string | null
          assistant_name?: string
          avatar_url?: string | null
          bic?: string | null
          capital_social?: string | null
          conditions_paiement_defaut?: string | null
          created_at?: string
          decennale_mention?: string | null
          email_facturation?: string | null
          entreprise_nom?: string | null
          feature_flag_chorus?: boolean | null
          feature_flag_ereporting?: boolean | null
          feature_flag_esign_advanced?: boolean | null
          feature_flag_pdp?: boolean | null
          forme_juridique?: string | null
          ia_devis_count?: number
          ia_devis_month?: string | null
          iban?: string | null
          id: string
          logo_url?: string | null
          mention_legale?: string | null
          metier?: string | null
          nom?: string | null
          notification_email?: boolean
          notification_preferences?: Json
          notification_push?: boolean
          numero_tva_intracom?: string | null
          onboarding_steps_completed?: number
          pays?: string
          pdf_primary_color?: string | null
          prenom?: string | null
          privacy_accepted_at?: string | null
          privacy_policy_version?: string | null
          profile_voice_prompt_skipped_at?: string | null
          rcs_ville?: string | null
          referred_by_partner_id?: string | null
          regime_tva?: Database["public"]["Enums"]["regime_tva"]
          relance_devis_echeances?: string
          relance_devis_jours?: number
          relance_facture_echeances?: string
          relance_facture_jours?: number
          sep_fourniture_pose?: boolean
          siren?: string | null
          siret?: string | null
          specialites?: string | null
          stripe_customer_id?: string | null
          structure_devis?: string
          subscription_plan?: string | null
          subscription_status?: string | null
          tarif_horaire?: number | null
          tel?: string | null
          trial_ends_at?: string | null
          tva_defaut?: number
          tva_periodicite_declaration?: string | null
          tva_sur_debits_opt_in?: boolean | null
          tva_sur_encaissements?: boolean | null
          updated_at?: string
          use_personal_library?: boolean
        }
        Update: {
          adresse?: string | null
          adresse_cp?: string | null
          adresse_ligne1?: string | null
          adresse_ligne2?: string | null
          adresse_pays?: string
          adresse_structure_confirmee_at?: string | null
          adresse_structure_proposition?: Json | null
          adresse_ville?: string | null
          assistant_name?: string
          avatar_url?: string | null
          bic?: string | null
          capital_social?: string | null
          conditions_paiement_defaut?: string | null
          created_at?: string
          decennale_mention?: string | null
          email_facturation?: string | null
          entreprise_nom?: string | null
          feature_flag_chorus?: boolean | null
          feature_flag_ereporting?: boolean | null
          feature_flag_esign_advanced?: boolean | null
          feature_flag_pdp?: boolean | null
          forme_juridique?: string | null
          ia_devis_count?: number
          ia_devis_month?: string | null
          iban?: string | null
          id?: string
          logo_url?: string | null
          mention_legale?: string | null
          metier?: string | null
          nom?: string | null
          notification_email?: boolean
          notification_preferences?: Json
          notification_push?: boolean
          numero_tva_intracom?: string | null
          onboarding_steps_completed?: number
          pays?: string
          pdf_primary_color?: string | null
          prenom?: string | null
          privacy_accepted_at?: string | null
          privacy_policy_version?: string | null
          profile_voice_prompt_skipped_at?: string | null
          rcs_ville?: string | null
          referred_by_partner_id?: string | null
          regime_tva?: Database["public"]["Enums"]["regime_tva"]
          relance_devis_echeances?: string
          relance_devis_jours?: number
          relance_facture_echeances?: string
          relance_facture_jours?: number
          sep_fourniture_pose?: boolean
          siren?: string | null
          siret?: string | null
          specialites?: string | null
          stripe_customer_id?: string | null
          structure_devis?: string
          subscription_plan?: string | null
          subscription_status?: string | null
          tarif_horaire?: number | null
          tel?: string | null
          trial_ends_at?: string | null
          tva_defaut?: number
          tva_periodicite_declaration?: string | null
          tva_sur_debits_opt_in?: boolean | null
          tva_sur_encaissements?: boolean | null
          updated_at?: string
          use_personal_library?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "profiles_referred_by_partner_id_fkey"
            columns: ["referred_by_partner_id"]
            isOneToOne: false
            referencedRelation: "affiliate_partners"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          a_relancer: boolean
          budget_estime: number
          chantier_type: string
          client_id: number
          comment: string | null
          due_date: string
          etape_metier: string
          google_event_id: string | null
          heures_passees: number
          heures_prevues: number
          id: number
          name: string
          photo_urls: string
          progress: number
          quote_id: number | null
          responsible: string | null
          site_address: string
          status: string
          user_id: number
        }
        Insert: {
          a_relancer?: boolean
          budget_estime?: number
          chantier_type?: string
          client_id: number
          comment?: string | null
          due_date: string
          etape_metier?: string
          google_event_id?: string | null
          heures_passees?: number
          heures_prevues?: number
          id?: number
          name: string
          photo_urls?: string
          progress?: number
          quote_id?: number | null
          responsible?: string | null
          site_address?: string
          status: string
          user_id: number
        }
        Update: {
          a_relancer?: boolean
          budget_estime?: number
          chantier_type?: string
          client_id?: number
          comment?: string | null
          due_date?: string
          etape_metier?: string
          google_event_id?: string | null
          heures_passees?: number
          heures_prevues?: number
          id?: number
          name?: string
          photo_urls?: string
          progress?: number
          quote_id?: number | null
          responsible?: string | null
          site_address?: string
          status?: string
          user_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "projects_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      quotes: {
        Row: {
          accept_token: string | null
          accepted_at: string | null
          ack: boolean
          amount: number
          client_id: number
          discount: number
          hours: number
          id: number
          material_id: number
          materials_desc: string | null
          materials_total: number | null
          relance_envoyee_at: string | null
          sent_at: string
          service_id: number
          signature_data: string | null
          signature_name: string | null
          status: string
          user_id: number
        }
        Insert: {
          accept_token?: string | null
          accepted_at?: string | null
          ack?: boolean
          amount: number
          client_id: number
          discount?: number
          hours: number
          id?: number
          material_id: number
          materials_desc?: string | null
          materials_total?: number | null
          relance_envoyee_at?: string | null
          sent_at: string
          service_id: number
          signature_data?: string | null
          signature_name?: string | null
          status: string
          user_id: number
        }
        Update: {
          accept_token?: string | null
          accepted_at?: string | null
          ack?: boolean
          amount?: number
          client_id?: number
          discount?: number
          hours?: number
          id?: number
          material_id?: number
          materials_desc?: string | null
          materials_total?: number | null
          relance_envoyee_at?: string | null
          sent_at?: string
          service_id?: number
          signature_data?: string | null
          signature_name?: string | null
          status?: string
          user_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "quotes_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      sav_tickets: {
        Row: {
          client_id: number
          created_at: string
          description: string
          id: number
          priority: string
          status: string
          subject: string
          updated_at: string
          user_id: number
          warranty_id: number | null
        }
        Insert: {
          client_id: number
          created_at?: string
          description?: string
          id?: number
          priority?: string
          status?: string
          subject: string
          updated_at?: string
          user_id: number
          warranty_id?: number | null
        }
        Update: {
          client_id?: number
          created_at?: string
          description?: string
          id?: number
          priority?: string
          status?: string
          subject?: string
          updated_at?: string
          user_id?: number
          warranty_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sav_tickets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sav_tickets_warranty_id_fkey"
            columns: ["warranty_id"]
            isOneToOne: false
            referencedRelation: "warranties"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          base_price: number
          id: number
          name: string
          user_id: number
        }
        Insert: {
          base_price: number
          id?: number
          name: string
          user_id: number
        }
        Update: {
          base_price?: number
          id?: number
          name?: string
          user_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "services_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      settings: {
        Row: {
          google_calendar_id: string | null
          google_refresh_token: string | null
          labor_rate: number
          satisfaction_responses: number
          satisfaction_score: number
          user_id: number
        }
        Insert: {
          google_calendar_id?: string | null
          google_refresh_token?: string | null
          labor_rate?: number
          satisfaction_responses?: number
          satisfaction_score?: number
          user_id: number
        }
        Update: {
          google_calendar_id?: string | null
          google_refresh_token?: string | null
          labor_rate?: number
          satisfaction_responses?: number
          satisfaction_score?: number
          user_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string
          email: string
          id: number
          name: string
          password_hash: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: number
          name: string
          password_hash: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: number
          name?: string
          password_hash?: string
        }
        Relationships: []
      }
      warranties: {
        Row: {
          certificate_body: string
          client_id: number
          created_at: string
          end_date: string
          id: number
          label: string
          project_id: number | null
          reminder_30d_sent_at: string | null
          reminder_7d_sent_at: string | null
          start_date: string
          user_id: number
          warranty_months: number
          work_summary: string
        }
        Insert: {
          certificate_body?: string
          client_id: number
          created_at?: string
          end_date: string
          id?: number
          label?: string
          project_id?: number | null
          reminder_30d_sent_at?: string | null
          reminder_7d_sent_at?: string | null
          start_date: string
          user_id: number
          warranty_months?: number
          work_summary?: string
        }
        Update: {
          certificate_body?: string
          client_id?: number
          created_at?: string
          end_date?: string
          id?: number
          label?: string
          project_id?: number | null
          reminder_30d_sent_at?: string | null
          reminder_7d_sent_at?: string | null
          start_date?: string
          user_id?: number
          warranty_months?: number
          work_summary?: string
        }
        Relationships: [
          {
            foreignKeyName: "warranties_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warranties_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      allocate_facture_numero: { Args: { p_user_id: string }; Returns: string }
      analytics_page_view_counts: {
        Args: { p_since: string; p_until: string }
        Returns: {
          page_path: string
          views: number
        }[]
      }
      einvoicing_lock_oauth_tokens: { Args: { p_user_id: string }; Returns: boolean }
      einvoicing_unlock_oauth_tokens: { Args: { p_user_id: string }; Returns: boolean }
    }
    Enums: {
      ligne_type: "prestation" | "fourniture" | "pose"
      nature_operation: "biens" | "services" | "mixte"
      regime_tva: "encaissements" | "debits" | "franchise_293b"
      statut_cycle_vie:
        | "brouillon"
        | "emise"
        | "deposee"
        | "rejetee"
        | "encaissee"
        | "irrecevable"
      type_client: "particulier" | "entreprise" | "public"
      type_ligne: "bien" | "service"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      ligne_type: ["prestation", "fourniture", "pose"],
      nature_operation: ["biens", "services", "mixte"],
      regime_tva: ["encaissements", "debits", "franchise_293b"],
      statut_cycle_vie: [
        "brouillon",
        "emise",
        "deposee",
        "rejetee",
        "encaissee",
        "irrecevable",
      ],
      type_client: ["particulier", "entreprise", "public"],
      type_ligne: ["bien", "service"],
    },
  },
} as const

export type DevisLigneRow = Database["public"]["Tables"]["devis_lignes"]["Row"];
