import { z } from "zod";

export const otimizarRotaSchema = z.object({
  latUsuario: z.number().optional(),
  lonUsuario: z.number().optional(),
});

export type OtimizarRotaInput = z.infer<typeof otimizarRotaSchema>;

export const criarEntregaSchema = z.object({
  rua: z.string().min(2, "Endereço ou rua é obrigatório."),
  endereco: z.string().optional(),
  numero: z.string().optional(),
  bairro: z.string().optional(),
  cidade: z.string().optional(),
  cep: z.string().optional(),
  referencia: z.string().optional(),
  nomeDestinatario: z.string().optional(),
  telefone: z.string().optional(),
  latUsuario: z.number().optional(),
  lonUsuario: z.number().optional(),
  adicionarARotaAtual: z.boolean().default(true),
});

export type CriarEntregaInput = z.infer<typeof criarEntregaSchema>;

export const itemLoteSchema = z.object({
  rua: z.string().min(2, "Endereço ou rua é obrigatório."),
  numero: z.string().optional(),
  bairro: z.string().optional(),
  cidade: z.string().optional(),
  cep: z.string().optional(),
  referencia: z.string().optional(),
  nomeDestinatario: z.string().optional(),
  telefone: z.string().optional(),
});

export const importarLoteSchema = z.object({
  entregas: z.array(itemLoteSchema).min(1, "Envie pelo menos 1 entrega no lote."),
});

export type ImportarLoteInput = z.infer<typeof importarLoteSchema>;

export const statusEntregaEnum = z.enum(["pendente", "entregue", "ausente", "nao_localizado", "recusado"]);
export type StatusEntrega = z.infer<typeof statusEntregaEnum>;

export const atualizarStatusSchema = z.object({
  status: statusEntregaEnum,
  motivoInsucesso: z.string().optional(),
  recebidoPor: z.string().optional(),
});

export type AtualizarStatusInput = z.infer<typeof atualizarStatusSchema>;
