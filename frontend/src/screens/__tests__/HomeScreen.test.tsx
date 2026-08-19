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
  const { View, Text } = require("react-native");
  return {
    GerenciadorRotas: ({ paradas }: { paradas: any[] }) => (
      <View testID="gerenciador-rotas">
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
        expect(api.get).toHaveBeenCalledWith("/rotas/atual");
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

  test("Deve exibir confirmação e chamar a API para finalizar todas as entregas", async () => {
    const spyAlert = jest.spyOn(Alert, "alert");
    (api.put as jest.Mock).mockResolvedValue({ data: { sucesso: true } });

    const { getByText } = render(<HomeScreen />);

    await waitFor(() => {
      expect(getByText("Finalizar todas")).toBeTruthy();
    });

    const botaoFinalizar = getByText("Finalizar todas");
    fireEvent.press(botaoFinalizar);

    expect(spyAlert).toHaveBeenCalledWith(
      "Finalizar todas as entregas?",
      expect.stringContaining("Deseja marcar todas as 2 entregas"),
      expect.any(Array),
    );

    const botoesAlert = spyAlert.mock.calls[0][2];
    const botaoConfirmar = botoesAlert?.find((b: any) => b.text === "Sim, finalizar tudo");

    if (botaoConfirmar && typeof botaoConfirmar.onPress === "function") {
      const onPressFn = botaoConfirmar.onPress;
      await act(async () => {
        await onPressFn();
      });
    }

    await waitFor(() => {
      expect(api.put).toHaveBeenCalledWith("/rotas/concluir-todas");
    });
  }, 10000);

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
