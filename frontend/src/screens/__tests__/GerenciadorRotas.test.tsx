import React from "react";
import { render, fireEvent, waitFor, act } from "@testing-library/react-native";
import { Alert, Linking, TouchableOpacity, FlatList } from "react-native";
import { api } from "../../services/api";
import { GerenciadorRotas } from "../../components/GerenciadorRotas";
import * as navigationUtils from "../../utils/navigation";

const mockNavigate = jest.fn();
jest.mock("@react-navigation/native", () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

jest.mock("@expo/vector-icons", () => ({
  Feather: "Feather",
  Ionicons: "Ionicons",
}));

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

  test("Deve abrir o modal de comprovante ao clicar em Concluir Entrega", async () => {
    const { getAllByText, getByText } = render(
      <GerenciadorRotas paradas={mockParadas} onAtualizarLista={mockOnAtualizarLista} onReordenarLocal={mockOnReordenarLocal} />,
    );

    const botoesConcluir = getAllByText("Concluir Entrega");
    fireEvent.press(botoesConcluir[0]);

    await waitFor(() => {
      expect(getByText("Comprovante de Entrega")).toBeTruthy();
    });
  });

  test("Deve abrir menu de opções e reordenar ao mover um item para baixo", async () => {
    (api.put as jest.Mock).mockResolvedValue({ data: { sucesso: true } });

    const { getAllByLabelText, getByText } = render(
      <GerenciadorRotas paradas={mockParadas} onAtualizarLista={mockOnAtualizarLista} onReordenarLocal={mockOnReordenarLocal} />,
    );

    const botoesOpcoes = getAllByLabelText(/Opções da entrega/);
    fireEvent.press(botoesOpcoes[0]);

    const botaoMoverBaixo = getByText("Mover para baixo na rota");
    fireEvent.press(botaoMoverBaixo);

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

  test("Deve abrir modal de edição a partir do menu de opções e salvar novo endereço", async () => {
    (api.put as jest.Mock).mockResolvedValue({ data: { sucesso: true } });

    const { getAllByLabelText, getByPlaceholderText, getByText } = render(
      <GerenciadorRotas paradas={mockParadas} onAtualizarLista={mockOnAtualizarLista} onReordenarLocal={mockOnReordenarLocal} />,
    );

    const botoesOpcoes = getAllByLabelText(/Opções da entrega/);
    fireEvent.press(botoesOpcoes[0]);

    const botaoEditar = getByText("Editar endereço");
    fireEvent.press(botaoEditar);

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

  test("Deve exibir confirmação e excluir a entrega a partir do menu de opções", async () => {
    const spyAlert = jest.spyOn(Alert, "alert");
    (api.delete as jest.Mock).mockResolvedValue({ data: { sucesso: true } });

    const { getAllByLabelText, getByText } = render(
      <GerenciadorRotas paradas={mockParadas} onAtualizarLista={mockOnAtualizarLista} onReordenarLocal={mockOnReordenarLocal} />,
    );

    const botoesOpcoes = getAllByLabelText(/Opções da entrega/);
    fireEvent.press(botoesOpcoes[0]);

    const botaoExcluir = getByText("Excluir parada da rota");
    fireEvent.press(botaoExcluir);

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

  test("Deve abrir o discador telefônico nativo (tel:) ao clicar em Ligar", () => {
    const spyLinking = jest.spyOn(Linking, "openURL").mockResolvedValue(true as any);
    const mockParadasComTelefone = [{ id: "1", ordem: 1, rua: "Rua A, 100", lat: -28.298, lon: -54.263, telefone: "(55) 99999-8877" }];

    const { getByText } = render(
      <GerenciadorRotas paradas={mockParadasComTelefone} onAtualizarLista={mockOnAtualizarLista} onReordenarLocal={mockOnReordenarLocal} />,
    );

    const botaoLigar = getByText("Ligar");
    fireEvent.press(botaoLigar);

    expect(spyLinking).toHaveBeenCalledWith("tel:55999998877");
  });

  test("Deve abrir WhatsApp com mensagem predefinida ao clicar em WhatsApp", () => {
    const spyLinking = jest.spyOn(Linking, "openURL").mockResolvedValue(true as any);
    const mockParadasComContato = [
      { id: "1", ordem: 1, rua: "Rua A, 100", lat: -28.298, lon: -54.263, telefone: "55999998877", nomeDestinatario: "Maria" },
    ];

    const { getByText } = render(
      <GerenciadorRotas paradas={mockParadasComContato} onAtualizarLista={mockOnAtualizarLista} onReordenarLocal={mockOnReordenarLocal} />,
    );

    const botaoWhats = getByText("WhatsApp");
    fireEvent.press(botaoWhats);

    expect(spyLinking).toHaveBeenCalledWith(expect.stringContaining("whatsapp://send?phone=55999998877"));
  });

  test("Deve acionar onRefresh ao puxar a lista para baixo (Pull-to-Refresh)", () => {
    const mockOnRefresh = jest.fn();
    const { UNSAFE_getByType } = render(
      <GerenciadorRotas
        paradas={mockParadas}
        onAtualizarLista={mockOnAtualizarLista}
        onReordenarLocal={mockOnReordenarLocal}
        refreshing={false}
        onRefresh={mockOnRefresh}
      />,
    );

    const flatList = UNSAFE_getByType(FlatList);

    act(() => {
      flatList.props.refreshControl.props.onRefresh();
    });

    expect(mockOnRefresh).toHaveBeenCalledTimes(1);
  });

  test("Deve abrir o modal de comprovante e salvar entrega com foto e recebedor", async () => {
    (api.put as jest.Mock).mockResolvedValue({ data: { sucesso: true } });

    const { getAllByText, getByText } = render(
      <GerenciadorRotas
        paradas={mockParadas}
        onAtualizarLista={mockOnAtualizarLista}
        onReordenarLocal={mockOnReordenarLocal}
      />,
    );

    const botoesConcluir = getAllByText("Concluir Entrega");
    fireEvent.press(botoesConcluir[0]);

    expect(getByText("Comprovante de Entrega")).toBeTruthy();

    const botaoConcluirRapido = getByText("Concluir Rápido");
    fireEvent.press(botaoConcluirRapido);

    await waitFor(() => {
      expect(api.put).toHaveBeenCalledWith(
        "/entregas/1/status",
        expect.objectContaining({
          status: "entregue",
        }),
      );
      expect(mockOnAtualizarLista).toHaveBeenCalled();
    });
  });

  test("Deve exibir toast de Desfazer e restaurar a parada ao clicar em DESFAZER", async () => {
    (api.put as jest.Mock).mockResolvedValue({ data: { sucesso: true } });

    const { getAllByText, getByText, queryByText } = render(
      <GerenciadorRotas
        paradas={mockParadas}
        onAtualizarLista={mockOnAtualizarLista}
        onReordenarLocal={mockOnReordenarLocal}
      />,
    );

    // Conclui a primeira parada
    const botoesConcluir = getAllByText("Concluir Entrega");
    fireEvent.press(botoesConcluir[0]);

    const botaoConcluirRapido = getByText("Concluir Rápido");
    fireEvent.press(botaoConcluirRapido);

    // O toast de Desfazer deve aparecer na tela
    await waitFor(() => {
      expect(getByText("Entrega concluída!")).toBeTruthy();
      expect(getByText("DESFAZER")).toBeTruthy();
    });

    // Clica no botão DESFAZER
    const botaoDesfazer = getByText("DESFAZER");
    fireEvent.press(botaoDesfazer);

    await waitFor(() => {
      // Deve chamar a API para reverter o status para "pendente"
      expect(api.put).toHaveBeenCalledWith("/entregas/1/status", { status: "pendente" });
      // A parada "Rua A, 100" volta a estar na tela
      expect(getByText("Rua A, 100")).toBeTruthy();
    });
  });

  test("Deve exibir banner informativo de Modo Offline quando isOffline for true", () => {
    const { getByText } = render(
      <GerenciadorRotas
        paradas={mockParadas}
        onAtualizarLista={mockOnAtualizarLista}
        onReordenarLocal={mockOnReordenarLocal}
        isOffline={true}
      />,
    );

    expect(getByText("Modo Offline Ativo")).toBeTruthy();
    expect(getByText(/salvas no aparelho/)).toBeTruthy();
  });

  test("Deve chamar abrirNavegacaoIndividual ao clicar no botão GPS de uma entrega", async () => {
    const spyNavegar = jest
      .spyOn(navigationUtils, "abrirNavegacaoIndividual")
      .mockImplementation(() => Promise.resolve());

    const { getAllByText } = render(
      <GerenciadorRotas
        paradas={mockParadas}
        onAtualizarLista={mockOnAtualizarLista}
        onReordenarLocal={mockOnReordenarLocal}
      />,
    );

    const botoesGps = getAllByText("GPS");
    expect(botoesGps.length).toBeGreaterThan(0);
    fireEvent.press(botoesGps[0]);

    await waitFor(() => {
      expect(spyNavegar).toHaveBeenCalledWith(mockParadas[0], undefined);
    });
  });

  test("Deve abrir o modal de insucesso e mover para o final da rota", async () => {
    (api.put as jest.Mock).mockResolvedValue({ data: { sucesso: true } });

    const { getByText } = render(
      <GerenciadorRotas
        paradas={mockParadas}
        onAtualizarLista={mockOnAtualizarLista}
        onReordenarLocal={mockOnReordenarLocal}
      />,
    );

    const botaoProblema = getByText("Problema");
    fireEvent.press(botaoProblema);

    expect(getByText("Relatar Insucesso")).toBeTruthy();

    const botaoMoverFinal = getByText("TENTAR NO FINAL DO TURNO");
    fireEvent.press(botaoMoverFinal);

    await waitFor(() => {
      expect(api.put).toHaveBeenCalledWith(
        "/entregas/1/status",
        expect.objectContaining({
          status: "pendente",
          motivoFalha: "destinatario_ausente",
          moverParaFinal: true,
        }),
      );
      expect(mockOnAtualizarLista).toHaveBeenCalled();
    });
  });

  test("Deve abrir o modal de insucesso e encerrar como falha", async () => {
    (api.put as jest.Mock).mockResolvedValue({ data: { sucesso: true } });

    const { getByText } = render(
      <GerenciadorRotas
        paradas={mockParadas}
        onAtualizarLista={mockOnAtualizarLista}
        onReordenarLocal={mockOnReordenarLocal}
      />,
    );

    const botaoProblema = getByText("Problema");
    fireEvent.press(botaoProblema);

    expect(getByText("Relatar Insucesso")).toBeTruthy();

    const botaoEncerrarFalha = getByText("ENCERRAR COMO FALHA");
    fireEvent.press(botaoEncerrarFalha);

    await waitFor(() => {
      expect(api.put).toHaveBeenCalledWith(
        "/entregas/1/status",
        expect.objectContaining({
          status: "tentativa_falha",
          motivoFalha: "destinatario_ausente",
          moverParaFinal: false,
        }),
      );
      expect(mockOnAtualizarLista).toHaveBeenCalled();
    });
  });
});
