import React from "react";
import { render, fireEvent, waitFor, act } from "@testing-library/react-native";
import { Alert } from "react-native";
import * as Location from "expo-location";
import HomeScreen from "../HomeScreen";
import { api } from "../../services/api";
import { abrirRotaGoogleMaps } from "../../utils/navigation";

// 1. Mock explícito do expo-location com valores padrão de sucesso
jest.mock("expo-location", () => ({
  hasServicesEnabledAsync: jest.fn(() => Promise.resolve(true)),
  requestForegroundPermissionsAsync: jest.fn(() => Promise.resolve({ status: "granted", granted: true })),
  // Mock adicionado para a verificação silenciosa não cair no catch
  getForegroundPermissionsAsync: jest.fn(() => Promise.resolve({ status: "granted", granted: true })),
  getCurrentPositionAsync: jest.fn(() =>
    Promise.resolve({
      coords: {
        latitude: -28.298,
        longitude: -54.263,
      },
    }),
  ),
  Accuracy: {
    Balanced: 3,
  },
}));

jest.mock("expo-haptics", () => ({
  notificationAsync: jest.fn(),
  impactAsync: jest.fn(),
  NotificationFeedbackType: { Warning: "Warning", Success: "Success", Error: "Error" },
  ImpactFeedbackStyle: { Light: "Light" },
}));

jest.mock("../../services/api", () => ({
  api: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
  },
}));

jest.mock("../../utils/navigation", () => ({
  abrirRotaGoogleMaps: jest.fn(),
}));

jest.mock("../../services/storage", () => ({
  carregarRotasLocalmente: jest.fn(() => Promise.resolve({ paradas: [], resumo: null })),
  salvarRotasLocalmente: jest.fn(() => Promise.resolve()),
}));

jest.mock("../../components/GerenciadorRotas", () => {
  const { View, Text, TouchableOpacity } = require("react-native");
  return {
    GerenciadorRotas: ({ paradas, onRefresh }: { paradas: any[]; onRefresh?: () => void }) => (
      <View testID="gerenciador-rotas">
        {onRefresh && <TouchableOpacity testID="pull-to-refresh-btn" onPress={onRefresh} />}
        {paradas.map((p: any) => (
          <Text key={p.id}>{p.rua}</Text>
        ))}
      </View>
    ),
  };
});

