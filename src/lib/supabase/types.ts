export type Database = {
  public: {
    Tables: {
      projects: {
        Row: {
          id: string;
          user_id: string;
          app_id: string;
          name: string;
          data: Record<string, unknown>;
          share_token: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          app_id?: string;
          name: string;
          data: Record<string, unknown>;
          share_token?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["projects"]["Insert"]>;
      };
      user_profiles: {
        Row: {
          user_id: string;
          app_id: string;
          gemini_api_key: string | null;
          created_at: string;
        };
        Insert: {
          user_id: string;
          app_id?: string;
          gemini_api_key?: string | null;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["user_profiles"]["Insert"]
        >;
      };
    };
  };
};
