import React from "react";
import { render, waitFor } from "@testing-library/react-native";
import HistoricoScreen, { extrairDadosComprovante } from "../HistoricoScreen";

jest.mock("../../services/api", () => ({
  api: {
    get: jest.fn(() =>
      Promise.resolve({
        data: {
          entregas: [
            { id: "1", rua: "Rua do Comércio, 100", nomeDestinatario: "Ana Souza", updated_at: "2026-08-18T14:00:00Z" },
            { id: "2", rua: "Av. Brasil, 500", nomeDestinatario: "Pedro Alves", updated_at: "2026-08-18T14:30:00Z" },
          ],
          resumo: {
            totalConcluidas: 2,
            ultimaEntregaHora: "14:30",
          },
        },
      }),
    ),
  },
}));

describe("Tela Completa: HistoricoScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("Deve carregar e exibir a lista de entregas concluídas e métricas na tela", async () => {
    const { getByText } = render(<HistoricoScreen />);

    await waitFor(
      () => {
        expect(getByText("Rua do Comércio, 100")).toBeTruthy();
        expect(getByText("Av. Brasil, 500")).toBeTruthy();
      },
      { timeout: 8000 },
    );
  }, 10000);

  test("extrairDadosComprovante deve extrair foto, assinatura e recebedor de referencia quando colunas diretas forem nulas", () => {
    const entregaComFallback = {
      id: "99",
      rua: "Rua 31 de Dezembro, 193",
      referencia: 'Comprovante: {"fotoComprovante":"data:image/jpeg;base64,mock123","assinaturaDigital":"[{\\"pontos\\":[{\\"x\\":10,\\"y\\":20}]}]","recebidoPor":"João Teste","documentoRecebedor":"123456"}',
    };

    const extraido = extrairDadosComprovante(entregaComFallback);
    expect(extraido.foto).toBe("data:image/jpeg;base64,mock123");
    expect(extraido.recebedor).toBe("João Teste");
    expect(extraido.doc).toBe("123456");
    expect(extraido.tracosAssinatura).toHaveLength(1);
    expect(extraido.tracosAssinatura[0].pontos[0].x).toBe(10);
  });
});
