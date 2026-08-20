import { z } from "zod";

export const otimizarRotaSchema = z.object({
  latUsuario: z.number().optional(),
  lonUsuario: z.number().optional(),
});

export const criarEntregaSchema = z.object({
  rua: z.string().min(2, "Endereço ou rua é obrigatório."),
  endereco: z.string().optional(),
  numero: z.string().optional(),
  bairro: z.string().optional(),
  cidade: z.string().optional(),
  referencia: z.string().optional(),
  nomeDestinatario: z.string().min(2, "Nome é obrigatório."),
  telefone: z.string().optional(),
  lat: z.number().optional(),
  lon: z.number().optional(),
  adicionarARotaAtual: z.boolean().default(true),
});
