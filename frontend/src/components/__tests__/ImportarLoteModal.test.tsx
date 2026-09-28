import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import { ImportarLoteModal, parseLinhasParaEntregas } from "../ImportarLoteModal";
import { api } from "../../services/api";

jest.mock("@expo/vector-icons", () => ({
  Feather: "Feather",
  Ionicons: "Ionicons",
}));

jest.mock("../../services/api", () => ({
  api: {
    post: jest.fn(() => Promise.resolve({ data: { sucesso: true, total: 2 } })),
  },
}));

jest.mock("../../services/location", () => ({
  getCidadeEmCache: jest.fn(() => "Santo Ângelo"),
  obterLocalizacaoECidadeRapida: jest.fn(() =>
    Promise.resolve({ lat: -28.298, lon: -54.263, cidade: "Santo Ângelo" }),
  ),
}));

describe("Componente e Parser: ImportarLoteModal", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("parseLinhasParaEntregas", () => {
    it("Deve sanitizar pontuações finais e separar rua, número e bairro", () => {
      const entrada = "Rua 31 de Dezembro, 193, Pippi.\nRua Gabriel Rodrigues, 80, Aliança;";
      const resultado = parseLinhasParaEntregas(entrada);

      expect(resultado).toHaveLength(2);
      expect(resultado[0].rua).toBe("Rua 31 de Dezembro");
      expect(resultado[0].numero).toBe("193");
      expect(resultado[0].bairro).toBe("Pippi");

      expect(resultado[1].rua).toBe("Rua Gabriel Rodrigues");
      expect(resultado[1].numero).toBe("80");
      expect(resultado[1].bairro).toBe("Aliança");
    });

    it("Deve extrair nome e telefone separados por traço", () => {
      const entrada = "Rua XV de Novembro, 1500 - Carlos Silva - 55999887766";
      const resultado = parseLinhasParaEntregas(entrada);

      expect(resultado).toHaveLength(1);
      expect(resultado[0].rua).toBe("Rua XV de Novembro");
      expect(resultado[0].numero).toBe("1500");
      expect(resultado[0].nomeDestinatario).toBe("Carlos Silva");
      expect(resultado[0].telefone).toBe("55999887766");
    });

    it("Deve ignorar linhas vazias e comentários com # ou //", () => {
      const entrada = "# Lista da Manhã\n// Não entregar agora\n\nRua Marechal, 200\n";
      const resultado = parseLinhasParaEntregas(entrada);

      expect(resultado).toHaveLength(1);
      expect(resultado[0].rua).toBe("Rua Marechal");
      expect(resultado[0].numero).toBe("200");
    });
  });

  describe("Renderização do Modal", () => {
    it("Deve renderizar o modal e exibir contador de endereços detectados", () => {
      const { getByPlaceholderText, getByText } = render(
        <ImportarLoteModal visivel={true} onFechar={jest.fn()} onImportadoComSucesso={jest.fn()} />,
      );

      expect(getByText("Importar Lista de Entregas")).toBeTruthy();

      const input = getByPlaceholderText(/Exemplo:/);
      fireEvent.changeText(input, "Rua A, 100\nRua B, 200");

      expect(getByText(/parada\(s\) detectada\(s\)/)).toBeTruthy();
    });

    it("Deve enviar o lote para a API ao clicar em Importar", async () => {
      const mockSucesso = jest.fn();
      const mockFechar = jest.fn();

      const { getByPlaceholderText, getByText } = render(
        <ImportarLoteModal visivel={true} onFechar={mockFechar} onImportadoComSucesso={mockSucesso} />,
      );

      const input = getByPlaceholderText(/Exemplo:/);
      fireEvent.changeText(input, "Rua A, 100\nRua B, 200");

      const btnImportar = getByText("Importar (2)");
      fireEvent.press(btnImportar);

      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith(
          "/entregas/lote",
          expect.objectContaining({
            cidadePadrao: "Santo Ângelo",
            entregas: expect.arrayContaining([
              expect.objectContaining({ rua: "Rua A", numero: "100" }),
              expect.objectContaining({ rua: "Rua B", numero: "200" }),
            ]),
          }),
        );
        expect(mockSucesso).toHaveBeenCalled();
        expect(mockFechar).toHaveBeenCalled();
      });
    });
  });
});
