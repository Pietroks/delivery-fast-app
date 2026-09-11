import { describe, it, expect, vi, beforeEach } from "vitest";
import { verificarToken } from "../auth.middleware";
import { supabase } from "../../services/supabase";
import { FastifyRequest, FastifyReply } from "fastify";

vi.mock("../../services/supabase", () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
    },
  },
}));

describe("Middleware: verificarToken", () => {
  let mockRequest: Partial<FastifyRequest>;
  let mockReply: Partial<FastifyReply>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockRequest = {
      headers: {},
    };

    mockReply = {
      status: vi.fn().mockReturnThis() as any,
      send: vi.fn() as any,
    };
  });

  it("Deve bypassar a verificação em ambiente de teste e injetar o ID falso", async () => {
    // O Vitest roda com NODE_ENV = "test" por padrão
    await verificarToken(mockRequest as FastifyRequest, mockReply as FastifyReply);

    expect((mockRequest as any).userId).toBe("entregador-teste-123");
    expect(mockReply.send).not.toHaveBeenCalled();
  });

  it("Deve rejeitar a requisição se o cabeçalho Authorization não for enviado em produção", async () => {
    process.env.NODE_ENV = "production";

    await verificarToken(mockRequest as FastifyRequest, mockReply as FastifyReply);

    expect(mockReply.status).toHaveBeenCalledWith(401);
    expect(mockReply.send).toHaveBeenCalledWith({ sucesso: false, erro: "Acesso negado. Token não fornecido." });

    process.env.NODE_ENV = "test"; // Restaura o ambiente
  });

  it("Deve rejeitar a requisição se o token for inválido no Supabase", async () => {
    process.env.NODE_ENV = "production";
    mockRequest.headers = { authorization: "Bearer token-invalido-123" };

    (supabase.auth.getUser as any).mockResolvedValueOnce({
      error: { message: "Invalid token" },
      data: {},
    });

    await verificarToken(mockRequest as FastifyRequest, mockReply as FastifyReply);

    expect(mockReply.status).toHaveBeenCalledWith(401);
    expect(mockReply.send).toHaveBeenCalledWith({ sucesso: false, erro: "Sessão inválida ou expirada. Faça login novamente." });

    process.env.NODE_ENV = "test";
  });

  it("Deve injetar o userId real na requisição se o token for válido", async () => {
    process.env.NODE_ENV = "production";
    mockRequest.headers = { authorization: "Bearer token-real-e-valido" };

    (supabase.auth.getUser as any).mockResolvedValueOnce({
      error: null,
      data: { user: { id: "entregador-real-xyz" } },
    });

    await verificarToken(mockRequest as FastifyRequest, mockReply as FastifyReply);

    expect((mockRequest as any).userId).toBe("entregador-real-xyz");
    expect(mockReply.send).not.toHaveBeenCalled();

    process.env.NODE_ENV = "test";
  });
});
