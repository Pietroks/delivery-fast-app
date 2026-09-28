import React from "react";
import { render, fireEvent, waitFor, act } from "@testing-library/react-native";
import { FechamentoTurnoModal, CHAVE_STORAGE_CONFIG_FECHAMENTO } from "../FechamentoTurnoModal";
import { api } from "../../services/api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Linking from "expo-linking";

jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

jest.mock("@expo/vector-icons", () => ({
  Feather: "Feather",
  Ionicons: "Ionicons",
}));

jest.mock("../../services/api", () => ({
  api: {
    get: jest.fn(),
  },
}));

jest.mock("expo-linking", () => ({
  canOpenURL: jest.fn(() => Promise.resolve(true)),
  openURL: jest.fn(() => Promise.resolve(true)),
}));

describe("Componente: FechamentoTurnoModal", () => {
  const mockRelatorio = {
    data: "28/09/2026",
    totalParadas: 10,
    totalEntregues: 8,
    totalInsucessos: 2,
    kmRodados: 25.5,
    horaInicio: "10:00",
    horaFim: "14:00",
    duracaoMinutos: 240,
    tempoMedioPorParada: 24,
    financeiro: {
      taxaEntrega: 8,
      valorKm: 0,
      diaria: 0,
      ganhosEntregas: 64,
      ganhosKm: 0,
      totalGanhos: 64,
    },
    insucessos: [
      { id: "1", rua: "Rua A", motivo: "Cliente ausente" },
      { id: "2", rua: "Rua B", motivo: "Endereço não localizado" },
    ],
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
    (api.get as jest.Mock).mockResolvedValue({
      data: { sucesso: true, relatorio: mockRelatorio },
    });
  });

  it("Deve renderizar os dados do relatório de fechamento buscados da API", async () => {
    const { getByText } = render(<FechamentoTurnoModal visivel={true} onFechar={jest.fn()} />);

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith("/relatorios/fechamento", expect.any(Object));
      expect(getByText("Fechamento de Turno")).toBeTruthy();
      expect(getByText(/64\.00/)).toBeTruthy();
      expect(getByText(/Entregas/)).toBeTruthy();
      expect(getByText(/Distância viária/)).toBeTruthy();
    });
  });

  it("Deve carregar taxas prévias salvas no AsyncStorage", async () => {
    const configPrevia = {
      taxaEntrega: "10.00",
      diaria: "50.00",
      valorKm: "1.50",
      chavePix: "motoboy@pix.com",
    };
    await AsyncStorage.setItem(CHAVE_STORAGE_CONFIG_FECHAMENTO, JSON.stringify(configPrevia));

    render(<FechamentoTurnoModal visivel={true} onFechar={jest.fn()} />);

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith(
        "/relatorios/fechamento",
        expect.objectContaining({
          params: expect.objectContaining({
            taxaEntrega: 10,
            diaria: 50,
            valorKm: 1.5,
          }),
        }),
      );
    });
  });

  it("Deve permitir editar taxas e salvar no AsyncStorage", async () => {
    const { getByText, getByDisplayValue } = render(
      <FechamentoTurnoModal visivel={true} onFechar={jest.fn()} />,
    );

    await waitFor(() => {
      expect(getByText("Ajustar Taxa por Entrega / Diária / PIX")).toBeTruthy();
    });

    fireEvent.press(getByText("Ajustar Taxa por Entrega / Diária / PIX"));

    await waitFor(() => {
      expect(getByText("Salvar e Recalcular")).toBeTruthy();
    });

    const inputTaxa = getByDisplayValue("8.00");
    fireEvent.changeText(inputTaxa, "12.00");

    fireEvent.press(getByText("Salvar e Recalcular"));

    await waitFor(() => {
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        CHAVE_STORAGE_CONFIG_FECHAMENTO,
        expect.stringContaining('"taxaEntrega":"12.00"'),
      );
    });
  });

  it("Deve disparar o envio do relatório no WhatsApp com texto formatado", async () => {
    const { getByText } = render(<FechamentoTurnoModal visivel={true} onFechar={jest.fn()} />);

    await waitFor(() => {
      expect(getByText("Enviar Acerto no WhatsApp")).toBeTruthy();
    });

    fireEvent.press(getByText("Enviar Acerto no WhatsApp"));

    await waitFor(() => {
      expect(Linking.openURL).toHaveBeenCalledWith(
        expect.stringContaining("whatsapp://send?text="),
      );
    });
  });
});
