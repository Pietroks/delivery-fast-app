import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import HistoricoScreen, { extrairDadosComprovante } from "../HistoricoScreen";
import { api } from "../../services/api";

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockCanGoBack = jest.fn(() => false);

jest.mock("@react-navigation/native", () => {
  const React = require("react");
  return {
    useNavigation: () => ({
      navigate: mockNavigate,
      goBack: mockGoBack,
      canGoBack: mockCanGoBack,
    }),
    useFocusEffect: (cb: any) => {
      React.useEffect(() => {
        return cb();
      }, []);
    },
  };
});

jest.mock("@expo/vector-icons", () => ({
  Feather: "Feather",
  Ionicons: "Ionicons",
}));

jest.mock("../../services/api", () => ({
  api: {
    get: jest.fn(),
  },
}));

jest.mock("react-native-safe-area-context", () => {
  const { View } = require("react-native");
  return {
    SafeAreaView: ({ children }: any) => <View>{children}</View>,
  };
});

describe("Tela: HistoricoScreen e Utilitário extrairDadosComprovante", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("extrairDadosComprovante", () => {
    it("Deve extrair dados de comprovante diretamente dos campos do objeto", () => {
      const item = {
        id: "1",
        rua: "Rua A",
        foto_comprovante: "data:image/jpeg;base64,abc",
        documento_recebedor: "123.456.789-00",
        nome_destinatario: "Maria",
      };

      const res = extrairDadosComprovante(item);
      expect(res.foto).toBe("data:image/jpeg;base64,abc");
      expect(res.doc).toBe("123.456.789-00");
      expect(res.recebedor).toBe("Maria");
    });

    it("Deve extrair dados embutidos no campo referencia", () => {
      const item = {
        id: "2",
        rua: "Rua B",
        referencia: 'Comprovante: {"recebidoPor":"João","documentoRecebedor":"987.654.321-11","motivoInsucesso":"Entregue portaria"}',
      };

      const res = extrairDadosComprovante(item);
      expect(res.recebedor).toBe("João");
      expect(res.doc).toBe("987.654.321-11");
      expect(res.motivo).toBe("Entregue portaria");
    });

    it("Deve retornar valores nulos ao receber item nulo", () => {
      const res = extrairDadosComprovante(null);
      expect(res.foto).toBeNull();
      expect(res.doc).toBeNull();
      expect(res.recebedor).toBeNull();
    });
  });

  describe("Renderização da Tela de Histórico", () => {
    const mockHistorico = [
      {
        id: "h-1",
        rua: "Rua Marechal Floriano, 500",
        bairro: "Centro",
        nome_destinatario: "Carlos Eduardo",
        documento_recebedor: "111.222.333-44",
        foto_comprovante: "data:image/jpeg;base64,foto123",
        updated_at: new Date().toISOString(),
      },
    ];

    it("Deve carregar e exibir a lista de entregas concluídas", async () => {
      (api.get as jest.Mock).mockResolvedValueOnce({
        data: { sucesso: true, entregas: mockHistorico },
      });

      const { getByText } = render(<HistoricoScreen />);

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith("/entregas/historico-hoje");
        expect(getByText("Rua Marechal Floriano, 500")).toBeTruthy();
        expect(getByText(/Carlos Eduardo/)).toBeTruthy();
      });
    });

    it("Deve abrir o modal de comprovante detalhado ao clicar no item", async () => {
      (api.get as jest.Mock).mockResolvedValueOnce({
        data: { sucesso: true, entregas: mockHistorico },
      });

      const { getByText } = render(<HistoricoScreen />);

      await waitFor(() => {
        expect(getByText("Rua Marechal Floriano, 500")).toBeTruthy();
      });

      fireEvent.press(getByText("Rua Marechal Floriano, 500"));

      await waitFor(() => {
        expect(getByText("Comprovante de Entrega")).toBeTruthy();
        expect(getByText("Confirmação de recebimento registrada")).toBeTruthy();
      });
    });

    it("Deve exibir estado vazio quando não houver entregas concluídas", async () => {
      (api.get as jest.Mock).mockResolvedValueOnce({
        data: { sucesso: true, entregas: [] },
      });

      const { getByText } = render(<HistoricoScreen />);

      await waitFor(() => {
        expect(getByText("Nenhuma entrega concluída até o momento.")).toBeTruthy();
      });
    });
  });
});
