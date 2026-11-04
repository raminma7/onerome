
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "public": {
          Tables: {
            "admin_audit_log": {
                  Row: {
                    "action": string,"admin_id": string | null,"created_at": string,"id": number,"metadata": NonNullable<Json>,"target_id": string | null,"target_type": string
                  }
                  ComputedFields: never
                  Insert: {
                    "action": string,"admin_id"?: string | null,"created_at"?: string,"id"?: never,"metadata"?: NonNullable<Json>,"target_id"?: string | null,"target_type": string
                  }
                  Update: {
                    "action"?: string,"admin_id"?: string | null,"created_at"?: string,"id"?: never,"metadata"?: NonNullable<Json>,"target_id"?: string | null,"target_type"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "admin_audit_log_admin_id_fkey"
      columns: ["admin_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "admin_audit_log_admin_id_fkey"
      columns: ["admin_id"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"app_config": {
                  Row: {
                    "description": string | null,"key": string,"updated_at": string,"value": NonNullable<Json>
                  }
                  ComputedFields: never
                  Insert: {
                    "description"?: string | null,"key": string,"updated_at"?: string,"value": NonNullable<Json>
                  }
                  Update: {
                    "description"?: string | null,"key"?: string,"updated_at"?: string,"value"?: NonNullable<Json>
                  }
                  Relationships: [
                    
                  ]
                },"blocks": {
                  Row: {
                    "blocked_id": string,"blocker_id": string,"created_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "blocked_id": string,"blocker_id": string,"created_at"?: string
                  }
                  Update: {
                    "blocked_id"?: string,"blocker_id"?: string,"created_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "blocks_blocked_id_fkey"
      columns: ["blocked_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "blocks_blocked_id_fkey"
      columns: ["blocked_id"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "blocks_blocker_id_fkey"
      columns: ["blocker_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "blocks_blocker_id_fkey"
      columns: ["blocker_id"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"booking_requests": {
                  Row: {
                    "admin_note": string | null,"created_at": string,"date_plan_id": string,"id": string,"party_size": number,"requested_for": string,"status": Database["public"]['Enums']["booking_status"],"updated_at": string,"venue_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "admin_note"?: string | null,"created_at"?: string,"date_plan_id": string,"id"?: string,"party_size"?: number,"requested_for": string,"status"?: Database["public"]['Enums']["booking_status"],"updated_at"?: string,"venue_id": string
                  }
                  Update: {
                    "admin_note"?: string | null,"created_at"?: string,"date_plan_id"?: string,"id"?: string,"party_size"?: number,"requested_for"?: string,"status"?: Database["public"]['Enums']["booking_status"],"updated_at"?: string,"venue_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "booking_requests_date_plan_id_fkey"
      columns: ["date_plan_id"]
isOneToOne: false
      referencedRelation: "date_plans"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "booking_requests_venue_id_fkey"
      columns: ["venue_id"]
isOneToOne: false
      referencedRelation: "venues"
      referencedColumns: ["id"]
    }
                  ]
                },"connection_participants": {
                  Row: {
                    "connection_id": string,"is_active": boolean,"last_read_at": string | null,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "connection_id": string,"is_active"?: boolean,"last_read_at"?: string | null,"user_id": string
                  }
                  Update: {
                    "connection_id"?: string,"is_active"?: boolean,"last_read_at"?: string | null,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "connection_participants_connection_id_fkey"
      columns: ["connection_id"]
isOneToOne: false
      referencedRelation: "connections"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "connection_participants_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "connection_participants_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"connections": {
                  Row: {
                    "end_reason": Database["public"]['Enums']["connection_end_reason"] | null,"ended_at": string | null,"ended_by": string | null,"id": string,"last_message_at": string | null,"match_id": string,"pending_sender": string | null,"pending_since": string,"reminder_sent_at": string | null,"started_at": string,"started_by": string | null,"status": Database["public"]['Enums']["connection_status"],"user_high": string | null,"user_low": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "end_reason"?: Database["public"]['Enums']["connection_end_reason"] | null,"ended_at"?: string | null,"ended_by"?: string | null,"id"?: string,"last_message_at"?: string | null,"match_id": string,"pending_sender"?: string | null,"pending_since"?: string,"reminder_sent_at"?: string | null,"started_at"?: string,"started_by"?: string | null,"status"?: Database["public"]['Enums']["connection_status"],"user_high"?: string | null,"user_low"?: string | null
                  }
                  Update: {
                    "end_reason"?: Database["public"]['Enums']["connection_end_reason"] | null,"ended_at"?: string | null,"ended_by"?: string | null,"id"?: string,"last_message_at"?: string | null,"match_id"?: string,"pending_sender"?: string | null,"pending_since"?: string,"reminder_sent_at"?: string | null,"started_at"?: string,"started_by"?: string | null,"status"?: Database["public"]['Enums']["connection_status"],"user_high"?: string | null,"user_low"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "connections_ended_by_fkey"
      columns: ["ended_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "connections_ended_by_fkey"
      columns: ["ended_by"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "connections_match_id_fkey"
      columns: ["match_id"]
isOneToOne: true
      referencedRelation: "matches"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "connections_pending_sender_fkey"
      columns: ["pending_sender"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "connections_pending_sender_fkey"
      columns: ["pending_sender"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "connections_started_by_fkey"
      columns: ["started_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "connections_started_by_fkey"
      columns: ["started_by"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "connections_user_high_fkey"
      columns: ["user_high"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "connections_user_high_fkey"
      columns: ["user_high"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "connections_user_low_fkey"
      columns: ["user_low"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "connections_user_low_fkey"
      columns: ["user_low"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"consents": {
                  Row: {
                    "created_at": string,"granted": boolean,"id": string,"kind": Database["public"]['Enums']["consent_kind"],"user_id": string,"version": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"granted": boolean,"id"?: string,"kind": Database["public"]['Enums']["consent_kind"],"user_id": string,"version": string
                  }
                  Update: {
                    "created_at"?: string,"granted"?: boolean,"id"?: string,"kind"?: Database["public"]['Enums']["consent_kind"],"user_id"?: string,"version"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "consents_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "consents_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"date_plans": {
                  Row: {
                    "connection_id": string,"created_at": string,"high_confirmed_at": string | null,"high_opted_in_at": string | null,"id": string,"low_confirmed_at": string | null,"low_opted_in_at": string | null,"proposed_by": string | null,"scheduled_for": string | null,"status": Database["public"]['Enums']["date_plan_status"],"updated_at": string,"venue_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "connection_id": string,"created_at"?: string,"high_confirmed_at"?: string | null,"high_opted_in_at"?: string | null,"id"?: string,"low_confirmed_at"?: string | null,"low_opted_in_at"?: string | null,"proposed_by"?: string | null,"scheduled_for"?: string | null,"status"?: Database["public"]['Enums']["date_plan_status"],"updated_at"?: string,"venue_id"?: string | null
                  }
                  Update: {
                    "connection_id"?: string,"created_at"?: string,"high_confirmed_at"?: string | null,"high_opted_in_at"?: string | null,"id"?: string,"low_confirmed_at"?: string | null,"low_opted_in_at"?: string | null,"proposed_by"?: string | null,"scheduled_for"?: string | null,"status"?: Database["public"]['Enums']["date_plan_status"],"updated_at"?: string,"venue_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "date_plans_connection_id_fkey"
      columns: ["connection_id"]
isOneToOne: true
      referencedRelation: "connections"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "date_plans_proposed_by_fkey"
      columns: ["proposed_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "date_plans_proposed_by_fkey"
      columns: ["proposed_by"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "date_plans_venue_id_fkey"
      columns: ["venue_id"]
isOneToOne: false
      referencedRelation: "venues"
      referencedColumns: ["id"]
    }
                  ]
                },"likes": {
                  Row: {
                    "created_at": string,"from_user": string,"to_user": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"from_user": string,"to_user": string
                  }
                  Update: {
                    "created_at"?: string,"from_user"?: string,"to_user"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "likes_from_user_fkey"
      columns: ["from_user"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "likes_from_user_fkey"
      columns: ["from_user"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "likes_to_user_fkey"
      columns: ["to_user"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "likes_to_user_fkey"
      columns: ["to_user"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"matches": {
                  Row: {
                    "closed_at": string | null,"created_at": string,"id": string,"status": Database["public"]['Enums']["match_status"],"user_high": string,"user_low": string
                  }
                  ComputedFields: never
                  Insert: {
                    "closed_at"?: string | null,"created_at"?: string,"id"?: string,"status"?: Database["public"]['Enums']["match_status"],"user_high": string,"user_low": string
                  }
                  Update: {
                    "closed_at"?: string | null,"created_at"?: string,"id"?: string,"status"?: Database["public"]['Enums']["match_status"],"user_high"?: string,"user_low"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "matches_user_high_fkey"
      columns: ["user_high"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "matches_user_high_fkey"
      columns: ["user_high"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "matches_user_low_fkey"
      columns: ["user_low"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "matches_user_low_fkey"
      columns: ["user_low"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"messages": {
                  Row: {
                    "body": string,"client_id": string,"connection_id": string,"created_at": string,"id": string,"sender_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "body": string,"client_id": string,"connection_id": string,"created_at"?: string,"id"?: string,"sender_id"?: string | null
                  }
                  Update: {
                    "body"?: string,"client_id"?: string,"connection_id"?: string,"created_at"?: string,"id"?: string,"sender_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "messages_connection_id_fkey"
      columns: ["connection_id"]
isOneToOne: false
      referencedRelation: "connections"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "messages_sender_id_fkey"
      columns: ["sender_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "messages_sender_id_fkey"
      columns: ["sender_id"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"neighborhoods": {
                  Row: {
                    "name": string,"slug": string,"zone": string
                  }
                  ComputedFields: never
                  Insert: {
                    "name": string,"slug": string,"zone": string
                  }
                  Update: {
                    "name"?: string,"slug"?: string,"zone"?: string
                  }
                  Relationships: [
                    
                  ]
                },"notifications": {
                  Row: {
                    "created_at": string,"data": NonNullable<Json>,"id": string,"push_sent_at": string | null,"read_at": string | null,"type": Database["public"]['Enums']["notification_type"],"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"data"?: NonNullable<Json>,"id"?: string,"push_sent_at"?: string | null,"read_at"?: string | null,"type": Database["public"]['Enums']["notification_type"],"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"data"?: NonNullable<Json>,"id"?: string,"push_sent_at"?: string | null,"read_at"?: string | null,"type"?: Database["public"]['Enums']["notification_type"],"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "notifications_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "notifications_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"passes": {
                  Row: {
                    "created_at": string,"from_user": string,"to_user": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"from_user": string,"to_user": string
                  }
                  Update: {
                    "created_at"?: string,"from_user"?: string,"to_user"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "passes_from_user_fkey"
      columns: ["from_user"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "passes_from_user_fkey"
      columns: ["from_user"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "passes_to_user_fkey"
      columns: ["to_user"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "passes_to_user_fkey"
      columns: ["to_user"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"preferences": {
                  Row: {
                    "age_max": number,"age_min": number,"goals": (Database["public"]['Enums']["relationship_goal"])[],"interested_in": (Database["public"]['Enums']["gender"])[],"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "age_max"?: number,"age_min"?: number,"goals"?: (Database["public"]['Enums']["relationship_goal"])[],"interested_in"?: (Database["public"]['Enums']["gender"])[],"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "age_max"?: number,"age_min"?: number,"goals"?: (Database["public"]['Enums']["relationship_goal"])[],"interested_in"?: (Database["public"]['Enums']["gender"])[],"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "preferences_user_id_fkey"
      columns: ["user_id"]
isOneToOne: true
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "preferences_user_id_fkey"
      columns: ["user_id"]
isOneToOne: true
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"profile_photos": {
                  Row: {
                    "created_at": string,"id": string,"position": number,"storage_path": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"position"?: number,"storage_path": string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"position"?: number,"storage_path"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "profile_photos_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "profile_photos_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "bio": string | null,"birth_date": string | null,"core_values": (string)[],"created_at": string,"deleted_at": string | null,"display_name": string | null,"education": string | null,"gender": Database["public"]['Enums']["gender"] | null,"id": string,"interests": (string)[],"is_hidden": boolean,"languages": (string)[],"last_active_at": string,"lifestyle": NonNullable<Json>,"locale": Database["public"]['Enums']["app_locale"],"neighborhood": string | null,"notify_likes": boolean,"occupation": string | null,"onboarding_completed_at": string | null,"personality": (string)[],"relationship_goal": Database["public"]['Enums']["relationship_goal"] | null,"role": Database["public"]['Enums']["user_role"],"suspended_at": string | null,"suspension_reason": string | null,"updated_at": string,"verification": Database["public"]['Enums']["verification_status"]
                  }
                  ComputedFields: never
                  Insert: {
                    "bio"?: string | null,"birth_date"?: string | null,"core_values"?: (string)[],"created_at"?: string,"deleted_at"?: string | null,"display_name"?: string | null,"education"?: string | null,"gender"?: Database["public"]['Enums']["gender"] | null,"id": string,"interests"?: (string)[],"is_hidden"?: boolean,"languages"?: (string)[],"last_active_at"?: string,"lifestyle"?: NonNullable<Json>,"locale"?: Database["public"]['Enums']["app_locale"],"neighborhood"?: string | null,"notify_likes"?: boolean,"occupation"?: string | null,"onboarding_completed_at"?: string | null,"personality"?: (string)[],"relationship_goal"?: Database["public"]['Enums']["relationship_goal"] | null,"role"?: Database["public"]['Enums']["user_role"],"suspended_at"?: string | null,"suspension_reason"?: string | null,"updated_at"?: string,"verification"?: Database["public"]['Enums']["verification_status"]
                  }
                  Update: {
                    "bio"?: string | null,"birth_date"?: string | null,"core_values"?: (string)[],"created_at"?: string,"deleted_at"?: string | null,"display_name"?: string | null,"education"?: string | null,"gender"?: Database["public"]['Enums']["gender"] | null,"id"?: string,"interests"?: (string)[],"is_hidden"?: boolean,"languages"?: (string)[],"last_active_at"?: string,"lifestyle"?: NonNullable<Json>,"locale"?: Database["public"]['Enums']["app_locale"],"neighborhood"?: string | null,"notify_likes"?: boolean,"occupation"?: string | null,"onboarding_completed_at"?: string | null,"personality"?: (string)[],"relationship_goal"?: Database["public"]['Enums']["relationship_goal"] | null,"role"?: Database["public"]['Enums']["user_role"],"suspended_at"?: string | null,"suspension_reason"?: string | null,"updated_at"?: string,"verification"?: Database["public"]['Enums']["verification_status"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "profiles_neighborhood_fkey"
      columns: ["neighborhood"]
isOneToOne: false
      referencedRelation: "neighborhoods"
      referencedColumns: ["slug"]
    }
                  ]
                },"push_subscriptions": {
                  Row: {
                    "auth": string,"created_at": string,"endpoint": string,"id": string,"p256dh": string,"user_agent": string | null,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "auth": string,"created_at"?: string,"endpoint": string,"id"?: string,"p256dh": string,"user_agent"?: string | null,"user_id": string
                  }
                  Update: {
                    "auth"?: string,"created_at"?: string,"endpoint"?: string,"id"?: string,"p256dh"?: string,"user_agent"?: string | null,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "push_subscriptions_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "push_subscriptions_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"reports": {
                  Row: {
                    "connection_id": string | null,"created_at": string,"details": string | null,"id": string,"message_id": string | null,"message_snapshot": string | null,"reason": Database["public"]['Enums']["report_reason"],"reported_user_id": string | null,"reporter_id": string | null,"resolution_note": string | null,"resolved_at": string | null,"resolved_by": string | null,"status": Database["public"]['Enums']["report_status"]
                  }
                  ComputedFields: never
                  Insert: {
                    "connection_id"?: string | null,"created_at"?: string,"details"?: string | null,"id"?: string,"message_id"?: string | null,"message_snapshot"?: string | null,"reason": Database["public"]['Enums']["report_reason"],"reported_user_id"?: string | null,"reporter_id"?: string | null,"resolution_note"?: string | null,"resolved_at"?: string | null,"resolved_by"?: string | null,"status"?: Database["public"]['Enums']["report_status"]
                  }
                  Update: {
                    "connection_id"?: string | null,"created_at"?: string,"details"?: string | null,"id"?: string,"message_id"?: string | null,"message_snapshot"?: string | null,"reason"?: Database["public"]['Enums']["report_reason"],"reported_user_id"?: string | null,"reporter_id"?: string | null,"resolution_note"?: string | null,"resolved_at"?: string | null,"resolved_by"?: string | null,"status"?: Database["public"]['Enums']["report_status"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "reports_connection_id_fkey"
      columns: ["connection_id"]
isOneToOne: false
      referencedRelation: "connections"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "reports_message_id_fkey"
      columns: ["message_id"]
isOneToOne: false
      referencedRelation: "messages"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "reports_reported_user_id_fkey"
      columns: ["reported_user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "reports_reported_user_id_fkey"
      columns: ["reported_user_id"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "reports_reporter_id_fkey"
      columns: ["reporter_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "reports_reporter_id_fkey"
      columns: ["reporter_id"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "reports_resolved_by_fkey"
      columns: ["resolved_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "reports_resolved_by_fkey"
      columns: ["resolved_by"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"stripe_customers": {
                  Row: {
                    "created_at": string,"stripe_customer_id": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"stripe_customer_id": string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"stripe_customer_id"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "stripe_customers_user_id_fkey"
      columns: ["user_id"]
isOneToOne: true
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "stripe_customers_user_id_fkey"
      columns: ["user_id"]
isOneToOne: true
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"stripe_events": {
                  Row: {
                    "id": string,"received_at": string,"type": string
                  }
                  ComputedFields: never
                  Insert: {
                    "id": string,"received_at"?: string,"type": string
                  }
                  Update: {
                    "id"?: string,"received_at"?: string,"type"?: string
                  }
                  Relationships: [
                    
                  ]
                },"subscriptions": {
                  Row: {
                    "cancel_at_period_end": boolean,"canceled_at": string | null,"created_at": string,"current_period_end": string | null,"id": string,"price_id": string | null,"status": Database["public"]['Enums']["subscription_status"],"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "cancel_at_period_end"?: boolean,"canceled_at"?: string | null,"created_at"?: string,"current_period_end"?: string | null,"id": string,"price_id"?: string | null,"status": Database["public"]['Enums']["subscription_status"],"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "cancel_at_period_end"?: boolean,"canceled_at"?: string | null,"created_at"?: string,"current_period_end"?: string | null,"id"?: string,"price_id"?: string | null,"status"?: Database["public"]['Enums']["subscription_status"],"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "subscriptions_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "subscriptions_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"venues": {
                  Row: {
                    "address": string,"booking_mode": Database["public"]['Enums']["booking_mode"],"category": Database["public"]['Enums']["venue_category"],"created_at": string,"description_en": string,"description_it": string,"discount_en": string | null,"discount_it": string | null,"id": string,"image_urls": (string)[],"is_active": boolean,"is_partner": boolean,"name": string,"neighborhood": string | null,"price_level": number,"slug": string,"updated_at": string,"website": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "address": string,"booking_mode"?: Database["public"]['Enums']["booking_mode"],"category": Database["public"]['Enums']["venue_category"],"created_at"?: string,"description_en"?: string,"description_it"?: string,"discount_en"?: string | null,"discount_it"?: string | null,"id"?: string,"image_urls"?: (string)[],"is_active"?: boolean,"is_partner"?: boolean,"name": string,"neighborhood"?: string | null,"price_level"?: number,"slug": string,"updated_at"?: string,"website"?: string | null
                  }
                  Update: {
                    "address"?: string,"booking_mode"?: Database["public"]['Enums']["booking_mode"],"category"?: Database["public"]['Enums']["venue_category"],"created_at"?: string,"description_en"?: string,"description_it"?: string,"discount_en"?: string | null,"discount_it"?: string | null,"id"?: string,"image_urls"?: (string)[],"is_active"?: boolean,"is_partner"?: boolean,"name"?: string,"neighborhood"?: string | null,"price_level"?: number,"slug"?: string,"updated_at"?: string,"website"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "venues_neighborhood_fkey"
      columns: ["neighborhood"]
isOneToOne: false
      referencedRelation: "neighborhoods"
      referencedColumns: ["slug"]
    }
                  ]
                },"verification_requests": {
                  Row: {
                    "created_at": string,"id": string,"reviewed_at": string | null,"reviewed_by": string | null,"status": Database["public"]['Enums']["verification_status"],"storage_path": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"reviewed_at"?: string | null,"reviewed_by"?: string | null,"status"?: Database["public"]['Enums']["verification_status"],"storage_path": string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"reviewed_at"?: string | null,"reviewed_by"?: string | null,"status"?: Database["public"]['Enums']["verification_status"],"storage_path"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "verification_requests_reviewed_by_fkey"
      columns: ["reviewed_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "verification_requests_reviewed_by_fkey"
      columns: ["reviewed_by"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "verification_requests_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "verification_requests_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            "public_profiles": {
                  Row: {
                    "age": number | null,"bio": string | null,"core_values": (string)[],"display_name": string | null,"education": string | null,"gender": Database["public"]['Enums']["gender"] | null,"id": string,"interests": (string)[],"is_verified": boolean | null,"languages": (string)[],"lifestyle": NonNullable<Json>,"neighborhood": string | null,"neighborhood_name": string | null,"neighborhood_zone": string | null,"occupation": string | null,"personality": (string)[],"photo_paths": (string)[] | null,"relationship_goal": Database["public"]['Enums']["relationship_goal"] | null
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "profiles_neighborhood_fkey"
      columns: ["neighborhood"]
isOneToOne: false
      referencedRelation: "neighborhoods"
      referencedColumns: ["slug"]
    }
                  ]
                }
          }
          Functions: {
            "admin_get_report_evidence":
{ Args: { "p_report": string }; Returns: Json
                           },
"admin_list_bookings":
{ Args: { "p_status"?: Database["public"]['Enums']["booking_status"] }; Returns: {
              "admin_note": string,"created_at": string,"id": string,"party_size": number,"requested_for": string,"status": Database["public"]['Enums']["booking_status"],"venue_id": string,"venue_name": string
            }[]
                           },
"admin_list_reports":
{ Args: { "p_limit"?: number,"p_status"?: Database["public"]['Enums']["report_status"] }; Returns: {
              "created_at": string,"details": string,"has_message_evidence": boolean,"id": string,"reason": Database["public"]['Enums']["report_reason"],"reported_name": string,"reported_user_id": string,"reporter_id": string,"reporter_name": string,"resolution_note": string,"resolved_at": string,"status": Database["public"]['Enums']["report_status"]
            }[]
                           },
"admin_list_subscriptions":
{ Args: { "p_limit"?: number }; Returns: {
              "cancel_at_period_end": boolean,"current_period_end": string,"display_name": string,"id": string,"status": Database["public"]['Enums']["subscription_status"],"updated_at": string,"user_id": string
            }[]
                           },
"admin_list_verifications":
{ Args: Record<PropertyKey, never>; Returns: {
              "created_at": string,"display_name": string,"id": string,"storage_path": string,"user_id": string
            }[]
                           },
"admin_resolve_report":
{ Args: { "p_note"?: string,"p_report": string,"p_status": Database["public"]['Enums']["report_status"] }; Returns: undefined
                           },
"admin_review_verification":
{ Args: { "p_approve": boolean,"p_request": string }; Returns: undefined
                           },
"admin_search_users":
{ Args: { "p_filter"?: string,"p_limit"?: number,"p_offset"?: number,"p_query"?: string }; Returns: {
              "age": number,"created_at": string,"display_name": string,"email": string,"id": string,"last_active_at": string,"neighborhood": string,"onboarding_completed_at": string,"reports_against": number,"role": Database["public"]['Enums']["user_role"],"subscription_status": Database["public"]['Enums']["subscription_status"],"suspended_at": string,"suspension_reason": string,"verification": Database["public"]['Enums']["verification_status"]
            }[]
                           },
"admin_set_suspension":
{ Args: { "p_reason"?: string,"p_suspend": boolean,"p_user": string }; Returns: undefined
                           },
"admin_stats":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"admin_update_booking":
{ Args: { "p_booking": string,"p_note"?: string,"p_status": Database["public"]['Enums']["booking_status"] }; Returns: undefined
                           },
"block_user":
{ Args: { "p_target": string }; Returns: undefined
                           },
"complete_onboarding":
{ Args: Record<PropertyKey, never>; Returns: undefined
                           },
"end_connection":
{ Args: { "p_connection": string }; Returns: boolean
                           },
"first_date_cancel":
{ Args: { "p_connection": string }; Returns: undefined
                           },
"first_date_confirm":
{ Args: { "p_connection": string }; Returns: {
              "connection_id": string,
"created_at": string,
"high_confirmed_at": string | null,
"high_opted_in_at": string | null,
"id": string,
"low_confirmed_at": string | null,
"low_opted_in_at": string | null,
"proposed_by": string | null,
"scheduled_for": string | null,
"status": Database["public"]['Enums']["date_plan_status"],
"updated_at": string,
"venue_id": string | null
            }
                          SetofOptions: {
        from: "*"
        to: "date_plans"
        isOneToOne: true
        isSetofReturn: false
      } },
"first_date_opt_in":
{ Args: { "p_connection": string }; Returns: {
              "connection_id": string,
"created_at": string,
"high_confirmed_at": string | null,
"high_opted_in_at": string | null,
"id": string,
"low_confirmed_at": string | null,
"low_opted_in_at": string | null,
"proposed_by": string | null,
"scheduled_for": string | null,
"status": Database["public"]['Enums']["date_plan_status"],
"updated_at": string,
"venue_id": string | null
            }
                          SetofOptions: {
        from: "*"
        to: "date_plans"
        isOneToOne: true
        isSetofReturn: false
      } },
"first_date_propose":
{ Args: { "p_connection": string,"p_scheduled_for": string,"p_venue": string }; Returns: {
              "connection_id": string,
"created_at": string,
"high_confirmed_at": string | null,
"high_opted_in_at": string | null,
"id": string,
"low_confirmed_at": string | null,
"low_opted_in_at": string | null,
"proposed_by": string | null,
"scheduled_for": string | null,
"status": Database["public"]['Enums']["date_plan_status"],
"updated_at": string,
"venue_id": string | null
            }
                          SetofOptions: {
        from: "*"
        to: "date_plans"
        isOneToOne: true
        isSetofReturn: false
      } },
"get_active_connection":
{ Args: Record<PropertyKey, never>; Returns: {
              "connection_id": string,"deadline": string,"match_id": string,"me_subscribed": boolean,"my_last_read_at": string,"partner_id": string,"partner_last_read_at": string,"partner_subscribed": boolean,"pending_sender": string,"pending_since": string,"started_at": string,"started_by": string
            }[]
                           },
"get_blocked_users":
{ Args: Record<PropertyKey, never>; Returns: {
              "display_name": string,"user_id": string
            }[]
                           },
"get_discover_candidates":
{ Args: { "p_limit"?: number }; Returns: {
              "age": number,"bio": string,"core_values": (string)[],"display_name": string,"education": string,"gender": Database["public"]['Enums']["gender"],"id": string,"interests": (string)[],"is_verified": boolean,"languages": (string)[],"lifestyle": Json,"neighborhood": string,"neighborhood_name": string,"neighborhood_zone": string,"occupation": string,"personality": (string)[],"photo_paths": (string)[],"pref_goals": (Database["public"]['Enums']["relationship_goal"])[],"relationship_goal": Database["public"]['Enums']["relationship_goal"]
            }[]
                           },
"get_my_matches":
{ Args: Record<PropertyKey, never>; Returns: {
              "connection_id": string,"connection_status": Database["public"]['Enums']["connection_status"],"match_id": string,"match_status": Database["public"]['Enums']["match_status"],"matched_at": string,"partner_available": boolean,"partner_id": string,"partner_in_connection": boolean,"partner_subscribed": boolean
            }[]
                           },
"get_received_likes":
{ Args: Record<PropertyKey, never>; Returns: {
              "liked_at": string,"user_id": string
            }[]
                           },
"is_admin":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"like_profile":
{ Args: { "p_target": string }; Returns: Json
                           },
"mark_connection_read":
{ Args: { "p_connection": string }; Returns: undefined
                           },
"pass_profile":
{ Args: { "p_target": string }; Returns: undefined
                           },
"prepare_account_deletion":
{ Args: Record<PropertyKey, never>; Returns: undefined
                           },
"report_user":
{ Args: { "p_block"?: boolean,"p_details"?: string,"p_message_id"?: string,"p_reason": Database["public"]['Enums']["report_reason"],"p_target": string }; Returns: string
                           },
"request_verification":
{ Args: { "p_storage_path": string }; Returns: string
                           },
"send_message":
{ Args: { "p_body": string,"p_client_id": string,"p_connection": string }; Returns: {
              "body": string,
"client_id": string,
"connection_id": string,
"created_at": string,
"id": string,
"sender_id": string | null
            }
                          SetofOptions: {
        from: "*"
        to: "messages"
        isOneToOne: true
        isSetofReturn: false
      } },
"start_connection":
{ Args: { "p_match_id": string }; Returns: string
                           },
"unblock_user":
{ Args: { "p_target": string }; Returns: undefined
                           }
          }
          Enums: {
            "app_locale": "it"|"en","booking_mode": "none"|"request","booking_status": "requested"|"confirmed"|"declined"|"cancelled","connection_end_reason": "manual"|"timeout"|"block"|"report"|"account_deleted"|"admin","connection_status": "active"|"closed","consent_kind": "terms"|"privacy"|"sensitive_data"|"marketing","date_plan_status": "opt_in"|"planning"|"confirmed"|"cancelled","gender": "woman"|"man"|"non_binary","match_status": "active"|"closed","notification_type": "like_received"|"mutual_match"|"connection_started"|"new_message"|"inactivity_reminder"|"connection_ended"|"first_date_update"|"booking_status"|"subscription_status"|"verification_status","relationship_goal": "long_term"|"marriage"|"open"|"figuring_out","report_reason": "spam"|"fake_profile"|"harassment"|"inappropriate_content"|"underage"|"scam"|"other","report_status": "open"|"reviewing"|"actioned"|"dismissed","subscription_status": "incomplete"|"incomplete_expired"|"trialing"|"active"|"past_due"|"canceled"|"unpaid"|"paused","user_role": "user"|"admin","venue_category": "cafe"|"restaurant"|"wine_bar"|"gelateria"|"culture"|"park"|"experience","verification_status": "unverified"|"pending"|"verified"|"rejected"
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
  "public": {
          Enums: {
            "app_locale": ["it", "en"],"booking_mode": ["none", "request"],"booking_status": ["requested", "confirmed", "declined", "cancelled"],"connection_end_reason": ["manual", "timeout", "block", "report", "account_deleted", "admin"],"connection_status": ["active", "closed"],"consent_kind": ["terms", "privacy", "sensitive_data", "marketing"],"date_plan_status": ["opt_in", "planning", "confirmed", "cancelled"],"gender": ["woman", "man", "non_binary"],"match_status": ["active", "closed"],"notification_type": ["like_received", "mutual_match", "connection_started", "new_message", "inactivity_reminder", "connection_ended", "first_date_update", "booking_status", "subscription_status", "verification_status"],"relationship_goal": ["long_term", "marriage", "open", "figuring_out"],"report_reason": ["spam", "fake_profile", "harassment", "inappropriate_content", "underage", "scam", "other"],"report_status": ["open", "reviewing", "actioned", "dismissed"],"subscription_status": ["incomplete", "incomplete_expired", "trialing", "active", "past_due", "canceled", "unpaid", "paused"],"user_role": ["user", "admin"],"venue_category": ["cafe", "restaurant", "wine_bar", "gelateria", "culture", "park", "experience"],"verification_status": ["unverified", "pending", "verified", "rejected"]
          }
        }
} as const
