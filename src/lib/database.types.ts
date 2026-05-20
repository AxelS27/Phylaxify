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
          plan: 'free' | 'premium';
          plan_expires_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          username: string;
          webhook_token?: string;
          overlay_token?: string;
          filter_enabled?: boolean;
          plan?: 'free' | 'premium';
          plan_expires_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          username?: string;
          webhook_token?: string;
          overlay_token?: string;
          filter_enabled?: boolean;
          plan?: 'free' | 'premium';
          plan_expires_at?: string | null;
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
      subscriptions: {
        Row: {
          id: number;
          user_id: string;
          order_id: string;
          status: 'pending' | 'paid' | 'expired' | 'cancel' | 'deny';
          amount: number;
          snap_token: string | null;
          created_at: string;
          paid_at: string | null;
          expires_at: string | null;
        };
        Insert: {
          id?: number;
          user_id: string;
          order_id: string;
          status?: string;
          amount: number;
          snap_token?: string | null;
          created_at?: string;
          paid_at?: string | null;
          expires_at?: string | null;
        };
        Update: {
          status?: string;
          snap_token?: string | null;
          paid_at?: string | null;
          expires_at?: string | null;
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
