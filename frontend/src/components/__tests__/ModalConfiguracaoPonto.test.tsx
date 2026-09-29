import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import { ModalConfiguracaoPonto } from "../ModalConfiguracaoPonto";
import * as cepService from "../../services/cep";

jest.mock("@expo/vector-icons", () => ({
  Feather: "Feather",
  Ionicons: "Ionicons",
}));

describe("Componente: ModalConfiguracaoPonto", () => {
  const mockConfigInicial = {
    tipo: "gps" as const,
    retornarABase: false,
  };

  const mockOnFechar = jest.fn();
  const mockOnSalvar = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("Deve renderizar opções de GPS e Hub e switch de retorno", () => {
    const { getByText } = render(
      <ModalConfiguracaoPonto
        visivel={true}
        configInicial={mockConfigInicial}
        onFechar={mockOnFechar}
        onSalvar={mockOnSalvar}
      />,
    );

    expect(getByText("Ponto de Partida e Retorno")).toBeTruthy();
    expect(getByText("GPS Ao Vivo")).toBeTruthy();
    expect(getByText("Hub / Galpão")).toBeTruthy();
    expect(getByText("Retorno à Base no Final")).toBeTruthy();
  });

  test("Deve alternar para Hub e exibir campos de endereço e CEP", () => {
    const { getByText, getByPlaceholderText } = render(
      <ModalConfiguracaoPonto
        visivel={true}
        configInicial={mockConfigInicial}
        onFechar={mockOnFechar}
        onSalvar={mockOnSalvar}
      />,
    );

    fireEvent.press(getByText("Hub / Galpão"));

    expect(getByPlaceholderText(/CEP do Galpão/)).toBeTruthy();
    expect(getByPlaceholderText(/Nome do Galpão/)).toBeTruthy();
  });

  test("Deve buscar CEP do Hub e preencher logradouro e coordenadas", async () => {
    jest.spyOn(cepService, "buscarEnderecoPorCep").mockResolvedValueOnce({
      rua: "Rua Marquês do Herval",
      bairro: "Centro",
      cidade: "Santo Ângelo",
      lat: -28.298,
      lon: -54.263,
    });

    const { getByText, getByPlaceholderText } = render(
      <ModalConfiguracaoPonto
        visivel={true}
        configInicial={{ tipo: "hub", hubCep: "98800000", retornarABase: false }}
        onFechar={mockOnFechar}
        onSalvar={mockOnSalvar}
      />,
    );

    fireEvent.press(getByText("Buscar"));

    await waitFor(() => {
      expect(cepService.buscarEnderecoPorCep).toHaveBeenCalledWith("98800000");
      expect(getByText(/Endereço e coordenadas localizados/)).toBeTruthy();
    });
  });

  test("Deve salvar configuração ao clicar no botão salvar", async () => {
    const { getByText } = render(
      <ModalConfiguracaoPonto
        visivel={true}
        configInicial={{
          tipo: "hub",
          hubEndereco: "Galpão Central",
          hubLat: -28.295,
          hubLon: -54.26,
          retornarABase: true,
        }}
        onFechar={mockOnFechar}
        onSalvar={mockOnSalvar}
      />,
    );

    const botaoSalvar = getByText("SALVAR CONFIGURAÇÃO");
    fireEvent.press(botaoSalvar);

    await waitFor(() => {
      expect(mockOnSalvar).toHaveBeenCalledWith(
        expect.objectContaining({
          tipo: "hub",
          hubEndereco: "Galpão Central",
          hubLat: -28.295,
          hubLon: -54.26,
          retornarABase: true,
        }),
      );
      expect(mockOnFechar).toHaveBeenCalled();
    });
  });
});
