import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import NovaEntregaScreen from "../NovaEntregaScreen";
import { api } from "../../services/api";

jest.mock("../../services/api", () => ({
  api: {
    post: jest.fn(() => Promise.resolve({ data: { sucesso: true } })),
  },
}));

describe("Tela Completa: NovaEntregaScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("Deve preencher todo o formulário e disparar a criação da entrega na API ao clicar em Salvar", async () => {
    const { getByPlaceholderText, getByText } = render(<NovaEntregaScreen />);

    await waitFor(() => {
      expect(getByPlaceholderText("Ex: Rua XV de Novembro")).toBeTruthy();
    });

    fireEvent.changeText(getByPlaceholderText("Ex: Rua XV de Novembro"), "Rua Marechal Floriano");
    fireEvent.changeText(getByPlaceholderText("Ex: 1500"), "250");
    fireEvent.changeText(getByPlaceholderText("Digite o nome"), "Carlos Silva");
    fireEvent.changeText(getByPlaceholderText("(55) 99999-9999"), "55999887766");

    const botaoSalvar = getByText("Salvar entrega");
    fireEvent.press(botaoSalvar);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        "/entregas",
        expect.objectContaining({
          rua: "Rua Marechal Floriano",
          numero: "250",
          nomeDestinatario: "Carlos Silva",
          telefone: "55999887766",
        }),
      );
    });
  }, 10000);

  test("Deve exibir alerta se o usuário tentar salvar com a Rua vazia", async () => {
    const { getByText } = render(<NovaEntregaScreen />);

    const botaoSalvar = getByText("Salvar entrega");
    fireEvent.press(botaoSalvar);

    expect(api.post).not.toHaveBeenCalled();
  }, 10000);
});
