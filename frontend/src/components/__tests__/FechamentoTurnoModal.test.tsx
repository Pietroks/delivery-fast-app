import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import { FechamentoTurnoModal } from "../FechamentoTurnoModal";
import { api } from "../../services/api";
import * as Linking from "expo-linking";
import { Share } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

jest.mock("../../services/api");
jest.mock("expo-linking", () => ({
  canOpenURL: jest.fn(),
  openURL: jest.fn(),
}));

describe("Componente: FechamentoTurnoModal", () => {
  const mockRelatorio = {
    data: "2026-09-14",
    totalParadas: 15,
    totalEntregues: 14,
    totalInsucessos: 1,
    kmRodados: 32.4,
    horaInicio: "13:00",
    horaFim: "17:15",
    duracaoMinutos: 255,
    tempoMedioPorParada: 17,
    financeiro: {
      taxaEntrega: 8,
      valorKm: 0,
      diaria: 0,
      ganhosEntregas: 112,
      ganhosKm: 0,
      totalGanhos: 112,
    },
    insucessos: [
      {
        id: "ins-1",
        rua: "Rua do Comércio, 50",
        motivo: "Destinatário ausente",
      },
    ],
  };

  const mockFechar = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (api.get as jest.Mock).mockResolvedValue({
      data: {
        sucesso: true,
        relatorio: mockRelatorio,
      },
    });
    (Linking.canOpenURL as jest.Mock).mockResolvedValue(true);
    jest.spyOn(Share, "share").mockResolvedValue({ action: Share.sharedAction });
  });

  it("Deve renderizar os valores financeiros e operacionais retornados pela API", async () => {
    const { getByText } = render(
      <FechamentoTurnoModal visivel={true} onFechar={mockFechar} />,
    );

    await waitFor(() => {
      expect(getByText("R$ 112.00")).toBeTruthy();
      expect(getByText(/14 entregas feitas/i)).toBeTruthy();
      expect(getByText("32.4 km")).toBeTruthy();
      expect(getByText("17 min")).toBeTruthy();
    });
  });

  it("Deve exibir as devoluções registradas no turno", async () => {
    const { getByText } = render(
      <FechamentoTurnoModal visivel={true} onFechar={mockFechar} />,
    );

    await waitFor(() => {
      expect(getByText("Devoluções para Conferência (1)")).toBeTruthy();
      expect(getByText(/Rua do Comércio, 50/i)).toBeTruthy();
      expect(getByText(/Destinatário ausente/i)).toBeTruthy();
    });
  });

  it("Deve disparar abertura do WhatsApp com texto do relatório formatado", async () => {
    const { getByText } = render(
      <FechamentoTurnoModal visivel={true} onFechar={mockFechar} />,
    );

    await waitFor(() => {
      expect(getByText("Enviar Acerto no WhatsApp")).toBeTruthy();
    });

    fireEvent.press(getByText("Enviar Acerto no WhatsApp"));

    await waitFor(() => {
      expect(Linking.canOpenURL).toHaveBeenCalled();
      expect(Linking.openURL).toHaveBeenCalledWith(
        expect.stringContaining("whatsapp://send?text="),
      );
    });
  });

  it("Deve disparar compartilhamento nativo para outros apps", async () => {
    const { getByText } = render(
      <FechamentoTurnoModal visivel={true} onFechar={mockFechar} />,
    );

    await waitFor(() => {
      expect(getByText("Outros Apps")).toBeTruthy();
    });

    fireEvent.press(getByText("Outros Apps"));

    await waitFor(() => {
      expect(Share.share).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining("FECHAMENTO DE TURNO"),
        }),
      );
    });
  });

  it("Deve permitir abrir o painel de ajuste de taxas e salvar novos valores", async () => {
    const { getByText, getByPlaceholderText } = render(
      <FechamentoTurnoModal visivel={true} onFechar={mockFechar} />,
    );

    await waitFor(() => {
      expect(getByText(/Ajustar Taxa por Entrega/i)).toBeTruthy();
    });

    fireEvent.press(getByText(/Ajustar Taxa por Entrega/i));

    const inputPix = getByPlaceholderText("CPF, Telefone ou E-mail PIX");
    fireEvent.changeText(inputPix, "pix@teste.com");

    fireEvent.press(getByText("Salvar e Recalcular"));

    await waitFor(() => {
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        "@delivery_fast:config_fechamento_v1",
        expect.stringContaining("pix@teste.com"),
      );
    });
  });
});
