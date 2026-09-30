import React from "react";
import { render, fireEvent, waitFor, act } from "@testing-library/react-native";
import HomeScreen from "../HomeScreen";
import { api } from "../../services/api";
import * as navigationUtils from "../../utils/navigation";

const mockNavigate = jest.fn();

jest.mock("@react-navigation/native", () => {
  const React = require("react");
  return {
    useNavigation: () => ({
      navigate: mockNavigate,
    }),
    useFocusEffect: (cb: any) => {
      React.useEffect(() => {
        return cb();
      }, []);
    },
  };
});

jest.mock("../../contexts/AuthContext", () => ({
  useAuth: () => ({
    nomeUsuario: "Pietrok",
    usuario: { id: "user-123" },
  }),
}));

jest.mock("../../services/location", () => ({
  obterLocalizacaoECidadeRapida: jest.fn(() =>
    Promise.resolve({ lat: -28.298, lon: -54.263, cidade: "Santo Ângelo" }),
  ),
  getCidadeEmCache: jest.fn(() => "Santo Ângelo"),
}));

jest.mock("../../services/storage", () => ({
  carregarRotasLocalmente: jest.fn(() => Promise.resolve(null)),
  salvarRotasLocalmente: jest.fn(() => Promise.resolve()),
  carregarConfigPontoPartida: jest.fn(() => Promise.resolve({ tipo: "gps", retornarABase: false })),
  salvarConfigPontoPartida: jest.fn(() => Promise.resolve()),
}));

jest.mock("../../services/api", () => ({
  api: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
}));

jest.mock("react-native-safe-area-context", () => {
  const { View } = require("react-native");
  return {
    SafeAreaView: ({ children }: any) => <View>{children}</View>,
  };
});

describe("Tela: HomeScreen", () => {
  const mockParadas = [
    { id: "1", ordem: 1, rua: "Rua A, 100", lat: -28.298, lon: -54.263 },
    { id: "2", ordem: 2, rua: "Rua B, 200", lat: -28.299, lon: -54.264 },
  ];

  const mockResumo = {
    totalEntregas: 2,
    distanciaKm: 3.5,
    tempoEstimadoMin: 45,
    economiaEstimadaRs: 5.0,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (api.get as jest.Mock).mockResolvedValue({
      data: {
        sucesso: true,
        paradas: mockParadas,
        resumo: mockResumo,
      },
    });
  });

  it("Deve carregar as paradas e exibir o resumo da rota atual", async () => {
    const { getByText } = render(<HomeScreen />);

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith("/rotas/atual", expect.any(Object));
      expect(getByText("Rua A, 100")).toBeTruthy();
      expect(getByText("Rua B, 200")).toBeTruthy();
      expect(getByText(/3\.5/)).toBeTruthy();
      expect(getByText("45 min")).toBeTruthy();
    });
  });

  it("Deve acionar a otimização de rotas ao clicar em Otimizar", async () => {
    (api.post as jest.Mock).mockResolvedValueOnce({
      data: {
        sucesso: true,
        paradas: [mockParadas[1], mockParadas[0]],
      },
    });

    const { getByText } = render(<HomeScreen />);

    await waitFor(() => {
      expect(getByText("Otimizar Rota")).toBeTruthy();
    });

    fireEvent.press(getByText("Otimizar Rota"));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        "/rotas/otimizar",
        expect.objectContaining({
          latUsuario: -28.298,
          lonUsuario: -54.263,
        }),
      );
    });
  });

  it("Deve chamar abrirRotaGoogleMaps ao clicar no botão de iniciar GPS", async () => {
    const spyNavegar = jest
      .spyOn(navigationUtils, "abrirRotaGoogleMaps")
      .mockImplementation(() => Promise.resolve());

    const { getByText } = render(<HomeScreen />);

    await waitFor(() => {
      expect(getByText("Iniciar no GPS")).toBeTruthy();
    });

    fireEvent.press(getByText("Iniciar no GPS"));

    await waitFor(() => {
      expect(spyNavegar).toHaveBeenCalled();
    });
  });

  it("Deve abrir o modal de importação em lote ao clicar no botão Importar Lista", async () => {
    const { getByText } = render(<HomeScreen />);

    await waitFor(() => {
      expect(getByText("Importar")).toBeTruthy();
    });

    fireEvent.press(getByText("Importar"));

    await waitFor(() => {
      expect(getByText("Importar Lista de Entregas")).toBeTruthy();
    });
  });

  it("Deve exibir o Hero Onboarding Card quando não houver entregas ativas", async () => {
    (api.get as jest.Mock).mockResolvedValueOnce({
      data: {
        sucesso: true,
        paradas: [],
        resumo: null,
      },
    });

    const { getByText } = render(<HomeScreen />);

    await waitFor(() => {
      expect(getByText("Pronto para rodar?")).toBeTruthy();
      expect(getByText("IMPORTAR DO WHATSAPP")).toBeTruthy();
      expect(getByText("Adicionar Entrega Manual")).toBeTruthy();
    });
  });

  it("Deve abrir o modal educativo sobre lotes de 10 ao clicar no botão de ajuda", async () => {
    // 12 paradas geram mais de 1 lote (temVariosLotes = true)
    const mock12Paradas = Array.from({ length: 12 }, (_, i) => ({
      id: `p-${i}`,
      ordem: i + 1,
      rua: `Rua Teste, ${i * 10}`,
      lat: -28.298,
      lon: -54.263,
    }));

    (api.get as jest.Mock).mockResolvedValueOnce({
      data: {
        sucesso: true,
        paradas: mock12Paradas,
        resumo: mockResumo,
      },
    });

    const { getByLabelText, getByText } = render(<HomeScreen />);

    await waitFor(() => {
      expect(getByText("Lotes de Navegação")).toBeTruthy();
    });

    const botaoAjuda = getByLabelText("Entender divisão em lotes do Google Maps");
    fireEvent.press(botaoAjuda);

    expect(getByText("Por que dividir em lotes de 10?")).toBeTruthy();
    expect(getByText("ENTENDI, VAMOS RODAR!")).toBeTruthy();
  });

  it("Deve abrir o modal de configuração de ponto de partida e retorno ao clicar no botão do cabeçalho", async () => {
    const { getByLabelText, getByText } = render(<HomeScreen />);

    await waitFor(() => {
      expect(getByLabelText("Configurar ponto de partida e retorno à base")).toBeTruthy();
    });

    fireEvent.press(getByLabelText("Configurar ponto de partida e retorno à base"));

    await waitFor(() => {
      expect(getByText("Ponto de Partida e Retorno")).toBeTruthy();
      expect(getByText("Retorno à Base no Final")).toBeTruthy();
    });
  });
});
