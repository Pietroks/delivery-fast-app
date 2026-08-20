import { describe, it, expect, vi, beforeEach } from "vitest";
import axios from "axios";
import { otimizarSequencia, calcularMetricas } from "../osrm.service";

vi.mock("axios");
const mockedAxios = vi.mocked(axios, true);

describe("Serviço OSRM (osrm.service.ts)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("otimizarSequencia", () => {
    it("Deve reordenar os pontos com base na ordem de waypoint_index do OSRM", async () => {
      const pontosEntrada = [
        { lat: -28.297, lon: -54.262, enderecoOriginal: "GPS Início" },
        { lat: -28.298, lon: -54.263, enderecoOriginal: "Rua A" },
        { lat: -28.299, lon: -54.264, enderecoOriginal: "Rua B" },
      ];

      // Simula a resposta do OSRM reordenando os pontos
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          code: "Ok",
          waypoints: [
            { waypoint_index: 0 }, // GPS (Posição 1)
            { waypoint_index: 2 }, // Rua A (Invertido para ser Posição 3)
            { waypoint_index: 1 }, // Rua B (Invertido para ser Posição 2)
          ],
        },
      });

      const resultado = await otimizarSequencia(pontosEntrada);

      expect(resultado).toHaveLength(3);
      expect(resultado[0].endereco).toBe("GPS Início");
      expect(resultado[1].endereco).toBe("Rua B");
      expect(resultado[2].endereco).toBe("Rua A");
    });

    it("Deve disparar erro se a API do OSRM não retornar 'Ok'", async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: { code: "NoTrips" },
      });

      await expect(otimizarSequencia([{ lat: -28.1, lon: -54.1, enderecoOriginal: "Teste" }])).rejects.toThrow(
        "Erro na otimização da rota: Falha ao calcular rota no OSRM.",
      );
    });
  });

  describe("calcularMetricas", () => {
    it("Deve converter distância e tempo em combustível e formato de horas corretamente", () => {
      // 10.000 metros (10 km) e 3900 segundos (65 minutos -> 1h 5m)
      const metricas = calcularMetricas(10000, 3900);

      expect(metricas.distanciaKm).toBe("10.0");
      expect(metricas.tempoFormatado).toBe("1h 5m");
      // 10km / 10 km/l = 1 Litro * R$ 5,80 = 5.80
      expect(metricas.custoEstimado).toBe("5.80");
    });
  });
});
