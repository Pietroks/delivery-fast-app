import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import ws from "ws";

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || "https://placeholder-project.supabase.co";
const supabaseKey = process.env.SUPABASE_KEY || "placeholder-anon-key";

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
  console.warn("⚠️ AVISO: SUPABASE_URL ou SUPABASE_KEY não foram encontradas no arquivo .env. Configure seu .env para persistir dados.");
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
