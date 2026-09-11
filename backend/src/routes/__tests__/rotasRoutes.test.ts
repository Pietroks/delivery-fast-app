import { describe, it, expect, beforeEach, vi } from "vitest";
import Fastify from "fastify";
import axios from "axios";
import { rotasRoutes } from "../rotas.routes";

vi.mock("axios");
const mockedAxios = vi.mocked(axios, true);

const mockSingle = vi.fn();
const mockSelect = vi.fn();
const mockInsert = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();
const mockOr = vi.fn();
const mockEq = vi.fn();
const mockGte = vi.fn();
const mockOrder = vi.fn();
const mockIn = vi.fn();

const mockQueryBuilder = {
  select: mockSelect,
  insert: mockInsert,
  update: mockUpdate,
  delete: mockDelete,
  or: mockOr,
  eq: mockEq,
  gte: mockGte,
  order: mockOrder,
  single: mockSingle,
  in: mockIn,
};

mockSelect.mockReturnValue(mockQueryBuilder);
mockInsert.mockReturnValue(mockQueryBuilder);
mockUpdate.mockReturnValue(mockQueryBuilder);
mockDelete.mockReturnValue(mockQueryBuilder);
mockOr.mockReturnValue(mockQueryBuilder);
mockEq.mockReturnValue(mockQueryBuilder);
mockGte.mockReturnValue(mockQueryBuilder);
mockOrder.mockReturnValue(mockQueryBuilder);
mockIn.mockReturnValue(mockQueryBuilder);

vi.mock("../../services/supabase", () => ({
  supabase: {
    from: vi.fn(() => mockQueryBuilder),
  },
}));

