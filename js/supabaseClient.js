// ReguTrack Supabase client configuration.
// The publishable key is intended for browser use. Never place a secret/service_role key here.
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.119.0/+esm";

export const SUPABASE_URL = "https://nngbqxusmdqmfuftauov.supabase.co";
export const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_kW7y_-Xr2sUtYnTcd2wjeQ_OA88nfqi";

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});
