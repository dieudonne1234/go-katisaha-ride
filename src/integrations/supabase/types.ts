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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      agencies: {
        Row: {
          code: string
          created_at: string
          description: string | null
          email: string | null
          id: number
          is_active: boolean
          logo_url: string | null
          name: string
          phone: string | null
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          email?: string | null
          id?: never
          is_active?: boolean
          logo_url?: string | null
          name: string
          phone?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          email?: string | null
          id?: never
          is_active?: boolean
          logo_url?: string | null
          name?: string
          phone?: string | null
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          details: Json | null
          entity: string
          entity_id: string | null
          id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          details?: Json | null
          entity: string
          entity_id?: string | null
          id?: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          details?: Json | null
          entity?: string
          entity_id?: string | null
          id?: string
        }
        Relationships: []
      }
      booking_seats: {
        Row: {
          booking_id: string
          id: number
          seat_id: number
          seat_label: string
          trip_id: number
        }
        Insert: {
          booking_id: string
          id?: never
          seat_id: number
          seat_label: string
          trip_id: number
        }
        Update: {
          booking_id?: string
          id?: never
          seat_id?: number
          seat_label?: string
          trip_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "booking_seats_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_seats_seat_id_fkey"
            columns: ["seat_id"]
            isOneToOne: false
            referencedRelation: "bus_seats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_seats_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          agency_id: number
          booking_ref: string
          created_at: string
          id: string
          passenger_email: string | null
          passenger_id: string
          passenger_name: string
          passenger_phone: string
          seat_count: number
          status: Database["public"]["Enums"]["booking_status"]
          total_amount: number
          trip_id: number
        }
        Insert: {
          agency_id: number
          booking_ref: string
          created_at?: string
          id?: string
          passenger_email?: string | null
          passenger_id: string
          passenger_name: string
          passenger_phone: string
          seat_count: number
          status?: Database["public"]["Enums"]["booking_status"]
          total_amount: number
          trip_id: number
        }
        Update: {
          agency_id?: number
          booking_ref?: string
          created_at?: string
          id?: string
          passenger_email?: string | null
          passenger_id?: string
          passenger_name?: string
          passenger_phone?: string
          seat_count?: number
          status?: Database["public"]["Enums"]["booking_status"]
          total_amount?: number
          trip_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "bookings_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      bus_seats: {
        Row: {
          bus_id: number
          col_index: number
          id: number
          row_index: number
          seat_label: string
        }
        Insert: {
          bus_id: number
          col_index: number
          id?: never
          row_index: number
          seat_label: string
        }
        Update: {
          bus_id?: number
          col_index?: number
          id?: never
          row_index?: number
          seat_label?: string
        }
        Relationships: [
          {
            foreignKeyName: "bus_seats_bus_id_fkey"
            columns: ["bus_id"]
            isOneToOne: false
            referencedRelation: "buses"
            referencedColumns: ["id"]
          },
        ]
      }
      buses: {
        Row: {
          agency_id: number
          bus_number: string
          bus_type: string
          created_at: string
          id: number
          plate_number: string
          seat_capacity: number
          status: Database["public"]["Enums"]["bus_status"]
        }
        Insert: {
          agency_id: number
          bus_number: string
          bus_type?: string
          created_at?: string
          id?: never
          plate_number: string
          seat_capacity?: number
          status?: Database["public"]["Enums"]["bus_status"]
        }
        Update: {
          agency_id?: number
          bus_number?: string
          bus_type?: string
          created_at?: string
          id?: never
          plate_number?: string
          seat_capacity?: number
          status?: Database["public"]["Enums"]["bus_status"]
        }
        Relationships: [
          {
            foreignKeyName: "buses_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          id: string
          is_read: boolean
          kind: string
          title: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          is_read?: boolean
          kind?: string
          title: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          is_read?: boolean
          kind?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          booking_id: string
          created_at: string
          id: string
          method: string
          paid_at: string | null
          reference: string
          status: Database["public"]["Enums"]["payment_status"]
        }
        Insert: {
          amount: number
          booking_id: string
          created_at?: string
          id?: string
          method: string
          paid_at?: string | null
          reference: string
          status?: Database["public"]["Enums"]["payment_status"]
        }
        Update: {
          amount?: number
          booking_id?: string
          created_at?: string
          id?: string
          method?: string
          paid_at?: string | null
          reference?: string
          status?: Database["public"]["Enums"]["payment_status"]
        }
        Relationships: [
          {
            foreignKeyName: "payments_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string
          id: string
          is_active: boolean
          phone: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string
          id: string
          is_active?: boolean
          phone?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          is_active?: boolean
          phone?: string | null
        }
        Relationships: []
      }
      routes: {
        Row: {
          agency_id: number
          created_at: string
          destination_station_id: number
          distance_km: number
          duration_minutes: number
          id: number
          is_active: boolean
          origin_station_id: number
        }
        Insert: {
          agency_id: number
          created_at?: string
          destination_station_id: number
          distance_km?: number
          duration_minutes?: number
          id?: never
          is_active?: boolean
          origin_station_id: number
        }
        Update: {
          agency_id?: number
          created_at?: string
          destination_station_id?: number
          distance_km?: number
          duration_minutes?: number
          id?: never
          is_active?: boolean
          origin_station_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "routes_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routes_destination_station_id_fkey"
            columns: ["destination_station_id"]
            isOneToOne: false
            referencedRelation: "stations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routes_origin_station_id_fkey"
            columns: ["origin_station_id"]
            isOneToOne: false
            referencedRelation: "stations"
            referencedColumns: ["id"]
          },
        ]
      }
      stations: {
        Row: {
          city: string
          code: string
          created_at: string
          id: number
          is_active: boolean
          name: string
        }
        Insert: {
          city: string
          code: string
          created_at?: string
          id?: never
          is_active?: boolean
          name: string
        }
        Update: {
          city?: string
          code?: string
          created_at?: string
          id?: never
          is_active?: boolean
          name?: string
        }
        Relationships: []
      }
      tickets: {
        Row: {
          booking_id: string
          created_at: string
          id: string
          seat_label: string
          status: Database["public"]["Enums"]["ticket_status"]
          ticket_code: string
          used_at: string | null
        }
        Insert: {
          booking_id: string
          created_at?: string
          id?: string
          seat_label: string
          status?: Database["public"]["Enums"]["ticket_status"]
          ticket_code: string
          used_at?: string | null
        }
        Update: {
          booking_id?: string
          created_at?: string
          id?: string
          seat_label?: string
          status?: Database["public"]["Enums"]["ticket_status"]
          ticket_code?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tickets_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      trips: {
        Row: {
          agency_id: number
          arrival_time: string
          bus_id: number
          created_at: string
          departure_time: string
          id: number
          price_rwf: number
          route_id: number
          status: Database["public"]["Enums"]["trip_status"]
          travel_date: string
        }
        Insert: {
          agency_id: number
          arrival_time: string
          bus_id: number
          created_at?: string
          departure_time: string
          id?: never
          price_rwf: number
          route_id: number
          status?: Database["public"]["Enums"]["trip_status"]
          travel_date: string
        }
        Update: {
          agency_id?: number
          arrival_time?: string
          bus_id?: number
          created_at?: string
          departure_time?: string
          id?: never
          price_rwf?: number
          route_id?: number
          status?: Database["public"]["Enums"]["trip_status"]
          travel_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "trips_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trips_bus_id_fkey"
            columns: ["bus_id"]
            isOneToOne: false
            referencedRelation: "buses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trips_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "routes"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          agency_id: number | null
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          agency_id?: number | null
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          agency_id?: number | null
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cancel_booking: { Args: { _booking_id: string }; Returns: undefined }
      create_booking: {
        Args: {
          _passenger_email: string
          _passenger_name: string
          _passenger_phone: string
          _seat_ids: number[]
          _trip_id: number
        }
        Returns: {
          agency_id: number
          booking_ref: string
          created_at: string
          id: string
          passenger_email: string | null
          passenger_id: string
          passenger_name: string
          passenger_phone: string
          seat_count: number
          status: Database["public"]["Enums"]["booking_status"]
          total_amount: number
          trip_id: number
        }
        SetofOptions: {
          from: "*"
          to: "bookings"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      my_agency_id: { Args: never; Returns: number }
      pay_booking: {
        Args: { _booking_id: string; _method: string }
        Returns: {
          agency_id: number
          booking_ref: string
          created_at: string
          id: string
          passenger_email: string | null
          passenger_id: string
          passenger_name: string
          passenger_phone: string
          seat_count: number
          status: Database["public"]["Enums"]["booking_status"]
          total_amount: number
          trip_id: number
        }
        SetofOptions: {
          from: "*"
          to: "bookings"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      app_role: "SUPER_ADMIN" | "AGENCY_ADMIN" | "PASSENGER"
      booking_status: "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED"
      bus_status: "ACTIVE" | "INACTIVE" | "MAINTENANCE"
      payment_status: "PENDING" | "SUCCESSFUL" | "FAILED" | "REFUNDED"
      ticket_status: "VALID" | "USED" | "CANCELLED" | "EXPIRED"
      trip_status:
        | "SCHEDULED"
        | "BOARDING"
        | "DEPARTED"
        | "COMPLETED"
        | "CANCELLED"
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
      app_role: ["SUPER_ADMIN", "AGENCY_ADMIN", "PASSENGER"],
      booking_status: ["PENDING", "CONFIRMED", "CANCELLED", "COMPLETED"],
      bus_status: ["ACTIVE", "INACTIVE", "MAINTENANCE"],
      payment_status: ["PENDING", "SUCCESSFUL", "FAILED", "REFUNDED"],
      ticket_status: ["VALID", "USED", "CANCELLED", "EXPIRED"],
      trip_status: [
        "SCHEDULED",
        "BOARDING",
        "DEPARTED",
        "COMPLETED",
        "CANCELLED",
      ],
    },
  },
} as const
