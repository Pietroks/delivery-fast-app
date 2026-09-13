import { FastifyRequest, FastifyReply } from "fastify";
import { supabase } from "../services/supabase";

export async function verificarToken(request: FastifyRequest, reply: FastifyReply) {
  if (process.env.NODE_ENV === "test") {
    (request as any).userId = "entregador-teste-123";
    return;
  }

  const authHeader = request.headers.authorization;
  if (!authHeader) {
    return reply.status(401).send({ sucesso: false, erro: "Acesso negado. Token não fornecido." });
  }

  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) {
    return reply.status(401).send({ sucesso: false, erro: "Acesso negado. Token não fornecido." });
  }

  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user) {
    return reply.status(401).send({ sucesso: false, erro: "Sessão inválida ou expirada. Faça login novamente." });
  }

  (request as any).userId = data.user.id;
}
