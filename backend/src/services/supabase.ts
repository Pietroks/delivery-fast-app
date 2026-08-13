import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import ws from "ws";

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_KEY || "";

if (!supabaseUrl || !supabaseKey) {
  throw new Error("⚠️ SUPABASE_URL ou SUPABASE_KEY não foram encontradas no arquivo .env");
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
  },
  global: {
    fetch: fetch,
  },
  realtime: {
    transport: ws as any,
  },
});
