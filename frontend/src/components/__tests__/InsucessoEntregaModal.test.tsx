import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { InsucessoEntregaModal } from "../InsucessoEntregaModal";

jest.mock("@expo/vector-icons", () => ({
  Feather: "Feather",
  Ionicons: "Ionicons",
}));

describe("Componente: InsucessoEntregaModal", () => {
  const mockParada = {
    id: "p-1",
    ordem: 1,
    rua: "Rua Marquês do Herval, 123",
    bairro: "Centro",
    lat: -28.298,
    lon: -54.263,
    nomeDestinatario: "Carlos Silva",
  };

  const mockOnFechar = jest.fn();
  const mockOnConfirmar = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("Deve renderizar os dados da entrega e a lista de motivos", () => {
    const { getByText } = render(
      <InsucessoEntregaModal
        visivel={true}
        parada={mockParada}
        onFechar={mockOnFechar}
        onConfirmar={mockOnConfirmar}
      />,
    );

    expect(getByText("Relatar Insucesso")).toBeTruthy();
    expect(getByText("Rua Marquês do Herval, 123")).toBeTruthy();
    expect(getByText("Destinatário Ausente")).toBeTruthy();
    expect(getByText("Endereço Não Localizado")).toBeTruthy();
    expect(getByText("Recusado pelo Destinatário")).toBeTruthy();
    expect(getByText("Problema Operacional")).toBeTruthy();
  });

  test("Deve chamar onConfirmar com moverParaFinal=true ao clicar em TENTAR NO FINAL DO TURNO", () => {
    const { getByText, getByPlaceholderText } = render(
      <InsucessoEntregaModal
        visivel={true}
        parada={mockParada}
        onFechar={mockOnFechar}
        onConfirmar={mockOnConfirmar}
      />,
    );

    const inputObs = getByPlaceholderText(/Portão com cadeado/);
    fireEvent.changeText(inputObs, "Portão trancado, ninguém atendeu");

    const botaoFinal = getByText("TENTAR NO FINAL DO TURNO");
    fireEvent.press(botaoFinal);

    expect(mockOnConfirmar).toHaveBeenCalledWith({
      motivoFalha: "destinatario_ausente",
      observacao: "Portão trancado, ninguém atendeu",
      moverParaFinal: true,
    });
  });

  test("Deve chamar onConfirmar com moverParaFinal=false ao clicar em ENCERRAR COMO FALHA", () => {
    const { getByText } = render(
      <InsucessoEntregaModal
        visivel={true}
        parada={mockParada}
        onFechar={mockOnFechar}
        onConfirmar={mockOnConfirmar}
      />,
    );

    // Seleciona outro motivo
    fireEvent.press(getByText("Endereço Não Localizado"));

    const botaoFalha = getByText("ENCERRAR COMO FALHA");
    fireEvent.press(botaoFalha);

    expect(mockOnConfirmar).toHaveBeenCalledWith({
      motivoFalha: "endereco_nao_localizado",
      observacao: undefined,
      moverParaFinal: false,
    });
  });

  test("Deve chamar onFechar ao clicar no botão de fechar", () => {
    const { getByLabelText } = render(
      <InsucessoEntregaModal
        visivel={true}
        parada={mockParada}
        onFechar={mockOnFechar}
        onConfirmar={mockOnConfirmar}
      />,
    );

    const botaoFechar = getByLabelText("Fechar modal de insucesso");
    fireEvent.press(botaoFechar);

    expect(mockOnFechar).toHaveBeenCalled();
  });
});
