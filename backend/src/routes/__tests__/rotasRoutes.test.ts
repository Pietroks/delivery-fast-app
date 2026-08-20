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
};

mockSelect.mockReturnValue(mockQueryBuilder);
mockInsert.mockReturnValue(mockQueryBuilder);
mockUpdate.mockReturnValue(mockQueryBuilder);
mockDelete.mockReturnValue(mockQueryBuilder);
mockOr.mockReturnValue(mockQueryBuilder);
mockEq.mockReturnValue(mockQueryBuilder);
mockGte.mockReturnValue(mockQueryBuilder);
mockOrder.mockReturnValue(mockQueryBuilder);

vi.mock("../../services/supabase", () => ({
  supabase: {
    from: vi.fn(() => mockQueryBuilder),
  },
}));

describe("Backend API: rotasRoutes (Suíte de Testes Completa)", () => {
  let app: ReturnType<typeof Fastify>;

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
      expect(body.entrega).toEqual(mockEntregaSalva);
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
      const body = JSON.parse(response.body);
      expect(body.sucesso).toBe(false);
      expect(body.erro).toBe("Erro ao salvar no banco de dados.");
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

      const response = await app.inject({
        method: "GET",
        url: "/api/v1/rotas/atual",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.paradas).toHaveLength(2);
      expect(body.resumo.distanciaKm).toBe(5);
      expect(body.resumo.tempoEstimadoMin).toBe(10);
      expect(body.resumo.economiaEstimadaRs).toBe(2.25);
    });

    it("Deve continuar funcionando mesmo se a API do OSRM falhar", async () => {
      const mockEntregasDB = [
        { id: "1", ordem: 1, rua: "Rua A", lat: -28.298, lon: -54.263 },
        { id: "2", ordem: 2, rua: "Rua B", lat: -28.299, lon: -54.264 },
      ];

      mockOrder.mockResolvedValueOnce({ data: mockEntregasDB, error: null });
      mockedAxios.get.mockRejectedValueOnce(new Error("OSRM indisponível"));

      const response = await app.inject({
        method: "GET",
        url: "/api/v1/rotas/atual",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.paradas).toHaveLength(2);
      expect(body.resumo.distanciaKm).toBe(0);
    });
  });

  describe("POST /api/v1/rotas/otimizar", () => {
    it("Deve otimizar as entregas reordenando com base nas coordenadas do usuário", async () => {
      const mockEntregasDB = [
        { id: "10", rua: "Rua A", lat: -28.298, lon: -54.263 },
        { id: "20", rua: "Rua B", lat: -28.299, lon: -54.264 },
      ];

      mockOrder.mockResolvedValueOnce({ data: mockEntregasDB, error: null });

      mockedAxios.get.mockResolvedValueOnce({
        data: {
          code: "Ok",
          waypoints: [{ waypoint_index: 0 }, { waypoint_index: 1 }, { waypoint_index: 2 }],
          trips: [{ distance: 3000, duration: 300 }],
        },
      });

      const response = await app.inject({
        method: "POST",
        url: "/api/v1/rotas/otimizar",
        payload: { latUsuario: -28.297, lonUsuario: -54.262 },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.sucesso).toBe(true);
      expect(body.mensagem).toBe("Rota otimizada com sucesso!");
    });

    it("Deve retornar mensagem explicativa quando não houver entregas pendentes", async () => {
      mockOrder.mockResolvedValueOnce({ data: [], error: null });

      const response = await app.inject({
        method: "POST",
        url: "/api/v1/rotas/otimizar",
        payload: {},
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.mensagem).toBe("Sem entregas para otimizar.");
    });
  });

  describe("PUT /api/v1/entregas/:id", () => {
    it("Deve atualizar o endereço da entrega com sucesso", async () => {
      mockEq.mockResolvedValueOnce({ error: null });

      const response = await app.inject({
        method: "PUT",
        url: "/api/v1/entregas/123",
        payload: { rua: "Rua Nova, 300" },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.sucesso).toBe(true);
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
    it("GET /api/v1/entregas/historico-hoje - Deve retornar o histórico de entregas do dia", async () => {
      const mockHistorico = [{ id: "1", rua: "Rua A", status: "entregue", updated_at: new Date().toISOString() }];

      mockGte.mockResolvedValueOnce({ data: mockHistorico, error: null });

      const response = await app.inject({
        method: "GET",
        url: "/api/v1/entregas/historico-hoje?periodo=hoje",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.sucesso).toBe(true);
      expect(body.resumo.totalConcluidas).toBe(1);
    });

    it("PUT /api/v1/rotas/concluir-todas - Deve marcar todas as entregas como concluídas", async () => {
      mockOr.mockResolvedValueOnce({ error: null });

      const response = await app.inject({
        method: "PUT",
        url: "/api/v1/rotas/concluir-todas",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.sucesso).toBe(true);
      expect(body.mensagem).toBe("Todas as entregas foram concluídas!");
    });
  });

  describe("DELETE /api/v1/entregas/:id", () => {
    it("Deve remover uma entrega existente", async () => {
      mockEq.mockResolvedValueOnce({ error: null });

      const response = await app.inject({
        method: "DELETE",
        url: "/api/v1/entregas/123",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.sucesso).toBe(true);
    });
  });
});
