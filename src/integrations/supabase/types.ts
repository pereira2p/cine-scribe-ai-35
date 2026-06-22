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
      collection_movies: {
        Row: {
          added_at: string
          collection_id: string
          movie_id: string
          user_id: string
        }
        Insert: {
          added_at?: string
          collection_id: string
          movie_id: string
          user_id: string
        }
        Update: {
          added_at?: string
          collection_id?: string
          movie_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "collection_movies_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collection_movies_movie_id_fkey"
            columns: ["movie_id"]
            isOneToOne: false
            referencedRelation: "movies"
            referencedColumns: ["id"]
          },
        ]
      }
      collections: {
        Row: {
          backdrop_path: string | null
          created_at: string
          description: string | null
          id: string
          is_smart: boolean
          name: string
          poster_path: string | null
          smart_rule: Json | null
          tmdb_collection_id: number | null
          user_id: string
        }
        Insert: {
          backdrop_path?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_smart?: boolean
          name: string
          poster_path?: string | null
          smart_rule?: Json | null
          tmdb_collection_id?: number | null
          user_id: string
        }
        Update: {
          backdrop_path?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_smart?: boolean
          name?: string
          poster_path?: string | null
          smart_rule?: Json | null
          tmdb_collection_id?: number | null
          user_id?: string
        }
        Relationships: []
      }
      favorites: {
        Row: {
          created_at: string
          movie_id: string
          user_id: string
          viewer_profile_id: string
        }
        Insert: {
          created_at?: string
          movie_id: string
          user_id: string
          viewer_profile_id: string
        }
        Update: {
          created_at?: string
          movie_id?: string
          user_id?: string
          viewer_profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_movie_id_fkey"
            columns: ["movie_id"]
            isOneToOne: false
            referencedRelation: "movies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorites_viewer_profile_id_fkey"
            columns: ["viewer_profile_id"]
            isOneToOne: false
            referencedRelation: "viewer_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      genres: {
        Row: {
          id: number
          name: string
        }
        Insert: {
          id: number
          name: string
        }
        Update: {
          id?: number
          name?: string
        }
        Relationships: []
      }
      movie_credits: {
        Row: {
          character_name: string | null
          id: string
          job: string | null
          movie_id: string
          ord: number | null
          person_id: number
          role: Database["public"]["Enums"]["credit_role"]
          user_id: string
        }
        Insert: {
          character_name?: string | null
          id?: string
          job?: string | null
          movie_id: string
          ord?: number | null
          person_id: number
          role: Database["public"]["Enums"]["credit_role"]
          user_id: string
        }
        Update: {
          character_name?: string | null
          id?: string
          job?: string | null
          movie_id?: string
          ord?: number | null
          person_id?: number
          role?: Database["public"]["Enums"]["credit_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "movie_credits_movie_id_fkey"
            columns: ["movie_id"]
            isOneToOne: false
            referencedRelation: "movies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movie_credits_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      movie_genres: {
        Row: {
          genre_id: number
          movie_id: string
          user_id: string
        }
        Insert: {
          genre_id: number
          movie_id: string
          user_id: string
        }
        Update: {
          genre_id?: number
          movie_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "movie_genres_genre_id_fkey"
            columns: ["genre_id"]
            isOneToOne: false
            referencedRelation: "genres"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movie_genres_movie_id_fkey"
            columns: ["movie_id"]
            isOneToOne: false
            referencedRelation: "movies"
            referencedColumns: ["id"]
          },
        ]
      }
      movies: {
        Row: {
          added_at: string
          audio_codec: string | null
          backdrop_path: string | null
          file_hash: string | null
          file_size_bytes: number | null
          id: string
          imdb_id: string | null
          is_archived: boolean
          origin_country: string | null
          original_language: string | null
          original_title: string | null
          overview: string | null
          popularity: number | null
          poster_path: string | null
          release_date: string | null
          release_year: number | null
          resolution: string | null
          runtime_minutes: number | null
          status: string | null
          storage_key: string | null
          storage_provider: Database["public"]["Enums"]["storage_provider"]
          tagline: string | null
          title: string
          tmdb_id: number | null
          trailer_key: string | null
          updated_at: string
          user_id: string
          video_codec: string | null
          vote_average: number | null
          vote_count: number | null
        }
        Insert: {
          added_at?: string
          audio_codec?: string | null
          backdrop_path?: string | null
          file_hash?: string | null
          file_size_bytes?: number | null
          id?: string
          imdb_id?: string | null
          is_archived?: boolean
          origin_country?: string | null
          original_language?: string | null
          original_title?: string | null
          overview?: string | null
          popularity?: number | null
          poster_path?: string | null
          release_date?: string | null
          release_year?: number | null
          resolution?: string | null
          runtime_minutes?: number | null
          status?: string | null
          storage_key?: string | null
          storage_provider?: Database["public"]["Enums"]["storage_provider"]
          tagline?: string | null
          title: string
          tmdb_id?: number | null
          trailer_key?: string | null
          updated_at?: string
          user_id: string
          video_codec?: string | null
          vote_average?: number | null
          vote_count?: number | null
        }
        Update: {
          added_at?: string
          audio_codec?: string | null
          backdrop_path?: string | null
          file_hash?: string | null
          file_size_bytes?: number | null
          id?: string
          imdb_id?: string | null
          is_archived?: boolean
          origin_country?: string | null
          original_language?: string | null
          original_title?: string | null
          overview?: string | null
          popularity?: number | null
          poster_path?: string | null
          release_date?: string | null
          release_year?: number | null
          resolution?: string | null
          runtime_minutes?: number | null
          status?: string | null
          storage_key?: string | null
          storage_provider?: Database["public"]["Enums"]["storage_provider"]
          tagline?: string | null
          title?: string
          tmdb_id?: number | null
          trailer_key?: string | null
          updated_at?: string
          user_id?: string
          video_codec?: string | null
          vote_average?: number | null
          vote_count?: number | null
        }
        Relationships: []
      }
      people: {
        Row: {
          id: number
          name: string
          profile_path: string | null
        }
        Insert: {
          id: number
          name: string
          profile_path?: string | null
        }
        Update: {
          id?: number
          name?: string
          profile_path?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
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
          role?: Database["public"]["Enums"]["app_role"]
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
      user_settings: {
        Row: {
          autoplay_next: boolean
          default_playback_speed: number
          default_quality: string
          default_subtitle: string | null
          language: string
          theme: string
          updated_at: string
          user_id: string
        }
        Insert: {
          autoplay_next?: boolean
          default_playback_speed?: number
          default_quality?: string
          default_subtitle?: string | null
          language?: string
          theme?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          autoplay_next?: boolean
          default_playback_speed?: number
          default_quality?: string
          default_subtitle?: string | null
          language?: string
          theme?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      viewer_profiles: {
        Row: {
          avatar_color: string
          created_at: string
          id: string
          is_default: boolean
          is_kids: boolean
          name: string
          user_id: string
        }
        Insert: {
          avatar_color?: string
          created_at?: string
          id?: string
          is_default?: boolean
          is_kids?: boolean
          name: string
          user_id: string
        }
        Update: {
          avatar_color?: string
          created_at?: string
          id?: string
          is_default?: boolean
          is_kids?: boolean
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      watch_history: {
        Row: {
          completed: boolean
          device: string | null
          duration_seconds: number | null
          id: string
          last_position_seconds: number
          movie_id: string
          user_id: string
          viewer_profile_id: string | null
          watched_at: string
        }
        Insert: {
          completed?: boolean
          device?: string | null
          duration_seconds?: number | null
          id?: string
          last_position_seconds?: number
          movie_id: string
          user_id: string
          viewer_profile_id?: string | null
          watched_at?: string
        }
        Update: {
          completed?: boolean
          device?: string | null
          duration_seconds?: number | null
          id?: string
          last_position_seconds?: number
          movie_id?: string
          user_id?: string
          viewer_profile_id?: string | null
          watched_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "watch_history_movie_id_fkey"
            columns: ["movie_id"]
            isOneToOne: false
            referencedRelation: "movies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "watch_history_viewer_profile_id_fkey"
            columns: ["viewer_profile_id"]
            isOneToOne: false
            referencedRelation: "viewer_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      watchlist_movies: {
        Row: {
          added_at: string
          movie_id: string
          user_id: string
          watchlist_id: string
        }
        Insert: {
          added_at?: string
          movie_id: string
          user_id: string
          watchlist_id: string
        }
        Update: {
          added_at?: string
          movie_id?: string
          user_id?: string
          watchlist_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "watchlist_movies_movie_id_fkey"
            columns: ["movie_id"]
            isOneToOne: false
            referencedRelation: "movies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "watchlist_movies_watchlist_id_fkey"
            columns: ["watchlist_id"]
            isOneToOne: false
            referencedRelation: "watchlists"
            referencedColumns: ["id"]
          },
        ]
      }
      watchlists: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_default: boolean
          name: string
          user_id: string
          viewer_profile_id: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_default?: boolean
          name: string
          user_id: string
          viewer_profile_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_default?: boolean
          name?: string
          user_id?: string
          viewer_profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "watchlists_viewer_profile_id_fkey"
            columns: ["viewer_profile_id"]
            isOneToOne: false
            referencedRelation: "viewer_profiles"
            referencedColumns: ["id"]
          },
        ]
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
      app_role: "admin" | "user"
      credit_role: "cast" | "director" | "writer" | "producer"
      storage_provider: "tmdb_only" | "r2" | "gdrive" | "onedrive" | "local"
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
      app_role: ["admin", "user"],
      credit_role: ["cast", "director", "writer", "producer"],
      storage_provider: ["tmdb_only", "r2", "gdrive", "onedrive", "local"],
    },
  },
} as const
