import React from "react";
import { render, fireEvent, waitFor, act } from "@testing-library/react-native";
import { Alert, TouchableOpacity } from "react-native";
import { api } from "../../services/api";
import { GerenciadorRotas } from "../../components/GerenciadorRotas";

jest.mock("../../services/api", () => ({
  api: {
    put: jest.fn(),
    delete: jest.fn(),
  },
}));

describe("Componente: GerenciadorRotas", () => {
  const mockParadas = [
    { id: "1", ordem: 1, rua: "Rua A, 100", lat: -28.298, lon: -54.263 },
    { id: "2", ordem: 2, rua: "Rua B, 200", lat: -28.299, lon: -54.264 },
  ];

  const mockOnAtualizarLista = jest.fn();
  const mockOnReordenarLocal = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("Deve renderizar a lista de paradas corretamente", () => {
    const { getByText } = render(
      <GerenciadorRotas paradas={mockParadas} onAtualizarLista={mockOnAtualizarLista} onReordenarLocal={mockOnReordenarLocal} />,
    );

    expect(getByText("Rua A, 100")).toBeTruthy();
    expect(getByText("Rua B, 200")).toBeTruthy();
  });

  test("Deve concluir uma entrega individual ao clicar no check", async () => {
    (api.put as jest.Mock).mockResolvedValue({ data: { sucesso: true } });

    const { UNSAFE_getAllByType } = render(
      <GerenciadorRotas paradas={mockParadas} onAtualizarLista={mockOnAtualizarLista} onReordenarLocal={mockOnReordenarLocal} />,
    );

    const botoes = UNSAFE_getAllByType(TouchableOpacity);
    // Clica no primeiro botão da primeira linha (Check verde de concluir)
    fireEvent.press(botoes[0]);

    await waitFor(() => {
      expect(api.put).toHaveBeenCalledWith("/entregas/1/status", {
        status: "entregue",
      });
      expect(mockOnAtualizarLista).toHaveBeenCalled();
    });
  });

  test("Deve reordenar ao mover um item para baixo", async () => {
    (api.put as jest.Mock).mockResolvedValue({ data: { sucesso: true } });

    const { UNSAFE_getAllByType } = render(
      <GerenciadorRotas paradas={mockParadas} onAtualizarLista={mockOnAtualizarLista} onReordenarLocal={mockOnReordenarLocal} />,
    );

    const botoes = UNSAFE_getAllByType(TouchableOpacity);
    // O segundo TouchableOpacity da primeira linha é a seta para baixo (mover posição)
    fireEvent.press(botoes[1]);

    await waitFor(() => {
      expect(api.put).toHaveBeenCalledWith(
        "/rotas/reordenar",
        expect.objectContaining({
          paradas: [
            { id: "2", ordem: 1 },
            { id: "1", ordem: 2 },
          ],
        }),
      );
    });
  });

  test("Deve abrir modal de edição e salvar novo endereço", async () => {
    (api.put as jest.Mock).mockResolvedValue({ data: { sucesso: true } });

    const { getByPlaceholderText, getByText, UNSAFE_getAllByType } = render(
      <GerenciadorRotas paradas={mockParadas} onAtualizarLista={mockOnAtualizarLista} onReordenarLocal={mockOnReordenarLocal} />,
    );

    const botoes = UNSAFE_getAllByType(TouchableOpacity);
    // Clica no botão de Lápis (Editar) da primeira parada
    fireEvent.press(botoes[2]);

    const inputEdicao = getByPlaceholderText("Digite o novo endereço");
    fireEvent.changeText(inputEdicao, "Rua A Alterada, 150");

    const botaoSalvar = getByText("Salvar");
    fireEvent.press(botaoSalvar);

    await waitFor(() => {
      expect(api.put).toHaveBeenCalledWith("/entregas/1", {
        rua: "Rua A Alterada, 150",
      });
      expect(mockOnAtualizarLista).toHaveBeenCalled();
    });
  });

  test("Deve exibir confirmação e excluir a entrega", async () => {
    const spyAlert = jest.spyOn(Alert, "alert");
    (api.delete as jest.Mock).mockResolvedValue({ data: { sucesso: true } });

    const { UNSAFE_getAllByType } = render(
      <GerenciadorRotas paradas={mockParadas} onAtualizarLista={mockOnAtualizarLista} onReordenarLocal={mockOnReordenarLocal} />,
    );

    const botoes = UNSAFE_getAllByType(TouchableOpacity);
    // Clica no botão de Lixeira (Excluir) da primeira parada
    fireEvent.press(botoes[3]);

    expect(spyAlert).toHaveBeenCalledWith("Excluir parada", 'Deseja remover "Rua A, 100" da rota?', expect.any(Array));

    const botoesAlert = spyAlert.mock.calls[0][2];
    const botaoConfirmar = botoesAlert?.find((b: any) => b.text === "Excluir");

    if (botaoConfirmar && typeof botaoConfirmar.onPress === "function") {
      const onPressFn = botaoConfirmar.onPress;
      await act(async () => {
        await onPressFn();
      });
    }

    await waitFor(() => {
      expect(api.delete).toHaveBeenCalledWith("/entregas/1");
      expect(mockOnAtualizarLista).toHaveBeenCalled();
    });
  });
});
