import { createClient, SupabaseClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";
import ws from "ws";

// Garante carregamento do .env tanto da pasta backend quanto da raiz
dotenv.config({ path: path.resolve(__dirname, "../../.env") });
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

/**
 * Cria ou retorna uma instância do Supabase com o token do usuário autenticado no header.
 * Isso permite que as regras de RLS (Row Level Security) identifiquem auth.uid() corretamente.
 */
export function obterSupabaseClient(token?: string): SupabaseClient {
  if (token && process.env.NODE_ENV !== "test") {
    const cleanToken = token.replace(/^Bearer\s+/i, "").trim();
    return createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
      },
      global: {
        fetch: fetch,
        headers: {
          Authorization: `Bearer ${cleanToken}`,
        },
      },
      realtime: {
        transport: ws as any,
      },
    });
  }
  return supabase;
}
