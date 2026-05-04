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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      auth_rate_limits: {
        Row: {
          attempted_at: string
          bucket: string
          id: number
          key: string
        }
        Insert: {
          attempted_at?: string
          bucket: string
          id?: number
          key: string
        }
        Update: {
          attempted_at?: string
          bucket?: string
          id?: number
          key?: string
        }
        Relationships: []
      }
      delivery_otps: {
        Row: {
          attempts: number
          created_at: string
          expires_at: string
          id: string
          order_id: string
          otp_code: string
          purpose: string
          used_at: string | null
        }
        Insert: {
          attempts?: number
          created_at?: string
          expires_at?: string
          id?: string
          order_id: string
          otp_code: string
          purpose?: string
          used_at?: string | null
        }
        Update: {
          attempts?: number
          created_at?: string
          expires_at?: string
          id?: string
          order_id?: string
          otp_code?: string
          purpose?: string
          used_at?: string | null
        }
        Relationships: []
      }
      login_activity: {
        Row: {
          created_at: string
          email: string | null
          event: string
          id: string
          ip_address: string | null
          metadata: Json | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          event: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          event?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      measurements: {
        Row: {
          chest: number | null
          created_at: string
          customer_id: string
          hip: number | null
          id: string
          length: number | null
          measurement_file_url: string | null
          notes: string | null
          order_id: string | null
          shoulder: number | null
          sleeve_length: number | null
          unit: string
          waist: number | null
        }
        Insert: {
          chest?: number | null
          created_at?: string
          customer_id: string
          hip?: number | null
          id?: string
          length?: number | null
          measurement_file_url?: string | null
          notes?: string | null
          order_id?: string | null
          shoulder?: number | null
          sleeve_length?: number | null
          unit?: string
          waist?: number | null
        }
        Update: {
          chest?: number | null
          created_at?: string
          customer_id?: string
          hip?: number | null
          id?: string
          length?: number | null
          measurement_file_url?: string | null
          notes?: string | null
          order_id?: string | null
          shoulder?: number | null
          sleeve_length?: number | null
          unit?: string
          waist?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "measurements_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          order_id: string
          price: number
          quantity: number
          service_id: string
          service_name: string
        }
        Insert: {
          created_at?: string
          id?: string
          order_id: string
          price: number
          quantity?: number
          service_id: string
          service_name: string
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string
          price?: number
          quantity?: number
          service_id?: string
          service_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string
          customer_id: string
          delivered_confirmed_at: string | null
          delivery_address: string | null
          delivery_city: string | null
          delivery_mode: string
          delivery_name: string | null
          delivery_phone: string | null
          delivery_pincode: string | null
          id: string
          measurement_id: string | null
          order_number: string
          ready_for_shipment_at: string | null
          size_selection: string | null
          status: string
          tailor_name: string | null
          tailor_profile_id: string | null
          total_amount: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          delivered_confirmed_at?: string | null
          delivery_address?: string | null
          delivery_city?: string | null
          delivery_mode?: string
          delivery_name?: string | null
          delivery_phone?: string | null
          delivery_pincode?: string | null
          id?: string
          measurement_id?: string | null
          order_number: string
          ready_for_shipment_at?: string | null
          size_selection?: string | null
          status?: string
          tailor_name?: string | null
          tailor_profile_id?: string | null
          total_amount: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          delivered_confirmed_at?: string | null
          delivery_address?: string | null
          delivery_city?: string | null
          delivery_mode?: string
          delivery_name?: string | null
          delivery_phone?: string | null
          delivery_pincode?: string | null
          id?: string
          measurement_id?: string | null
          order_number?: string
          ready_for_shipment_at?: string | null
          size_selection?: string | null
          status?: string
          tailor_name?: string | null
          tailor_profile_id?: string | null
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_measurement_id_fkey"
            columns: ["measurement_id"]
            isOneToOne: false
            referencedRelation: "measurements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_tailor_profile_id_fkey"
            columns: ["tailor_profile_id"]
            isOneToOne: false
            referencedRelation: "tailor_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          customer_id: string
          id: string
          order_id: string
          payment_method: string
          status: string
          transaction_id: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          customer_id: string
          id?: string
          order_id: string
          payment_method?: string
          status?: string
          transaction_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          customer_id?: string
          id?: string
          order_id?: string
          payment_method?: string
          status?: string
          transaction_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      phone_otps: {
        Row: {
          attempts: number
          created_at: string
          expires_at: string
          id: string
          otp_hash: string
          phone: string
          purpose: string
          used_at: string | null
        }
        Insert: {
          attempts?: number
          created_at?: string
          expires_at?: string
          id?: string
          otp_hash: string
          phone: string
          purpose: string
          used_at?: string | null
        }
        Update: {
          attempts?: number
          created_at?: string
          expires_at?: string
          id?: string
          otp_hash?: string
          phone?: string
          purpose?: string
          used_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          account_status: string
          avatar_url: string | null
          created_at: string
          full_name: string
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          account_status?: string
          avatar_url?: string | null
          created_at?: string
          full_name?: string
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          account_status?: string
          avatar_url?: string | null
          created_at?: string
          full_name?: string
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      services: {
        Row: {
          category: string
          created_at: string
          description: string | null
          estimated_days: number
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          price: number
          store_id: string | null
          tailor_profile_id: string
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          estimated_days?: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          price: number
          store_id?: string | null
          tailor_profile_id: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          estimated_days?: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          price?: number
          store_id?: string | null
          tailor_profile_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "services_tailor_profile_id_fkey"
            columns: ["tailor_profile_id"]
            isOneToOne: false
            referencedRelation: "tailor_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      shipments: {
        Row: {
          courier_name: string
          created_at: string
          estimated_delivery: string | null
          id: string
          order_id: string
          shipment_status: string
          tracking_id: string
          tracking_url: string | null
          updated_at: string
        }
        Insert: {
          courier_name?: string
          created_at?: string
          estimated_delivery?: string | null
          id?: string
          order_id: string
          shipment_status?: string
          tracking_id: string
          tracking_url?: string | null
          updated_at?: string
        }
        Update: {
          courier_name?: string
          created_at?: string
          estimated_delivery?: string | null
          id?: string
          order_id?: string
          shipment_status?: string
          tracking_id?: string
          tracking_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      stores: {
        Row: {
          created_at: string
          description: string
          id: string
          image: string | null
          location: string
          shop_name: string
          store_status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string
          id?: string
          image?: string | null
          location?: string
          shop_name: string
          store_status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          image?: string | null
          location?: string
          shop_name?: string
          store_status?: string
          user_id?: string
        }
        Relationships: []
      }
      tailor_bank_details: {
        Row: {
          account_holder_name: string
          account_number: string
          bank_name: string
          created_at: string
          id: string
          ifsc_code: string
          tailor_profile_id: string
          updated_at: string
        }
        Insert: {
          account_holder_name: string
          account_number: string
          bank_name: string
          created_at?: string
          id?: string
          ifsc_code: string
          tailor_profile_id: string
          updated_at?: string
        }
        Update: {
          account_holder_name?: string
          account_number?: string
          bank_name?: string
          created_at?: string
          id?: string
          ifsc_code?: string
          tailor_profile_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      tailor_profiles: {
        Row: {
          created_at: string
          description: string | null
          experience: number
          id: string
          image_url: string | null
          is_approved: boolean
          location: string
          rating: number
          review_count: number
          shop_name: string
          store_status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          experience?: number
          id?: string
          image_url?: string | null
          is_approved?: boolean
          location?: string
          rating?: number
          review_count?: number
          shop_name: string
          store_status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          experience?: number
          id?: string
          image_url?: string | null
          is_approved?: boolean
          location?: string
          rating?: number
          review_count?: number
          shop_name?: string
          store_status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tailor_wallets: {
        Row: {
          available_balance: number
          created_at: string
          id: string
          pending_balance: number
          tailor_profile_id: string
          total_earned: number
          total_withdrawn: number
          updated_at: string
        }
        Insert: {
          available_balance?: number
          created_at?: string
          id?: string
          pending_balance?: number
          tailor_profile_id: string
          total_earned?: number
          total_withdrawn?: number
          updated_at?: string
        }
        Update: {
          available_balance?: number
          created_at?: string
          id?: string
          pending_balance?: number
          tailor_profile_id?: string
          total_earned?: number
          total_withdrawn?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tailor_wallets_tailor_profile_id_fkey"
            columns: ["tailor_profile_id"]
            isOneToOne: true
            referencedRelation: "tailor_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      wallet_transactions: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          id: string
          order_id: string | null
          type: string
          wallet_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string | null
          id?: string
          order_id?: string | null
          type: string
          wallet_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          id?: string
          order_id?: string | null
          type?: string
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wallet_transactions_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "tailor_wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      withdrawal_requests: {
        Row: {
          admin_note: string | null
          amount: number
          created_at: string
          id: string
          payout_reference: string | null
          status: string
          updated_at: string
          wallet_id: string
        }
        Insert: {
          admin_note?: string | null
          amount: number
          created_at?: string
          id?: string
          payout_reference?: string | null
          status?: string
          updated_at?: string
          wallet_id: string
        }
        Update: {
          admin_note?: string | null
          amount?: number
          created_at?: string
          id?: string
          payout_reference?: string | null
          status?: string
          updated_at?: string
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "withdrawal_requests_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "tailor_wallets"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_create_shipment: {
        Args: { p_courier_name?: string; p_order_id: string }
        Returns: string
      }
      admin_set_account_status: {
        Args: { p_status: string; p_user_id: string }
        Returns: undefined
      }
      admin_update_shipment_status: {
        Args: { p_shipment_id: string; p_status: string }
        Returns: undefined
      }
      approve_withdrawal: {
        Args: { p_note?: string; p_request_id: string }
        Returns: undefined
      }
      become_tailor: { Args: never; Returns: undefined }
      check_and_record_rate_limit: {
        Args: {
          p_bucket: string
          p_key: string
          p_max_attempts: number
          p_window_seconds: number
        }
        Returns: boolean
      }
      confirm_delivery_with_otp: {
        Args: { p_order_id: string; p_otp: string }
        Returns: undefined
      }
      credit_tailor_wallet: {
        Args: {
          p_commission_rate?: number
          p_order_id: string
          p_tailor_profile_id: string
          p_total_amount: number
        }
        Returns: undefined
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      log_user_activity: {
        Args: {
          p_email: string
          p_event: string
          p_ip?: string
          p_metadata?: Json
          p_user_agent?: string
          p_user_id: string
        }
        Returns: undefined
      }
      mark_withdrawal_paid: {
        Args: { p_payout_reference?: string; p_request_id: string }
        Returns: undefined
      }
      reject_withdrawal: {
        Args: { p_note?: string; p_request_id: string }
        Returns: undefined
      }
      release_pending_to_available: {
        Args: { p_order_id: string }
        Returns: undefined
      }
      request_withdrawal: {
        Args: { p_amount: number; p_wallet_id: string }
        Returns: string
      }
      tailor_generate_pickup_otp: {
        Args: { p_order_id: string }
        Returns: string
      }
      tailor_mark_ready_for_shipment: {
        Args: { p_order_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "customer" | "tailor" | "admin"
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
      app_role: ["customer", "tailor", "admin"],
    },
  },
} as const