describe("Backend API: rotasRoutes (Suíte de Testes Completa)", () => {
  let app: ReturnType<typeof Fastify>;
  const TEST_USER_ID = "entregador-teste-123";

  beforeEach(async () => {
    vi.clearAllMocks();

    mockSelect.mockReturnValue(mockQueryBuilder);
    mockInsert.mockReturnValue(mockQueryBuilder);
    mockUpdate.mockReturnValue(mockQueryBuilder);
    mockDelete.mockReturnValue(mockQueryBuilder);
    mockOr.mockReturnValue(mockQueryBuilder);
    mockEq.mockReturnValue(mockQueryBuilder);
    mockGte.mockReturnValue(mockQueryBuilder);
    mockOrder.mockReturnValue(mockQueryBuilder);
    mockIn.mockReturnValue(mockQueryBuilder);

    app = Fastify();
    await app.register(rotasRoutes);
    await app.ready();
  });

  describe("POST /api/v1/entregas", () => {
    it("Deve cadastrar entrega com sucesso e geocodificar o endereço", async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: [{ lat: "-28.298", lon: "-54.263" }],
      });

      const mockEntregaSalva = {
        id: "123",
        rua: "Rua Centenário, 500 - Centro, Santo Ângelo",
        lat: -28.298,
        lon: -54.263,
        status: "pendente",
      };

      mockSingle.mockResolvedValueOnce({ data: mockEntregaSalva, error: null });

      const response = await app.inject({
        method: "POST",
        url: "/api/v1/entregas",
        payload: {
          rua: "Rua Centenário",
          numero: "500",
          bairro: "Centro",
          cidade: "Santo Ângelo",
          nomeDestinatario: "Cliente Teste",
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.sucesso).toBe(true);

      // Checagem de Segurança: Verifica se o entregador_id foi injetado na inserção
      expect(mockInsert).toHaveBeenCalledWith(expect.arrayContaining([expect.objectContaining({ entregador_id: TEST_USER_ID })]));
    });

    it("Deve retornar erro 500 se o Supabase falhar na inserção", async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: [] });
      mockSingle.mockResolvedValueOnce({ data: null, error: { message: "Erro no banco" } });

      const response = await app.inject({
        method: "POST",
        url: "/api/v1/entregas",
        payload: { rua: "Rua Teste" },
      });

      expect(response.statusCode).toBe(500);
    });
  });

  describe("GET /api/v1/rotas/atual", () => {
    it("Deve retornar a lista de paradas formatada e o resumo calculado via OSRM", async () => {
      const mockEntregasDB = [
        { id: "1", ordem: 1, rua: "Rua A", lat: -28.298, lon: -54.263 },
        { id: "2", ordem: 2, rua: "Rua B", lat: -28.299, lon: -54.264 },
      ];

      mockOrder.mockResolvedValueOnce({ data: mockEntregasDB, error: null });
      mockedAxios.get.mockResolvedValueOnce({
        data: { routes: [{ distance: 5000, duration: 600 }] },
      });

      const response = await app.inject({ method: "GET", url: "/api/v1/rotas/atual" });

      expect(response.statusCode).toBe(200);

      // Checagem de Segurança: Verifica se filtrou as rotas pelo ID do usuário
      expect(mockEq).toHaveBeenCalledWith("entregador_id", TEST_USER_ID);
    });

    it("Deve continuar funcionando mesmo se a API do OSRM falhar", async () => {
      mockOrder.mockResolvedValueOnce({ data: [], error: null });
      mockedAxios.get.mockRejectedValueOnce(new Error("OSRM indisponível"));

      const response = await app.inject({ method: "GET", url: "/api/v1/rotas/atual" });
      expect(response.statusCode).toBe(200);
    });
  });

  describe("POST /api/v1/rotas/otimizar", () => {
    it("Deve otimizar as entregas reordenando com base nas coordenadas do usuário", async () => {
      const mockEntregasDB = [{ id: "10", rua: "Rua A", lat: -28.298, lon: -54.263 }];

      mockOrder.mockResolvedValueOnce({ data: mockEntregasDB, error: null });
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          code: "Ok",
          waypoints: [{ waypoint_index: 0 }, { waypoint_index: 1 }],
          trips: [{ distance: 3000, duration: 300 }],
        },
      });

      const response = await app.inject({
        method: "POST",
        url: "/api/v1/rotas/otimizar",
        payload: { latUsuario: -28.297, lonUsuario: -54.262 },
      });

      expect(response.statusCode).toBe(200);

      // Checagem de Segurança: Verifica se o update atualiza apenas a rota do entregador dono
      expect(mockEq).toHaveBeenCalledWith("entregador_id", TEST_USER_ID);
    });
  });

  describe("PUT /api/v1/entregas/:id", () => {
    it("Deve atualizar o endereço da entrega com sucesso", async () => {
      // CORREÇÃO: O primeiro .eq() continua o builder, o segundo resolve a requisição
      mockEq.mockReturnValueOnce(mockQueryBuilder).mockResolvedValueOnce({ error: null });

      const response = await app.inject({
        method: "PUT",
        url: "/api/v1/entregas/123",
        payload: { rua: "Rua Nova, 300" },
      });

      expect(response.statusCode).toBe(200);
      expect(mockEq).toHaveBeenCalledWith("id", "123");
      expect(mockEq).toHaveBeenCalledWith("entregador_id", TEST_USER_ID);
    });

    it("Deve rejeitar atualização caso a rua venha vazia", async () => {
      const response = await app.inject({
        method: "PUT",
        url: "/api/v1/entregas/123",
        payload: { rua: "   " },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.erro).toBe("Endereço não pode estar vazio.");
    });
  });

  describe("Histórico e Ações em Massa", () => {
    it("GET /api/v1/entregas/historico-hoje - Deve retornar o histórico filtrado", async () => {
      const mockHistorico = [{ id: "1", rua: "Rua A", status: "entregue", updated_at: new Date().toISOString() }];
      mockGte.mockResolvedValueOnce({ data: mockHistorico, error: null });

      const response = await app.inject({
        method: "GET",
        url: "/api/v1/entregas/historico-hoje?periodo=hoje",
      });

      expect(response.statusCode).toBe(200);
      expect(mockEq).toHaveBeenCalledWith("entregador_id", TEST_USER_ID);
    });

    it("PUT /api/v1/rotas/concluir-todas - Deve concluir apenas as entregas do usuário logado", async () => {
      mockIn.mockResolvedValueOnce({ error: null });

      const response = await app.inject({
        method: "PUT",
        url: "/api/v1/rotas/concluir-todas",
        payload: { idsConcluidos: ["1", "2"] },
      });

      expect(response.statusCode).toBe(200);
      expect(mockEq).toHaveBeenCalledWith("entregador_id", TEST_USER_ID);
    });
  });

  describe("DELETE /api/v1/entregas/:id", () => {
    it("Deve remover uma entrega existente blindada pelo usuário", async () => {
      // CORREÇÃO: O primeiro .eq() continua o builder, o segundo resolve a requisição
      mockEq.mockReturnValueOnce(mockQueryBuilder).mockResolvedValueOnce({ error: null });

      const response = await app.inject({
        method: "DELETE",
        url: "/api/v1/entregas/123",
      });

      expect(response.statusCode).toBe(200);
      expect(mockEq).toHaveBeenCalledWith("id", "123");
      expect(mockEq).toHaveBeenCalledWith("entregador_id", TEST_USER_ID);
    });
  });
});
