import React from "react";
import { render, waitFor } from "@testing-library/react-native";
import HistoricoScreen from "../HistoricoScreen";

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
});
