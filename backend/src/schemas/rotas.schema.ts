import { z } from "zod";

export const otimizarRotaSchema = z.object({
  enderecos: z
    .array(z.string().min(3, "O endereço deve ter pelo menos 3 caracteres."))
    .min(2, "Informe pelo menos 2 endereços para otimizar a rota."),
});

export const criarEntregaSchema = z.object({
  endereco: z.string().min(3, "Endereço inválido."),
  numero: z.string().optional(),
  referencia: z.string().optional(),
  nomeDestinatario: z.string().min(2, "Nome é obrigatório."),
  telefone: z.string().optional(),
  adicionarARotaAtual: z.boolean().default(true),
});
