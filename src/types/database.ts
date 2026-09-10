export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      executives: {
        Row: {
          id: string;
          name: string;
          code: string;
          phone: string;
          email: string | null;
          assigned_area: string | null;
          status: "active" | "inactive";
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          code: string;
          phone: string;
          email?: string | null;
          assigned_area?: string | null;
          status?: "active" | "inactive";
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          code?: string;
          phone?: string;
          email?: string | null;
          assigned_area?: string | null;
          status?: "active" | "inactive";
          created_at?: string;
        };
      };
      shops: {
        Row: {
          id: string;
          shop_name: string;
          shop_code: string;
          address: string | null;
          phone: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          shop_name: string;
          shop_code: string;
          address?: string | null;
          phone?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          shop_name?: string;
          shop_code?: string;
          address?: string | null;
          phone?: string | null;
          created_at?: string;
        };
      };
      shop_mappings: {
        Row: {
          id: string;
          shop_id: string;
          executive_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          shop_id: string;
          executive_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          shop_id?: string;
          executive_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      upload_batches: {
        Row: {
          id: string;
          file_name: string;
          file_size: string | null;
          total_rows: number;
          successful_rows: number;
          failed_rows: number;
          unmapped_shops_count: number;
          status: "completed" | "processing" | "failed";
          uploaded_at: string;
        };
        Insert: {
          id?: string;
          file_name: string;
          file_size?: string | null;
          total_rows?: number;
          successful_rows?: number;
          failed_rows?: number;
          unmapped_shops_count?: number;
          status?: "completed" | "processing" | "failed";
          uploaded_at?: string;
        };
        Update: {
          id?: string;
          file_name?: string;
          file_size?: string | null;
          total_rows?: number;
          successful_rows?: number;
          failed_rows?: number;
          unmapped_shops_count?: number;
          status?: "completed" | "processing" | "failed";
          uploaded_at?: string;
        };
      };
      collections: {
        Row: {
          id: string;
          receipt_number: string | null;
          collection_date: string;
          shop_id: string | null;
          shop_name: string;
          executive_id: string | null;
          executive_name: string;
          amount: number;
          payment_mode: string | null;
          upload_batch_id: string | null;
          upload_batch_name: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          receipt_number?: string | null;
          collection_date: string;
          shop_id?: string | null;
          shop_name: string;
          executive_id?: string | null;
          executive_name: string;
          amount: number;
          payment_mode?: string | null;
          upload_batch_id?: string | null;
          upload_batch_name?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          receipt_number?: string | null;
          collection_date?: string;
          shop_id?: string | null;
          shop_name?: string;
          executive_id?: string | null;
          executive_name?: string;
          amount?: number;
          payment_mode?: string | null;
          upload_batch_id?: string | null;
          upload_batch_name?: string | null;
          created_at?: string;
        };
      };
      unmapped_shops: {
        Row: {
          id: string;
          detected_shop_name: string;
          detected_shop_code: string | null;
          detected_row_number: number | null;
          amount: number;
          collection_date: string | null;
          upload_batch_id: string | null;
          upload_batch_name: string | null;
          status: "unmapped" | "resolved";
          created_at: string;
        };
        Insert: {
          id?: string;
          detected_shop_name: string;
          detected_shop_code?: string | null;
          detected_row_number?: number | null;
          amount?: number;
          collection_date?: string | null;
          upload_batch_id?: string | null;
          upload_batch_name?: string | null;
          status?: "unmapped" | "resolved";
          created_at?: string;
        };
        Update: {
          id?: string;
          detected_shop_name?: string;
          detected_shop_code?: string | null;
          detected_row_number?: number | null;
          amount?: number;
          collection_date?: string | null;
          upload_batch_id?: string | null;
          upload_batch_name?: string | null;
          status?: "unmapped" | "resolved";
          created_at?: string;
        };
      };
    };
  };
}
