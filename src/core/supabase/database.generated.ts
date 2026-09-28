
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "agendo": {
          Tables: {
            "appointments": {
                  Row: {
                    "cancelled_at": string | null,"client_id": string,"created_at": string,"during": unknown,"ends_at": string,"id": string,"professional_id": string,"reminder_sent_at": string | null,"service_id": string,"starts_at": string,"status": Database["agendo"]['Enums']["appointment_status"],"updated_at": string
                  }
                  Insert: {
                    "cancelled_at"?: string | null,"client_id": string,"created_at"?: string,"during"?: never,"ends_at": string,"id"?: string,"professional_id": string,"reminder_sent_at"?: string | null,"service_id": string,"starts_at": string,"status"?: Database["agendo"]['Enums']["appointment_status"],"updated_at"?: string
                  }
                  Update: {
                    "cancelled_at"?: string | null,"client_id"?: string,"created_at"?: string,"during"?: never,"ends_at"?: string,"id"?: string,"professional_id"?: string,"reminder_sent_at"?: string | null,"service_id"?: string,"starts_at"?: string,"status"?: Database["agendo"]['Enums']["appointment_status"],"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "appointments_client_id_fkey"
      columns: ["client_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "appointments_professional_id_fkey"
      columns: ["professional_id"]
isOneToOne: false
      referencedRelation: "professionals"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "appointments_service_id_fkey"
      columns: ["service_id"]
isOneToOne: false
      referencedRelation: "services"
      referencedColumns: ["id"]
    }
                  ]
                },"business": {
                  Row: {
                    "cancel_limit_hours": number,"currency": string,"id": string,"max_advance_days": number,"min_notice_minutes": number,"name": string,"reminder_lead_minutes": number,"slot_interval_minutes": number,"timezone": string
                  }
                  Insert: {
                    "cancel_limit_hours"?: number,"currency": string,"id"?: string,"max_advance_days"?: number,"min_notice_minutes"?: number,"name": string,"reminder_lead_minutes"?: number,"slot_interval_minutes"?: number,"timezone": string
                  }
                  Update: {
                    "cancel_limit_hours"?: number,"currency"?: string,"id"?: string,"max_advance_days"?: number,"min_notice_minutes"?: number,"name"?: string,"reminder_lead_minutes"?: number,"slot_interval_minutes"?: number,"timezone"?: string
                  }
                  Relationships: [
                    
                  ]
                },"professional_services": {
                  Row: {
                    "professional_id": string,"service_id": string
                  }
                  Insert: {
                    "professional_id": string,"service_id": string
                  }
                  Update: {
                    "professional_id"?: string,"service_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "professional_services_professional_id_fkey"
      columns: ["professional_id"]
isOneToOne: false
      referencedRelation: "professionals"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "professional_services_service_id_fkey"
      columns: ["service_id"]
isOneToOne: false
      referencedRelation: "services"
      referencedColumns: ["id"]
    }
                  ]
                },"professionals": {
                  Row: {
                    "avatar_url": string | null,"bio": string,"id": string,"is_active": boolean,"name": string
                  }
                  Insert: {
                    "avatar_url"?: string | null,"bio"?: string,"id"?: string,"is_active"?: boolean,"name": string
                  }
                  Update: {
                    "avatar_url"?: string | null,"bio"?: string,"id"?: string,"is_active"?: boolean,"name"?: string
                  }
                  Relationships: [
                    
                  ]
                },"profiles": {
                  Row: {
                    "created_at": string,"full_name": string,"id": string,"role": Database["agendo"]['Enums']["user_role"]
                  }
                  Insert: {
                    "created_at"?: string,"full_name": string,"id": string,"role"?: Database["agendo"]['Enums']["user_role"]
                  }
                  Update: {
                    "created_at"?: string,"full_name"?: string,"id"?: string,"role"?: Database["agendo"]['Enums']["user_role"]
                  }
                  Relationships: [
                    
                  ]
                },"push_tokens": {
                  Row: {
                    "id": string,"platform": string,"token": string,"updated_at": string,"user_id": string
                  }
                  Insert: {
                    "id"?: string,"platform": string,"token": string,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "id"?: string,"platform"?: string,"token"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "push_tokens_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"services": {
                  Row: {
                    "description": string,"duration_minutes": number,"id": string,"is_active": boolean,"name": string,"price_cents": number,"sort_order": number
                  }
                  Insert: {
                    "description"?: string,"duration_minutes": number,"id"?: string,"is_active"?: boolean,"name": string,"price_cents": number,"sort_order"?: number
                  }
                  Update: {
                    "description"?: string,"duration_minutes"?: number,"id"?: string,"is_active"?: boolean,"name"?: string,"price_cents"?: number,"sort_order"?: number
                  }
                  Relationships: [
                    
                  ]
                },"working_hours": {
                  Row: {
                    "end_time": string,"id": string,"professional_id": string,"start_time": string,"weekday": number
                  }
                  Insert: {
                    "end_time": string,"id"?: string,"professional_id": string,"start_time": string,"weekday": number
                  }
                  Update: {
                    "end_time"?: string,"id"?: string,"professional_id"?: string,"start_time"?: string,"weekday"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "working_hours_professional_id_fkey"
      columns: ["professional_id"]
isOneToOne: false
      referencedRelation: "professionals"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            "appointments_expanded": {
                  Row: {
                    "cancelled_at": string | null,"client_id": string | null,"client_name": string | null,"created_at": string | null,"ends_at": string | null,"id": string | null,"professional_id": string | null,"professional_name": string | null,"service_id": string | null,"service_name": string | null,"starts_at": string | null,"status": Database["agendo"]['Enums']["appointment_status"] | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "appointments_client_id_fkey"
      columns: ["client_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "appointments_professional_id_fkey"
      columns: ["professional_id"]
isOneToOne: false
      referencedRelation: "professionals"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "appointments_service_id_fkey"
      columns: ["service_id"]
isOneToOne: false
      referencedRelation: "services"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Functions: {
            "assert_bookable":
{ Args: { "p_ends_at": string,"p_professional_id": string,"p_starts_at": string }; Returns: undefined
                           },
"book_appointment":
{ Args: { "p_professional_id": string,"p_service_id": string,"p_starts_at": string }; Returns: {
              "cancelled_at": string | null,
"client_id": string,
"created_at": string,
"during": unknown,
"ends_at": string,
"id": string,
"professional_id": string,
"reminder_sent_at": string | null,
"service_id": string,
"starts_at": string,
"status": Database["agendo"]['Enums']["appointment_status"],
"updated_at": string
            }
                          SetofOptions: {
        from: "*"
        to: "appointments"
        isOneToOne: true
        isSetofReturn: false
      } },
"cancel_appointment":
{ Args: { "p_id": string }; Returns: undefined
                           },
"ensure_profile":
{ Args: { "p_full_name": string }; Returns: {
              "created_at": string,
"full_name": string,
"id": string,
"role": Database["agendo"]['Enums']["user_role"]
            }
                          SetofOptions: {
        from: "*"
        to: "profiles"
        isOneToOne: true
        isSetofReturn: false
      } },
"get_busy_ranges":
{ Args: { "p_from": string,"p_professional_id": string,"p_to": string }; Returns: {
              "ends_at": string,"starts_at": string
            }[]
                           },
"is_admin":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"reschedule_appointment":
{ Args: { "p_id": string,"p_new_starts_at": string }; Returns: {
              "cancelled_at": string | null,
"client_id": string,
"created_at": string,
"during": unknown,
"ends_at": string,
"id": string,
"professional_id": string,
"reminder_sent_at": string | null,
"service_id": string,
"starts_at": string,
"status": Database["agendo"]['Enums']["appointment_status"],
"updated_at": string
            }
                          SetofOptions: {
        from: "*"
        to: "appointments"
        isOneToOne: true
        isSetofReturn: false
      } }
          }
          Enums: {
            "appointment_status": "booked"|"cancelled"|"completed"|"no_show","user_role": "client"|"admin"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "agendo": {
          Enums: {
            "appointment_status": ["booked", "cancelled", "completed", "no_show"],"user_role": ["client", "admin"]
          }
        }
} as const

