-- ==============================================================================
-- DELIVERY FAST - SCHEMA DE BANCO DE DADOS (SUPABASE / POSTGRESQL)
-- ==============================================================================
-- Instruções: Execute este script no SQL Editor do painel do seu projeto Supabase.

-- 1. Criação da Tabela de Entregas
CREATE TABLE IF NOT EXISTS public.entregas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entregador_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ordem INTEGER NOT NULL DEFAULT 1,
  rua TEXT NOT NULL,
  bairro TEXT DEFAULT '',
  horario_estimado TEXT DEFAULT '',
  lat DOUBLE PRECISION DEFAULT 0,
  lon DOUBLE PRECISION DEFAULT 0,
  status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente', 'entregue', 'ausente', 'nao_localizado', 'recusado')),
  nome_destinatario TEXT DEFAULT '',
  telefone TEXT DEFAULT '',
  referencia TEXT DEFAULT '',
  documento_recebedor TEXT,
  foto_comprovante TEXT,
  assinatura_digital TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. Índices para Otimização de Consultas Frequentes
CREATE INDEX IF NOT EXISTS idx_entregas_entregador_status 
  ON public.entregas (entregador_id, status);

CREATE INDEX IF NOT EXISTS idx_entregas_entregador_ordem 
  ON public.entregas (entregador_id, ordem ASC);

CREATE INDEX IF NOT EXISTS idx_entregas_entregador_updated_at 
  ON public.entregas (entregador_id, updated_at DESC);

-- 3. Função e Trigger para Atualização Automática de 'updated_at'
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_atualizar_updated_at ON public.entregas;
CREATE TRIGGER trigger_atualizar_updated_at
  BEFORE UPDATE ON public.entregas
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- 4. Habilitação de Segurança por Nível de Linha (RLS - Row Level Security)
ALTER TABLE public.entregas ENABLE ROW LEVEL SECURITY;

-- Limpeza de políticas permissivas legadas (evita alertas de segurança)
DROP POLICY IF EXISTS "Permitir atualizacao anonima" ON public.entregas;
DROP POLICY IF EXISTS "Permitir delecao anonima" ON public.entregas;
DROP POLICY IF EXISTS "Permitir insercao anonima" ON public.entregas;
DROP POLICY IF EXISTS "Permitir leitura anonima" ON public.entregas;

-- 5. Políticas de Acesso Isolado por Entregador (Multi-Tenancy Seguro)
DROP POLICY IF EXISTS "Entregador pode ler suas próprias entregas" ON public.entregas;
CREATE POLICY "Entregador pode ler suas próprias entregas"
  ON public.entregas FOR SELECT
  TO authenticated
  USING (auth.uid() = entregador_id);

DROP POLICY IF EXISTS "Entregador pode criar suas próprias entregas" ON public.entregas;
CREATE POLICY "Entregador pode criar suas próprias entregas"
  ON public.entregas FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = entregador_id);

DROP POLICY IF EXISTS "Entregador pode atualizar suas próprias entregas" ON public.entregas;
CREATE POLICY "Entregador pode atualizar suas próprias entregas"
  ON public.entregas FOR UPDATE
  TO authenticated
  USING (auth.uid() = entregador_id);

DROP POLICY IF EXISTS "Entregador pode deletar suas próprias entregas" ON public.entregas;
CREATE POLICY "Entregador pode deletar suas próprias entregas"
  ON public.entregas FOR DELETE
  TO authenticated
  USING (auth.uid() = entregador_id);
