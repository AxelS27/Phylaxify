export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string;
          webhook_token: string;
          overlay_token: string;
          filter_enabled: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          username: string;
          webhook_token?: string;
          overlay_token?: string;
          filter_enabled?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          username?: string;
          webhook_token?: string;
          overlay_token?: string;
          filter_enabled?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      donations: {
        Row: {
          id: number;
          user_id: string;
          provider: string;
          donation_id: string | null;
          donator_name: string;
          amount: number;
          message: string | null;
          blocked: boolean;
          filter_reason: string | null;
          filter_layer: string | null;
          confidence: number | null;
          manually_approved: boolean;
          created_at: string;
        };
        Insert: {
          id?: number;
          user_id: string;
          provider: string;
          donation_id?: string | null;
          donator_name: string;
          amount: number;
          message?: string | null;
          blocked?: boolean;
          filter_reason?: string | null;
          filter_layer?: string | null;
          confidence?: number | null;
          manually_approved?: boolean;
          created_at?: string;
        };
        Update: {
          blocked?: boolean;
          manually_approved?: boolean;
        };
      };
      blocklist: {
        Row: {
          id: number;
          user_id: string;
          word: string;
          category: string;
          created_at: string;
        };
        Insert: {
          id?: number;
          user_id: string;
          word: string;
          category?: string;
          created_at?: string;
        };
        Update: {
          word?: string;
          category?: string;
        };
      };
    };
  };
};
