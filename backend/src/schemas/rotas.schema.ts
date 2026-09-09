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