describe("Tela Completa: HomeScreen", () => {
  const mockParadas = [
    { id: "1", ordem: 1, rua: "Rua A, 100", lat: -28.298, lon: -54.263 },
    { id: "2", ordem: 2, rua: "Rua B, 200", lat: -28.299, lon: -54.264 },
  ];

  const mockResumo = {
    totalEntregas: 2,
    distanciaKm: 5.2,
    tempoEstimadoMin: 12,
    economiaEstimadaRs: 2.34,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (api.get as jest.Mock).mockResolvedValue({
      data: { paradas: mockParadas, resumo: mockResumo },
    });
  });

  test("Deve carregar e exibir as rotas e o resumo vindos da API", async () => {
    const { getByText } = render(<HomeScreen />);

    await waitFor(
      () => {
        expect(api.get).toHaveBeenCalledWith("/rotas/atual", {
          params: { lat: -28.298, lon: -54.263 },
        });
        expect(getByText("Rua A, 100")).toBeTruthy();
        expect(getByText("Rua B, 200")).toBeTruthy();
      },
      { timeout: 8000 },
    );
  }, 10000);

  test("Deve disparar a navegação do Google Maps ao clicar em Iniciar no GPS", async () => {
    const { getByText } = render(<HomeScreen />);

    await waitFor(() => {
      expect(getByText("Rua A, 100")).toBeTruthy();
    });

    const botaoIniciar = getByText("Iniciar no GPS");
    fireEvent.press(botaoIniciar);

    expect(abrirRotaGoogleMaps).toHaveBeenCalledWith(mockParadas);
  }, 10000);

  test("Deve recarregar as rotas ao acionar o Pull-to-Refresh", async () => {
    const { getByTestId, getByText } = render(<HomeScreen />);

    // Aguarda o carregamento inicial (1ª chamada à API)
    await waitFor(() => {
      expect(getByText("Rua A, 100")).toBeTruthy();
      expect(api.get).toHaveBeenCalledTimes(1);
    });

    // Simula a ação de puxar a lista para baixo
    const refreshBtn = getByTestId("pull-to-refresh-btn");
    await act(async () => {
      fireEvent.press(refreshBtn);
    });

    // Verifica se a função onRefresh disparou a requisição novamente (2ª chamada à API)
    await waitFor(() => {
      expect(api.get).toHaveBeenCalledTimes(2);
    });
  }, 10000);

  // ============================================================================
  // CENÁRIOS DO MODAL DE FINALIZAÇÃO DE LOTE
  // ============================================================================

  test("Cenário 1: Deve enviar TODOS os IDs quando nenhuma entrega for desmarcada", async () => {
    (api.put as jest.Mock).mockResolvedValue({ data: { sucesso: true } });
    const { getByText } = render(<HomeScreen />);

    await waitFor(() => expect(getByText("Finalizar Rota")).toBeTruthy());
    fireEvent.press(getByText("Finalizar Rota"));

    await waitFor(() => expect(getByText("Confirmar (2/2)")).toBeTruthy());

    await act(async () => {
      fireEvent.press(getByText("Confirmar (2/2)"));
    });

    await waitFor(() => {
      expect(api.put).toHaveBeenCalledWith("/rotas/concluir-todas", {
        idsConcluidos: ["1", "2"],
      });
    });
  }, 10000);

  test("Cenário 2: Deve enviar apenas os IDs restantes quando alguma entrega for desmarcada", async () => {
    (api.put as jest.Mock).mockResolvedValue({ data: { sucesso: true } });
    const { getByText, getAllByText } = render(<HomeScreen />);

    await waitFor(() => expect(getByText("Finalizar Rota")).toBeTruthy());
    fireEvent.press(getByText("Finalizar Rota"));

    await waitFor(() => expect(getByText("Confirmar (2/2)")).toBeTruthy());

    // Usa getAllByText para pegar os itens renderizados do Modal, que aparecem por último
    const itensRuaA = getAllByText("Rua A, 100");
    fireEvent.press(itensRuaA[itensRuaA.length - 1]);

    // O contador do botão deve cair para 1/2
    await waitFor(() => expect(getByText("Confirmar (1/2)")).toBeTruthy());

    await act(async () => {
      fireEvent.press(getByText("Confirmar (1/2)"));
    });

    await waitFor(() => {
      // Como desmarcamos a Rua A (id 1), a API deve receber apenas o id 2
      expect(api.put).toHaveBeenCalledWith("/rotas/concluir-todas", {
        idsConcluidos: ["2"],
      });
    });
  }, 10000);

  test("Cenário 3: Deve barrar a requisição e exibir alerta se NENHUMA entrega estiver selecionada", async () => {
    const spyAlert = jest.spyOn(Alert, "alert");
    const { getByText, getAllByText } = render(<HomeScreen />);

    await waitFor(() => expect(getByText("Finalizar Rota")).toBeTruthy());
    fireEvent.press(getByText("Finalizar Rota"));

    await waitFor(() => expect(getByText("Confirmar (2/2)")).toBeTruthy());

    // Desmarca todas as entregas dentro do modal
    const itensRuaA = getAllByText("Rua A, 100");
    fireEvent.press(itensRuaA[itensRuaA.length - 1]);

    const itensRuaB = getAllByText("Rua B, 200");
    fireEvent.press(itensRuaB[itensRuaB.length - 1]);

    // O contador deve mostrar 0/2
    await waitFor(() => expect(getByText("Confirmar (0/2)")).toBeTruthy());

    await act(async () => {
      fireEvent.press(getByText("Confirmar (0/2)"));
    });

    // A requisição PUT não pode ter sido chamada e o alerta deve ser disparado
    expect(api.put).not.toHaveBeenCalled();
    expect(spyAlert).toHaveBeenCalledWith("Atenção", "Nenhuma entrega marcada para finalizar.");
  }, 10000);

  // ============================================================================

  test("Deve acionar a otimização de rota ao clicar no botão Otimizar Rota", async () => {
    (api.post as jest.Mock).mockResolvedValue({
      data: { mensagem: "Rota otimizada com sucesso!", paradas: mockParadas },
    });

    const { getByText } = render(<HomeScreen />);

    await waitFor(() => {
      expect(getByText("Otimizar Rota")).toBeTruthy();
    });

    const botaoOtimizar = getByText("Otimizar Rota");

    await act(async () => {
      fireEvent.press(botaoOtimizar);
    });

    await waitFor(
      () => {
        expect(api.post).toHaveBeenCalledWith(
          "/rotas/otimizar",
          expect.objectContaining({
            latUsuario: -28.298,
            lonUsuario: -54.263,
          }),
        );
      },
      { timeout: 8000 },
    );
  }, 10000);
});
