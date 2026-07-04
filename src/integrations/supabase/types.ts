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
      audit_logs: {
        Row: {
          action: string
          category: string
          created_at: string
          id: string
          ip_address: string | null
          metadata: Json
          target: string | null
          user_id: string
        }
        Insert: {
          action: string
          category?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          metadata?: Json
          target?: string | null
          user_id: string
        }
        Update: {
          action?: string
          category?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          metadata?: Json
          target?: string | null
          user_id?: string
        }
        Relationships: []
      }
      certificates: {
        Row: {
          created_at: string
          fingerprint: string
          id: string
          issuer: string
          name: string
          owner_id: string
          status: string
          valid_from: string
          valid_until: string
        }
        Insert: {
          created_at?: string
          fingerprint: string
          id?: string
          issuer?: string
          name: string
          owner_id: string
          status?: string
          valid_from?: string
          valid_until?: string
        }
        Update: {
          created_at?: string
          fingerprint?: string
          id?: string
          issuer?: string
          name?: string
          owner_id?: string
          status?: string
          valid_from?: string
          valid_until?: string
        }
        Relationships: []
      }
      documents: {
        Row: {
          created_at: string
          file_path: string | null
          file_type: string
          id: string
          owner_id: string
          page_count: number
          recipients: Json
          size_bytes: number
          status: Database["public"]["Enums"]["doc_status"]
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          file_path?: string | null
          file_type?: string
          id?: string
          owner_id: string
          page_count?: number
          recipients?: Json
          size_bytes?: number
          status?: Database["public"]["Enums"]["doc_status"]
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          file_path?: string | null
          file_type?: string
          id?: string
          owner_id?: string
          page_count?: number
          recipients?: Json
          size_bytes?: number
          status?: Database["public"]["Enums"]["doc_status"]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          company: string | null
          created_at: string
          display_name: string | null
          id: string
          job_title: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          company?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          job_title?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          company?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          job_title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      signatures: {
        Row: {
          created_at: string
          data_url: string | null
          id: string
          is_default: boolean
          name: string
          owner_id: string
          type: Database["public"]["Enums"]["sig_type"]
        }
        Insert: {
          created_at?: string
          data_url?: string | null
          id?: string
          is_default?: boolean
          name: string
          owner_id: string
          type?: Database["public"]["Enums"]["sig_type"]
        }
        Update: {
          created_at?: string
          data_url?: string | null
          id?: string
          is_default?: boolean
          name?: string
          owner_id?: string
          type?: Database["public"]["Enums"]["sig_type"]
        }
        Relationships: []
      }
      team_members: {
        Row: {
          created_at: string
          email: string
          id: string
          member_role: string
          status: string
          team_id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          member_role?: string
          status?: string
          team_id: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          member_role?: string
          status?: string
          team_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          created_at: string
          id: string
          name: string
          owner_id: string
          plan: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          owner_id: string
          plan?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          owner_id?: string
          plan?: string
        }
        Relationships: []
      }
      templates: {
        Row: {
          category: string
          created_at: string
          description: string | null
          fields: Json
          id: string
          owner_id: string
          title: string
          updated_at: string
          usage_count: number
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          fields?: Json
          id?: string
          owner_id: string
          title: string
          updated_at?: string
          usage_count?: number
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          fields?: Json
          id?: string
          owner_id?: string
          title?: string
          updated_at?: string
          usage_count?: number
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "manager" | "member"
      doc_status:
        | "draft"
        | "pending"
        | "signed"
        | "completed"
        | "declined"
        | "expired"
      sig_type: "drawn" | "typed" | "uploaded" | "ai"
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
      app_role: ["admin", "manager", "member"],
      doc_status: [
        "draft",
        "pending",
        "signed",
        "completed",
        "declined",
        "expired",
      ],
      sig_type: ["drawn", "typed", "uploaded", "ai"],
    },
  },
} as const
