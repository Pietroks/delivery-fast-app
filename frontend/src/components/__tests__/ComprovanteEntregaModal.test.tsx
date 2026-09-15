import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import { ComprovanteEntregaModal, formatarCpf } from "../ComprovanteEntregaModal";
import * as ImagePicker from "expo-image-picker";

describe("Componente: ComprovanteEntregaModal", () => {
  const mockParada = {
    id: "p-1",
    ordem: 1,
    rua: "Rua das Acácias, 100",
    bairro: "Centro",
    lat: -28.298,
    lon: -54.263,
    nomeDestinatario: "Ana Beatriz",
  };

  const mockFechar = jest.fn();
  const mockConfirmar = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("Deve renderizar corretamente com os dados da parada e destinatário", () => {
    const { getByText } = render(
      <ComprovanteEntregaModal
        visivel={true}
        parada={mockParada}
        carregando={false}
        onFechar={mockFechar}
        onConfirmar={mockConfirmar}
      />,
    );

    expect(getByText("Comprovante de Entrega")).toBeTruthy();
    expect(getByText("Parada #1: Rua das Acácias, 100")).toBeTruthy();
    expect(getByText("Foto da Encomenda")).toBeTruthy();
    expect(getByText("Assinatura & Dados")).toBeTruthy();
  });

  it("Deve permitir conclusão rápida sem foto ou assinatura", async () => {
    const { getByText } = render(
      <ComprovanteEntregaModal
        visivel={true}
        parada={mockParada}
        carregando={false}
        onFechar={mockFechar}
        onConfirmar={mockConfirmar}
      />,
    );

    fireEvent.press(getByText("Concluir Rápido"));

    expect(mockConfirmar).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "entregue",
        recebidoPor: "Ana Beatriz",
      }),
    );
  });

  it("Deve alternar para a aba de assinatura e preencher dados do recebedor", async () => {
    const { getByText, getByPlaceholderText } = render(
      <ComprovanteEntregaModal
        visivel={true}
        parada={mockParada}
        carregando={false}
        onFechar={mockFechar}
        onConfirmar={mockConfirmar}
      />,
    );

    fireEvent.press(getByText("Assinatura & Dados"));

    expect(getByText("Nome de quem recebeu")).toBeTruthy();
    expect(getByText("CPF do recebedor (opcional)")).toBeTruthy();

    const inputDoc = getByPlaceholderText("000.000.000-00");
    fireEvent.changeText(inputDoc, "12345678901");

    fireEvent.press(getByText("Salvar com Comprovante"));

    expect(mockConfirmar).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "entregue",
        recebidoPor: "Ana Beatriz",
        documentoRecebedor: "123.456.789-01",
      }),
    );
  });

  it("Deve acionar a câmera ao selecionar tirar foto", async () => {
    const { getByText } = render(
      <ComprovanteEntregaModal
        visivel={true}
        parada={mockParada}
        carregando={false}
        onFechar={mockFechar}
        onConfirmar={mockConfirmar}
      />,
    );

    fireEvent.press(getByText("Tirar Foto do Pacote"));

    await waitFor(() => {
      expect(ImagePicker.launchCameraAsync).toHaveBeenCalled();
    });
  });

  it("Deve formatar o CPF corretamente com pontos e hífen", () => {
    expect(formatarCpf("123")).toBe("123");
    expect(formatarCpf("123456")).toBe("123.456");
    expect(formatarCpf("123456789")).toBe("123.456.789");
    expect(formatarCpf("12345678901")).toBe("123.456.789-01");
    expect(formatarCpf("123.456.789-01")).toBe("123.456.789-01");
  });
});
