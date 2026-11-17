
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "app_settings": {
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
                },"audit_log": {
                  Row: {
                    "action": string,"actor_id": string | null,"created_at": string,"id": number,"metadata": NonNullable<Json>,"target_id": string | null,"target_type": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "action": string,"actor_id"?: string | null,"created_at"?: string,"id"?: never,"metadata"?: NonNullable<Json>,"target_id"?: string | null,"target_type"?: string | null
                  }
                  Update: {
                    "action"?: string,"actor_id"?: string | null,"created_at"?: string,"id"?: never,"metadata"?: NonNullable<Json>,"target_id"?: string | null,"target_type"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"availabilities": {
                  Row: {
                    "created_at": string,"ends_at": string,"game_platform_id": string | null,"kind": string,"note": string,"profile_id": string,"starts_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"ends_at": string,"game_platform_id"?: string | null,"kind": string,"note"?: string,"profile_id": string,"starts_at": string
                  }
                  Update: {
                    "created_at"?: string,"ends_at"?: string,"game_platform_id"?: string | null,"kind"?: string,"note"?: string,"profile_id"?: string,"starts_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "availabilities_game_platform_id_fkey"
      columns: ["game_platform_id"]
isOneToOne: false
      referencedRelation: "game_platforms"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "availabilities_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: true
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"badges": {
                  Row: {
                    "description": string,"name": string,"slug": string,"sort_order": number
                  }
                  ComputedFields: never
                  Insert: {
                    "description": string,"name": string,"slug": string,"sort_order"?: number
                  }
                  Update: {
                    "description"?: string,"name"?: string,"slug"?: string,"sort_order"?: number
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
                    
                  ]
                },"contact_requests": {
                  Row: {
                    "created_at": string,"id": string,"message": string,"recipient_id": string,"responded_at": string | null,"sender_id": string,"status": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"message"?: string,"recipient_id": string,"responded_at"?: string | null,"sender_id": string,"status"?: string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"message"?: string,"recipient_id"?: string,"responded_at"?: string | null,"sender_id"?: string,"status"?: string
                  }
                  Relationships: [
                    
                  ]
                },"conversation_participants": {
                  Row: {
                    "conversation_id": string,"last_read_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "conversation_id": string,"last_read_at"?: string,"user_id": string
                  }
                  Update: {
                    "conversation_id"?: string,"last_read_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "conversation_participants_conversation_id_fkey"
      columns: ["conversation_id"]
isOneToOne: false
      referencedRelation: "conversations"
      referencedColumns: ["id"]
    }
                  ]
                },"conversations": {
                  Row: {
                    "created_at": string,"id": string,"last_message_at": string | null,"user_high": string,"user_low": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"last_message_at"?: string | null,"user_high": string,"user_low": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"last_message_at"?: string | null,"user_high"?: string,"user_low"?: string
                  }
                  Relationships: [
                    
                  ]
                },"daily_challenge_items": {
                  Row: {
                    "challenge_id": string,"position": number,"ref_b_id": string | null,"ref_b_type": string | null,"ref_id": string,"ref_type": string
                  }
                  ComputedFields: never
                  Insert: {
                    "challenge_id": string,"position": number,"ref_b_id"?: string | null,"ref_b_type"?: string | null,"ref_id": string,"ref_type": string
                  }
                  Update: {
                    "challenge_id"?: string,"position"?: number,"ref_b_id"?: string | null,"ref_b_type"?: string | null,"ref_id"?: string,"ref_type"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "daily_challenge_items_challenge_id_fkey"
      columns: ["challenge_id"]
isOneToOne: false
      referencedRelation: "daily_challenges"
      referencedColumns: ["id"]
    }
                  ]
                },"daily_challenges": {
                  Row: {
                    "challenge_date": string,"created_at": string,"created_by": string | null,"game_kind": string,"id": string,"is_demo": boolean,"published_at": string | null,"round_count": number,"status": string,"title": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "challenge_date": string,"created_at"?: string,"created_by"?: string | null,"game_kind": string,"id"?: string,"is_demo"?: boolean,"published_at"?: string | null,"round_count": number,"status"?: string,"title"?: string,"updated_at"?: string
                  }
                  Update: {
                    "challenge_date"?: string,"created_at"?: string,"created_by"?: string | null,"game_kind"?: string,"id"?: string,"is_demo"?: boolean,"published_at"?: string | null,"round_count"?: number,"status"?: string,"title"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"game_maps": {
                  Row: {
                    "created_at": string,"game_id": string,"height": number,"id": string,"image_id": string | null,"is_demo": boolean,"meters_per_unit": number | null,"name": string,"scale_source": string | null,"scale_verified": boolean,"status": Database["public"]['Enums']["content_status"],"updated_at": string,"width": number
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"game_id": string,"height": number,"id"?: string,"image_id"?: string | null,"is_demo"?: boolean,"meters_per_unit"?: number | null,"name": string,"scale_source"?: string | null,"scale_verified"?: boolean,"status"?: Database["public"]['Enums']["content_status"],"updated_at"?: string,"width": number
                  }
                  Update: {
                    "created_at"?: string,"game_id"?: string,"height"?: number,"id"?: string,"image_id"?: string | null,"is_demo"?: boolean,"meters_per_unit"?: number | null,"name"?: string,"scale_source"?: string | null,"scale_verified"?: boolean,"status"?: Database["public"]['Enums']["content_status"],"updated_at"?: string,"width"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "game_maps_game_id_fkey"
      columns: ["game_id"]
isOneToOne: false
      referencedRelation: "games"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "game_maps_image_id_fkey"
      columns: ["image_id"]
isOneToOne: false
      referencedRelation: "media_assets"
      referencedColumns: ["id"]
    }
                  ]
                },"game_platforms": {
                  Row: {
                    "created_at": string,"crossplay_group": string | null,"game_id": string,"id": string,"is_demo": boolean,"matchmaking_enabled": boolean,"notes": string,"platform_id": string,"status": Database["public"]['Enums']["content_status"],"updated_at": string,"version_label": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"crossplay_group"?: string | null,"game_id": string,"id"?: string,"is_demo"?: boolean,"matchmaking_enabled"?: boolean,"notes"?: string,"platform_id": string,"status"?: Database["public"]['Enums']["content_status"],"updated_at"?: string,"version_label"?: string
                  }
                  Update: {
                    "created_at"?: string,"crossplay_group"?: string | null,"game_id"?: string,"id"?: string,"is_demo"?: boolean,"matchmaking_enabled"?: boolean,"notes"?: string,"platform_id"?: string,"status"?: Database["public"]['Enums']["content_status"],"updated_at"?: string,"version_label"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "game_platforms_game_id_fkey"
      columns: ["game_id"]
isOneToOne: false
      referencedRelation: "games"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "game_platforms_platform_id_fkey"
      columns: ["platform_id"]
isOneToOne: false
      referencedRelation: "platforms"
      referencedColumns: ["id"]
    }
                  ]
                },"game_results": {
                  Row: {
                    "challenge_date": string | null,"challenge_id": string | null,"completed_at": string,"duration_ms": number,"game_kind": string,"max_score": number | null,"mode": string,"ranked": boolean,"score": number,"session_id": string,"share_text": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "challenge_date"?: string | null,"challenge_id"?: string | null,"completed_at"?: string,"duration_ms": number,"game_kind": string,"max_score"?: number | null,"mode": string,"ranked": boolean,"score": number,"session_id": string,"share_text"?: string,"user_id": string
                  }
                  Update: {
                    "challenge_date"?: string | null,"challenge_id"?: string | null,"completed_at"?: string,"duration_ms"?: number,"game_kind"?: string,"max_score"?: number | null,"mode"?: string,"ranked"?: boolean,"score"?: number,"session_id"?: string,"share_text"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "game_results_challenge_id_fkey"
      columns: ["challenge_id"]
isOneToOne: false
      referencedRelation: "daily_challenges"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "game_results_session_id_fkey"
      columns: ["session_id"]
isOneToOne: true
      referencedRelation: "game_sessions"
      referencedColumns: ["id"]
    }
                  ]
                },"game_rounds": {
                  Row: {
                    "answered_at": string | null,"answers": NonNullable<Json>,"attempts": number,"created_at": string,"max_attempts": number,"position": number,"ref_b_id": string | null,"ref_b_type": string | null,"ref_id": string,"ref_type": string,"result": Json | null,"score": number | null,"session_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "answered_at"?: string | null,"answers"?: NonNullable<Json>,"attempts"?: number,"created_at"?: string,"max_attempts"?: number,"position": number,"ref_b_id"?: string | null,"ref_b_type"?: string | null,"ref_id": string,"ref_type": string,"result"?: Json | null,"score"?: number | null,"session_id": string
                  }
                  Update: {
                    "answered_at"?: string | null,"answers"?: NonNullable<Json>,"attempts"?: number,"created_at"?: string,"max_attempts"?: number,"position"?: number,"ref_b_id"?: string | null,"ref_b_type"?: string | null,"ref_id"?: string,"ref_type"?: string,"result"?: Json | null,"score"?: number | null,"session_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "game_rounds_session_id_fkey"
      columns: ["session_id"]
isOneToOne: false
      referencedRelation: "game_sessions"
      referencedColumns: ["id"]
    }
                  ]
                },"game_sessions": {
                  Row: {
                    "challenge_date": string | null,"challenge_id": string | null,"current_position": number,"expires_at": string,"finished_at": string | null,"game_kind": string,"guest_token_hash": string | null,"id": string,"max_score": number | null,"meta": NonNullable<Json>,"mode": string,"ranked": boolean,"score": number,"started_at": string,"status": string,"total_rounds": number | null,"user_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "challenge_date"?: string | null,"challenge_id"?: string | null,"current_position"?: number,"expires_at": string,"finished_at"?: string | null,"game_kind": string,"guest_token_hash"?: string | null,"id"?: string,"max_score"?: number | null,"meta"?: NonNullable<Json>,"mode": string,"ranked"?: boolean,"score"?: number,"started_at"?: string,"status"?: string,"total_rounds"?: number | null,"user_id"?: string | null
                  }
                  Update: {
                    "challenge_date"?: string | null,"challenge_id"?: string | null,"current_position"?: number,"expires_at"?: string,"finished_at"?: string | null,"game_kind"?: string,"guest_token_hash"?: string | null,"id"?: string,"max_score"?: number | null,"meta"?: NonNullable<Json>,"mode"?: string,"ranked"?: boolean,"score"?: number,"started_at"?: string,"status"?: string,"total_rounds"?: number | null,"user_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "game_sessions_challenge_id_fkey"
      columns: ["challenge_id"]
isOneToOne: false
      referencedRelation: "daily_challenges"
      referencedColumns: ["id"]
    }
                  ]
                },"games": {
                  Row: {
                    "created_at": string,"description": string,"id": string,"is_demo": boolean,"name": string,"short_name": string,"slug": string,"sort_order": number,"status": Database["public"]['Enums']["content_status"],"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"description"?: string,"id"?: string,"is_demo"?: boolean,"name": string,"short_name": string,"slug": string,"sort_order"?: number,"status"?: Database["public"]['Enums']["content_status"],"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"description"?: string,"id"?: string,"is_demo"?: boolean,"name"?: string,"short_name"?: string,"slug"?: string,"sort_order"?: number,"status"?: Database["public"]['Enums']["content_status"],"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"garage_vehicles": {
                  Row: {
                    "added_at": string,"garage_id": string,"position": number,"vehicle_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "added_at"?: string,"garage_id": string,"position": number,"vehicle_id": string
                  }
                  Update: {
                    "added_at"?: string,"garage_id"?: string,"position"?: number,"vehicle_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "garage_vehicles_garage_id_fkey"
      columns: ["garage_id"]
isOneToOne: false
      referencedRelation: "garages"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "garage_vehicles_vehicle_id_fkey"
      columns: ["vehicle_id"]
isOneToOne: false
      referencedRelation: "vehicles"
      referencedColumns: ["id"]
    }
                  ]
                },"garages": {
                  Row: {
                    "created_at": string,"description": string,"hidden_at": string | null,"id": string,"name": string,"owner_id": string,"share_slug": string,"updated_at": string,"visibility": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"description"?: string,"hidden_at"?: string | null,"id"?: string,"name": string,"owner_id": string,"share_slug"?: string,"updated_at"?: string,"visibility"?: string
                  }
                  Update: {
                    "created_at"?: string,"description"?: string,"hidden_at"?: string | null,"id"?: string,"name"?: string,"owner_id"?: string,"share_slug"?: string,"updated_at"?: string,"visibility"?: string
                  }
                  Relationships: [
                    
                  ]
                },"geo_locations": {
                  Row: {
                    "created_at": string,"description": string,"difficulty": number,"id": string,"is_demo": boolean,"map_id": string,"name": string,"screenshot_id": string | null,"status": Database["public"]['Enums']["content_status"],"updated_at": string,"x": number,"y": number
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"description"?: string,"difficulty"?: number,"id"?: string,"is_demo"?: boolean,"map_id": string,"name": string,"screenshot_id"?: string | null,"status"?: Database["public"]['Enums']["content_status"],"updated_at"?: string,"x": number,"y": number
                  }
                  Update: {
                    "created_at"?: string,"description"?: string,"difficulty"?: number,"id"?: string,"is_demo"?: boolean,"map_id"?: string,"name"?: string,"screenshot_id"?: string | null,"status"?: Database["public"]['Enums']["content_status"],"updated_at"?: string,"x"?: number,"y"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "geo_locations_map_id_fkey"
      columns: ["map_id"]
isOneToOne: false
      referencedRelation: "game_maps"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "geo_locations_screenshot_id_fkey"
      columns: ["screenshot_id"]
isOneToOne: false
      referencedRelation: "media_assets"
      referencedColumns: ["id"]
    }
                  ]
                },"media_assets": {
                  Row: {
                    "alt_text": string,"author": string,"bucket": string,"bytes": number,"created_at": string,"created_by": string | null,"height": number,"id": string,"is_ai_generated": boolean,"is_demo": boolean,"license": string,"mime_type": string,"path": string,"source": string,"updated_at": string,"usage_justification": string,"validated_at": string | null,"validated_by": string | null,"validation_status": string,"width": number
                  }
                  ComputedFields: never
                  Insert: {
                    "alt_text"?: string,"author": string,"bucket": string,"bytes": number,"created_at"?: string,"created_by"?: string | null,"height": number,"id"?: string,"is_ai_generated"?: boolean,"is_demo"?: boolean,"license": string,"mime_type": string,"path": string,"source": string,"updated_at"?: string,"usage_justification"?: string,"validated_at"?: string | null,"validated_by"?: string | null,"validation_status"?: string,"width": number
                  }
                  Update: {
                    "alt_text"?: string,"author"?: string,"bucket"?: string,"bytes"?: number,"created_at"?: string,"created_by"?: string | null,"height"?: number,"id"?: string,"is_ai_generated"?: boolean,"is_demo"?: boolean,"license"?: string,"mime_type"?: string,"path"?: string,"source"?: string,"updated_at"?: string,"usage_justification"?: string,"validated_at"?: string | null,"validated_by"?: string | null,"validation_status"?: string,"width"?: number
                  }
                  Relationships: [
                    
                  ]
                },"messages": {
                  Row: {
                    "body": string,"conversation_id": string,"created_at": string,"hidden_at": string | null,"hidden_by": string | null,"id": number,"sender_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "body": string,"conversation_id": string,"created_at"?: string,"hidden_at"?: string | null,"hidden_by"?: string | null,"id"?: never,"sender_id": string
                  }
                  Update: {
                    "body"?: string,"conversation_id"?: string,"created_at"?: string,"hidden_at"?: string | null,"hidden_by"?: string | null,"id"?: never,"sender_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "messages_conversation_id_fkey"
      columns: ["conversation_id"]
isOneToOne: false
      referencedRelation: "conversations"
      referencedColumns: ["id"]
    }
                  ]
                },"moderation_actions": {
                  Row: {
                    "action": string,"created_at": string,"duration_hours": number | null,"id": string,"moderator_id": string | null,"reason": string,"report_id": string | null,"target_id": string | null,"target_type": string | null,"target_user_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "action": string,"created_at"?: string,"duration_hours"?: number | null,"id"?: string,"moderator_id"?: string | null,"reason": string,"report_id"?: string | null,"target_id"?: string | null,"target_type"?: string | null,"target_user_id"?: string | null
                  }
                  Update: {
                    "action"?: string,"created_at"?: string,"duration_hours"?: number | null,"id"?: string,"moderator_id"?: string | null,"reason"?: string,"report_id"?: string | null,"target_id"?: string | null,"target_type"?: string | null,"target_user_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "moderation_actions_report_id_fkey"
      columns: ["report_id"]
isOneToOne: false
      referencedRelation: "reports"
      referencedColumns: ["id"]
    }
                  ]
                },"mystery_puzzles": {
                  Row: {
                    "created_at": string,"hints": (string)[],"id": string,"is_demo": boolean,"reveal_path": string | null,"source_media_id": string | null,"stage_paths": (string)[],"status": Database["public"]['Enums']["content_status"],"updated_at": string,"vehicle_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"hints"?: (string)[],"id"?: string,"is_demo"?: boolean,"reveal_path"?: string | null,"source_media_id"?: string | null,"stage_paths"?: (string)[],"status"?: Database["public"]['Enums']["content_status"],"updated_at"?: string,"vehicle_id": string
                  }
                  Update: {
                    "created_at"?: string,"hints"?: (string)[],"id"?: string,"is_demo"?: boolean,"reveal_path"?: string | null,"source_media_id"?: string | null,"stage_paths"?: (string)[],"status"?: Database["public"]['Enums']["content_status"],"updated_at"?: string,"vehicle_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "mystery_puzzles_source_media_id_fkey"
      columns: ["source_media_id"]
isOneToOne: false
      referencedRelation: "media_assets"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "mystery_puzzles_vehicle_id_fkey"
      columns: ["vehicle_id"]
isOneToOne: false
      referencedRelation: "vehicles"
      referencedColumns: ["id"]
    }
                  ]
                },"notifications": {
                  Row: {
                    "created_at": string,"id": number,"kind": string,"payload": NonNullable<Json>,"read_at": string | null,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: never,"kind": string,"payload"?: NonNullable<Json>,"read_at"?: string | null,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: never,"kind"?: string,"payload"?: NonNullable<Json>,"read_at"?: string | null,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"platforms": {
                  Row: {
                    "created_at": string,"id": string,"is_demo": boolean,"name": string,"short_name": string,"slug": string,"sort_order": number,"status": Database["public"]['Enums']["content_status"],"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"is_demo"?: boolean,"name": string,"short_name": string,"slug": string,"sort_order"?: number,"status"?: Database["public"]['Enums']["content_status"],"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"is_demo"?: boolean,"name"?: string,"short_name"?: string,"slug"?: string,"sort_order"?: number,"status"?: Database["public"]['Enums']["content_status"],"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"profile_games": {
                  Row: {
                    "created_at": string,"game_platform_id": string,"profile_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"game_platform_id": string,"profile_id": string
                  }
                  Update: {
                    "created_at"?: string,"game_platform_id"?: string,"profile_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "profile_games_game_platform_id_fkey"
      columns: ["game_platform_id"]
isOneToOne: false
      referencedRelation: "game_platforms"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "profile_games_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"profile_handles": {
                  Row: {
                    "created_at": string,"handle": string,"id": string,"network": string,"profile_id": string,"visibility": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"handle": string,"id"?: string,"network": string,"profile_id": string,"visibility"?: string
                  }
                  Update: {
                    "created_at"?: string,"handle"?: string,"id"?: string,"network"?: string,"profile_id"?: string,"visibility"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "profile_handles_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"profile_private": {
                  Row: {
                    "age_confirmed_at": string,"created_at": string,"id": string,"terms_accepted_at": string,"terms_version": string
                  }
                  ComputedFields: never
                  Insert: {
                    "age_confirmed_at": string,"created_at"?: string,"id": string,"terms_accepted_at": string,"terms_version": string
                  }
                  Update: {
                    "age_confirmed_at"?: string,"created_at"?: string,"id"?: string,"terms_accepted_at"?: string,"terms_version"?: string
                  }
                  Relationships: [
                    
                  ]
                },"profiles": {
                  Row: {
                    "avatar_path": string | null,"bio": string,"created_at": string,"has_mic": boolean | null,"hidden_at": string | null,"hidden_reason": string | null,"id": string,"languages": (string)[],"last_seen_at": string | null,"play_days": (string)[],"play_slots": (string)[],"play_styles": (string)[],"show_badges": boolean,"show_results": boolean,"timezone": string,"updated_at": string,"username": string | null,"username_changed_at": string | null,"username_normalized": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "avatar_path"?: string | null,"bio"?: string,"created_at"?: string,"has_mic"?: boolean | null,"hidden_at"?: string | null,"hidden_reason"?: string | null,"id": string,"languages"?: (string)[],"last_seen_at"?: string | null,"play_days"?: (string)[],"play_slots"?: (string)[],"play_styles"?: (string)[],"show_badges"?: boolean,"show_results"?: boolean,"timezone"?: string,"updated_at"?: string,"username"?: string | null,"username_changed_at"?: string | null,"username_normalized"?: never
                  }
                  Update: {
                    "avatar_path"?: string | null,"bio"?: string,"created_at"?: string,"has_mic"?: boolean | null,"hidden_at"?: string | null,"hidden_reason"?: string | null,"id"?: string,"languages"?: (string)[],"last_seen_at"?: string | null,"play_days"?: (string)[],"play_slots"?: (string)[],"play_styles"?: (string)[],"show_badges"?: boolean,"show_results"?: boolean,"timezone"?: string,"updated_at"?: string,"username"?: string | null,"username_changed_at"?: string | null,"username_normalized"?: never
                  }
                  Relationships: [
                    
                  ]
                },"properties": {
                  Row: {
                    "created_at": string,"game_id": string,"game_price": number,"game_price_note": string,"game_price_type": string,"id": string,"image_id": string | null,"is_demo": boolean,"kind": string,"location_label": string,"name": string,"price_source": string,"price_verified_at": string,"slug": string,"status": Database["public"]['Enums']["content_status"],"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"game_id": string,"game_price": number,"game_price_note"?: string,"game_price_type": string,"id"?: string,"image_id"?: string | null,"is_demo"?: boolean,"kind": string,"location_label"?: string,"name": string,"price_source": string,"price_verified_at": string,"slug": string,"status"?: Database["public"]['Enums']["content_status"],"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"game_id"?: string,"game_price"?: number,"game_price_note"?: string,"game_price_type"?: string,"id"?: string,"image_id"?: string | null,"is_demo"?: boolean,"kind"?: string,"location_label"?: string,"name"?: string,"price_source"?: string,"price_verified_at"?: string,"slug"?: string,"status"?: Database["public"]['Enums']["content_status"],"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "properties_game_id_fkey"
      columns: ["game_id"]
isOneToOne: false
      referencedRelation: "games"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "properties_image_id_fkey"
      columns: ["image_id"]
isOneToOne: false
      referencedRelation: "media_assets"
      referencedColumns: ["id"]
    }
                  ]
                },"reality_items": {
                  Row: {
                    "answer": string,"created_at": string,"explanation": string,"game_id": string | null,"id": string,"is_demo": boolean,"media_id": string | null,"status": Database["public"]['Enums']["content_status"],"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "answer": string,"created_at"?: string,"explanation": string,"game_id"?: string | null,"id"?: string,"is_demo"?: boolean,"media_id"?: string | null,"status"?: Database["public"]['Enums']["content_status"],"updated_at"?: string
                  }
                  Update: {
                    "answer"?: string,"created_at"?: string,"explanation"?: string,"game_id"?: string | null,"id"?: string,"is_demo"?: boolean,"media_id"?: string | null,"status"?: Database["public"]['Enums']["content_status"],"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "reality_items_game_id_fkey"
      columns: ["game_id"]
isOneToOne: false
      referencedRelation: "games"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "reality_items_media_id_fkey"
      columns: ["media_id"]
isOneToOne: false
      referencedRelation: "media_assets"
      referencedColumns: ["id"]
    }
                  ]
                },"reports": {
                  Row: {
                    "created_at": string,"decision_note": string | null,"details": string,"handled_at": string | null,"handled_by": string | null,"id": string,"reason": string,"reporter_id": string | null,"snapshot": NonNullable<Json>,"status": string,"target_id": string,"target_type": string,"target_user_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"decision_note"?: string | null,"details"?: string,"handled_at"?: string | null,"handled_by"?: string | null,"id"?: string,"reason": string,"reporter_id"?: string | null,"snapshot"?: NonNullable<Json>,"status"?: string,"target_id": string,"target_type": string,"target_user_id"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"decision_note"?: string | null,"details"?: string,"handled_at"?: string | null,"handled_by"?: string | null,"id"?: string,"reason"?: string,"reporter_id"?: string | null,"snapshot"?: NonNullable<Json>,"status"?: string,"target_id"?: string,"target_type"?: string,"target_user_id"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"sanctions": {
                  Row: {
                    "created_at": string,"created_by": string | null,"ends_at": string | null,"id": string,"kind": string,"reason": string,"report_id": string | null,"revoke_reason": string | null,"revoked_at": string | null,"revoked_by": string | null,"starts_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"created_by"?: string | null,"ends_at"?: string | null,"id"?: string,"kind": string,"reason": string,"report_id"?: string | null,"revoke_reason"?: string | null,"revoked_at"?: string | null,"revoked_by"?: string | null,"starts_at"?: string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string | null,"ends_at"?: string | null,"id"?: string,"kind"?: string,"reason"?: string,"report_id"?: string | null,"revoke_reason"?: string | null,"revoked_at"?: string | null,"revoked_by"?: string | null,"starts_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"user_badges": {
                  Row: {
                    "awarded_at": string,"badge_slug": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "awarded_at"?: string,"badge_slug": string,"user_id": string
                  }
                  Update: {
                    "awarded_at"?: string,"badge_slug"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "user_badges_badge_slug_fkey"
      columns: ["badge_slug"]
isOneToOne: false
      referencedRelation: "badges"
      referencedColumns: ["slug"]
    }
                  ]
                },"user_roles": {
                  Row: {
                    "granted_at": string,"granted_by": string | null,"role": Database["public"]['Enums']["app_role"],"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "granted_at"?: string,"granted_by"?: string | null,"role"?: Database["public"]['Enums']["app_role"],"user_id": string
                  }
                  Update: {
                    "granted_at"?: string,"granted_by"?: string | null,"role"?: Database["public"]['Enums']["app_role"],"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"vehicles": {
                  Row: {
                    "category": string,"created_at": string,"game_id": string,"game_price": number | null,"game_price_note": string,"game_price_type": string | null,"garage_cost": number,"id": string,"image_id": string | null,"is_demo": boolean,"manufacturer": string,"name": string,"price_source": string | null,"price_verified_at": string | null,"slug": string,"status": Database["public"]['Enums']["content_status"],"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "category": string,"created_at"?: string,"game_id": string,"game_price"?: number | null,"game_price_note"?: string,"game_price_type"?: string | null,"garage_cost": number,"id"?: string,"image_id"?: string | null,"is_demo"?: boolean,"manufacturer"?: string,"name": string,"price_source"?: string | null,"price_verified_at"?: string | null,"slug": string,"status"?: Database["public"]['Enums']["content_status"],"updated_at"?: string
                  }
                  Update: {
                    "category"?: string,"created_at"?: string,"game_id"?: string,"game_price"?: number | null,"game_price_note"?: string,"game_price_type"?: string | null,"garage_cost"?: number,"id"?: string,"image_id"?: string | null,"is_demo"?: boolean,"manufacturer"?: string,"name"?: string,"price_source"?: string | null,"price_verified_at"?: string | null,"slug"?: string,"status"?: Database["public"]['Enums']["content_status"],"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "vehicles_game_id_fkey"
      columns: ["game_id"]
isOneToOne: false
      referencedRelation: "games"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "vehicles_image_id_fkey"
      columns: ["image_id"]
isOneToOne: false
      referencedRelation: "media_assets"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "admin_set_role":
{ Args: { "p_reason": string,"p_role": Database["public"]['Enums']["app_role"],"p_user": string }; Returns: undefined
                           },
"block_user":
{ Args: { "p_user": string }; Returns: undefined
                           },
"consume_rate_limit":
{ Args: { "p_bucket": string,"p_max": number,"p_window_seconds": number }; Returns: boolean
                           },
"demo_content_report":
{ Args: Record<PropertyKey, never>; Returns: {
              "demo_rows": number,"table_name": string
            }[]
                           },
"game_commit_answer":
{ Args: { "p_answer": Json,"p_expected_attempts": number,"p_next_round"?: Json,"p_position": number,"p_result": Json,"p_round_complete": boolean,"p_round_score": number,"p_session": string,"p_session_complete": boolean,"p_share_text"?: string }; Returns: Json
                           },
"leaderboard_daily":
{ Args: { "p_date": string,"p_limit"?: number }; Returns: {
              "avatar_path": string,"duration_ms": number,"max_score": number,"rank": number,"score": number,"user_id": string,"username": string
            }[]
                           },
"leaderboard_period":
{ Args: { "p_from": string,"p_limit"?: number,"p_to": string }; Returns: {
              "avatar_path": string,"best_points": number,"participations": number,"rank": number,"total_points": number,"user_id": string,"username": string
            }[]
                           },
"mark_conversation_read":
{ Args: { "p_conversation": string }; Returns: undefined
                           },
"mod_close_report":
{ Args: { "p_decision": string,"p_note": string,"p_report": string }; Returns: undefined
                           },
"mod_get_report":
{ Args: { "p_report": string }; Returns: Json
                           },
"mod_hide_message":
{ Args: { "p_message": number,"p_reason": string,"p_report": string }; Returns: undefined
                           },
"mod_list_reports":
{ Args: { "p_limit"?: number,"p_offset"?: number,"p_status"?: string }; Returns: {
              "created_at": string,"id": string,"reason": string,"reporter_count": number,"status": string,"target_id": string,"target_type": string,"target_user_id": string,"target_username": string
            }[]
                           },
"mod_revoke_sanction":
{ Args: { "p_reason": string,"p_sanction": string }; Returns: undefined
                           },
"mod_sanction_user":
{ Args: { "p_duration_hours"?: number,"p_kind": string,"p_reason": string,"p_report"?: string,"p_user": string }; Returns: string
                           },
"mod_search_users":
{ Args: { "p_limit"?: number,"p_query": string }; Returns: {
              "created_at": string,"hidden": boolean,"id": string,"last_seen_at": string,"role": Database["public"]['Enums']["app_role"],"sanctioned": boolean,"username": string
            }[]
                           },
"mod_set_garage_hidden":
{ Args: { "p_garage": string,"p_hidden": boolean,"p_reason": string,"p_report"?: string }; Returns: undefined
                           },
"mod_set_profile_hidden":
{ Args: { "p_hidden": boolean,"p_reason": string,"p_user": string }; Returns: undefined
                           },
"mod_user_detail":
{ Args: { "p_user": string }; Returns: Json
                           },
"my_conversations":
{ Args: { "p_limit"?: number,"p_offset"?: number }; Returns: {
              "blocked": boolean,"conversation_id": string,"last_message_at": string,"last_message_mine": boolean,"last_message_preview": string,"other_avatar_path": string,"other_user_id": string,"other_username": string,"unread": boolean
            }[]
                           },
"my_daily_rank":
{ Args: { "p_date": string }; Returns: {
              "max_score": number,"participants": number,"rank": number,"score": number
            }[]
                           },
"public_player_stats":
{ Args: { "p_user": string }; Returns: {
              "best_score": number,"daily_played": number,"game_kind": string,"games_played": number
            }[]
                           },
"report_content":
{ Args: { "p_details"?: string,"p_reason": string,"p_target_id": string,"p_target_type": string }; Returns: string
                           },
"respond_contact_request":
{ Args: { "p_accept": boolean,"p_request": string }; Returns: string
                           },
"save_garage":
{ Args: { "p_description": string,"p_garage": string,"p_name": string,"p_vehicle_ids": (string)[],"p_visibility": string }; Returns: string
                           },
"send_contact_request":
{ Args: { "p_message"?: string,"p_recipient": string }; Returns: string
                           },
"send_message":
{ Args: { "p_body": string,"p_conversation": string }; Returns: number
                           },
"unblock_user":
{ Args: { "p_user": string }; Returns: undefined
                           },
"unread_counts":
{ Args: Record<PropertyKey, never>; Returns: {
              "messages": number,"notifications": number,"requests": number
            }[]
                           },
"withdraw_contact_request":
{ Args: { "p_request": string }; Returns: undefined
                           },
"write_audit":
{ Args: { "p_action": string,"p_actor": string,"p_metadata"?: Json,"p_target_id": string,"p_target_type": string }; Returns: undefined
                           }
          }
          Enums: {
            "app_role": "user"|"moderator"|"admin","content_status": "draft"|"published"|"archived"
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
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            "app_role": ["user", "moderator", "admin"],"content_status": ["draft", "published", "archived"]
          }
        }
} as const
