import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { CardParadaAtiva } from "../CardParadaAtiva";

jest.mock("@expo/vector-icons", () => ({
  Feather: "Feather",
  Ionicons: "Ionicons",
}));

describe("Componente: CardParadaAtiva", () => {
  const mockParada = {
    id: "parada-1",
    ordem: 1,
    rua: "Rua Marquês do Herval, 123",
    bairro: "Centro",
    horarioEstimado: "14:30",
    lat: -28.298,
    lon: -54.263,
    telefone: "55999998877",
    nomeDestinatario: "Maria Silva",
  };

  const mockOnConcluir = jest.fn();
  const mockOnNavegarGPS = jest.fn();
  const mockOnLigar = jest.fn();
  const mockOnWhatsapp = jest.fn();
  const mockOnOpcoes = jest.fn();
  const mockOnInsucesso = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("Deve renderizar os dados da parada ativa com badge de destaque", () => {
    const { getByText } = render(
      <CardParadaAtiva
        parada={mockParada}
        index={0}
        totalParadas={5}
        onConcluir={mockOnConcluir}
        onNavegarGPS={mockOnNavegarGPS}
      />,
    );

    expect(getByText(/EM ANDAMENTO • PARADA #1/)).toBeTruthy();
    expect(getByText("de 5")).toBeTruthy();
    expect(getByText("Rua Marquês do Herval, 123")).toBeTruthy();
    expect(getByText("Maria Silva")).toBeTruthy();
    expect(getByText("Centro")).toBeTruthy();
    expect(getByText("14:30")).toBeTruthy();
  });

  test("Deve acionar onConcluir ao pressionar o botão gigante Cheguei / Concluir Entrega", () => {
    const { getByText } = render(
      <CardParadaAtiva
        parada={mockParada}
        onConcluir={mockOnConcluir}
        onNavegarGPS={mockOnNavegarGPS}
      />,
    );

    const botaoConcluir = getByText("Concluir Entrega");
    fireEvent.press(botaoConcluir);

    expect(mockOnConcluir).toHaveBeenCalledWith(mockParada);
  });

  test("Deve acionar onNavegarGPS ao pressionar o botão de GPS", () => {
    const { getByText } = render(
      <CardParadaAtiva
        parada={mockParada}
        onConcluir={mockOnConcluir}
        onNavegarGPS={mockOnNavegarGPS}
      />,
    );

    const botaoGps = getByText("GPS");
    fireEvent.press(botaoGps);

    expect(mockOnNavegarGPS).toHaveBeenCalledWith(mockParada);
  });

  test("Deve acionar onLigar e onWhatsapp ao tocar nos botões de contato", () => {
    const { getByText } = render(
      <CardParadaAtiva
        parada={mockParada}
        onConcluir={mockOnConcluir}
        onNavegarGPS={mockOnNavegarGPS}
        onLigar={mockOnLigar}
        onWhatsapp={mockOnWhatsapp}
      />,
    );

    fireEvent.press(getByText("Ligar"));
    expect(mockOnLigar).toHaveBeenCalledWith("55999998877");

    fireEvent.press(getByText("WhatsApp"));
    expect(mockOnWhatsapp).toHaveBeenCalledWith("55999998877", "Maria Silva");
  });

  test("Deve acionar onOpcoes ao tocar no menu de opções", () => {
    const { getByLabelText } = render(
      <CardParadaAtiva
        parada={mockParada}
        index={0}
        onConcluir={mockOnConcluir}
        onNavegarGPS={mockOnNavegarGPS}
        onOpcoes={mockOnOpcoes}
      />,
    );

    const botaoOpcoes = getByLabelText("Opções da entrega 1");
    fireEvent.press(botaoOpcoes);

    expect(mockOnOpcoes).toHaveBeenCalledWith(mockParada, 0);
  });

  test("Deve acionar onInsucesso ao tocar no botão de problema", () => {
    const { getByText } = render(
      <CardParadaAtiva
        parada={mockParada}
        onConcluir={mockOnConcluir}
        onNavegarGPS={mockOnNavegarGPS}
        onInsucesso={mockOnInsucesso}
      />,
    );

    const botaoProblema = getByText("Problema");
    fireEvent.press(botaoProblema);

    expect(mockOnInsucesso).toHaveBeenCalledWith(mockParada);
  });
});
