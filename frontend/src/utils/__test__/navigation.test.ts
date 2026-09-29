import { Alert, Linking, Platform } from "react-native";
import { abrirRotaGoogleMaps, abrirNavegacaoIndividual, calcularLotes } from "../navigation";

describe("Utilitário: navigation (abrirRotaGoogleMaps, abrirNavegacaoIndividual e calcularLotes)", () => {
  const originalPlatform = Platform.OS;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Linking, "openURL").mockResolvedValue(true as any);
    jest.spyOn(Linking, "canOpenURL").mockResolvedValue(false as any);
    jest.spyOn(Alert, "alert").mockImplementation(() => {});
    Object.defineProperty(Platform, "OS", { value: "ios", configurable: true });
  });

  afterEach(() => {
    Object.defineProperty(Platform, "OS", { value: originalPlatform, configurable: true });
  });

  describe("abrirRotaGoogleMaps", () => {
    test("Deve alertar se a lista de paradas estiver vazia", async () => {
      await abrirRotaGoogleMaps([]);
      expect(Alert.alert).toHaveBeenCalledWith("Atenção", "Nenhuma entrega cadastrada para iniciar a rota.");
      expect(Linking.openURL).not.toHaveBeenCalled();
    });

    test("Deve abrir rota direta para 1 entrega com Current+Location por padrão", async () => {
      await abrirRotaGoogleMaps([{ rua: "Rua A, 100" }]);
      expect(Linking.openURL).toHaveBeenCalledWith(
        expect.stringContaining("origin=Current+Location&destination=Rua%20A%2C%20100"),
      );
    });

    test("Deve abrir rota direta para 1 entrega usando GPS do motorista como origin", async () => {
      await abrirRotaGoogleMaps([{ rua: "Rua A, 100" }], 0, { lat: -28.298, lon: -54.263 });
      expect(Linking.openURL).toHaveBeenCalledWith(
        expect.stringContaining("origin=-28.298,-54.263&destination=Rua%20A%2C%20100"),
      );
    });

    test("Deve limitar a 10 paradas e alertar caso a lista tenha mais de 10 entregas", async () => {
      const dozeParadas = Array.from({ length: 12 }, (_, i) => ({
        rua: `Rua Teste, ${i + 1}`,
      }));

      await abrirRotaGoogleMaps(dozeParadas);

      // Verifica se disparou o aviso do lote
      expect(Alert.alert).toHaveBeenCalledWith("Lote de Entregas", expect.stringContaining("suporta até 10 paradas"));

      // O destino final deve ser a 10ª parada (índice 9), ignorando a 11ª e 12ª
      expect(Linking.openURL).toHaveBeenCalledWith(expect.stringContaining("destination=Rua%20Teste%2C%2010"));
      expect(Linking.openURL).not.toHaveBeenCalledWith(expect.stringContaining("Rua%20Teste%2C%2011"));
    });

    test("Deve abrir o segundo lote quando loteIndex for 1", async () => {
      const dozeParadas = Array.from({ length: 12 }, (_, i) => ({
        rua: `Rua Teste, ${i + 1}`,
      }));

      await abrirRotaGoogleMaps(dozeParadas, 1);

      expect(Linking.openURL).toHaveBeenCalledWith(expect.stringContaining("destination=Rua%20Teste%2C%2012"));
    });

    test("Deve usar coordenadas quando rua não for informada", async () => {
      await abrirRotaGoogleMaps([
        { rua: "", lat: -28.298, lon: -54.263 },
        { rua: "", lat: -28.299, lon: -54.264 },
      ]);

      expect(Linking.openURL).toHaveBeenCalledWith(
        expect.stringContaining("destination=-28.299,-54.264&travelmode=driving&waypoints=-28.298,-54.263"),
      );
    });

    test("Deve codificar múltiplos waypoints com %7C e limpar sufixo de CEP", async () => {
      await abrirRotaGoogleMaps([
        { rua: "Rua Marquês do Herval, 90 - CEP: 98800-000" },
        { rua: "Mal. Floriano, 100 - CEP: 98800-111" },
        { rua: "Av. Brasil, 500" },
      ]);

      expect(Linking.openURL).toHaveBeenCalledWith(
        expect.stringContaining("destination=Av.%20Brasil%2C%20500&travelmode=driving&waypoints=Rua%20Marqu%C3%AAs%20do%20Herval%2C%2090%7CMal.%20Floriano%2C%20100"),
      );
    });
  });

  describe("abrirNavegacaoIndividual", () => {
    test("Deve alertar erro se a parada for nula ou endereço inválido", async () => {
      await abrirNavegacaoIndividual(null as any);
      expect(Alert.alert).toHaveBeenCalledWith("Erro", "Endereço de destino inválido.");
      expect(Linking.openURL).not.toHaveBeenCalled();

      jest.clearAllMocks();
      await abrirNavegacaoIndividual({ rua: "", lat: 0, lon: 0 });
      expect(Alert.alert).toHaveBeenCalledWith("Erro", "Endereço de destino inválido.");
      expect(Linking.openURL).not.toHaveBeenCalled();
    });

    test("Deve abrir URL universal direta quando em iOS ou fallback", async () => {
      await abrirNavegacaoIndividual({ rua: "Rua Bento Gonçalves, 300" });
      expect(Linking.openURL).toHaveBeenCalledWith(
        "https://www.google.com/maps/dir/?api=1&origin=Current+Location&destination=Rua%20Bento%20Gon%C3%A7alves%2C%20300&travelmode=driving",
      );
    });

    test("Deve utilizar GPS do usuário como origin quando fornecido", async () => {
      await abrirNavegacaoIndividual(
        { rua: "Rua Bento Gonçalves, 300" },
        { lat: -28.298, lon: -54.263 },
      );
      expect(Linking.openURL).toHaveBeenCalledWith(
        "https://www.google.com/maps/dir/?api=1&origin=-28.298,-54.263&destination=Rua%20Bento%20Gon%C3%A7alves%2C%20300&travelmode=driving",
      );
    });

    test("Deve acionar Intent nativo do Android quando disponível", async () => {
      Object.defineProperty(Platform, "OS", { value: "android", configurable: true });
      jest.spyOn(Linking, "canOpenURL").mockResolvedValue(true as any);

      await abrirNavegacaoIndividual({ rua: "Av. Brasil, 1500", lat: -28.301, lon: -54.27 });

      expect(Linking.canOpenURL).toHaveBeenCalledWith("google.navigation:q=-28.301,-54.27&mode=d");
      expect(Linking.openURL).toHaveBeenCalledWith("google.navigation:q=-28.301,-54.27&mode=d");
    });

    test("Deve fazer fallback para URL universal no Android se Intent não for suportado", async () => {
      Object.defineProperty(Platform, "OS", { value: "android", configurable: true });
      jest.spyOn(Linking, "canOpenURL").mockResolvedValue(false as any);

      await abrirNavegacaoIndividual({ rua: "Av. Brasil, 1500", lat: -28.301, lon: -54.27 });

      expect(Linking.openURL).toHaveBeenCalledWith(
        "https://www.google.com/maps/dir/?api=1&origin=Current+Location&destination=-28.301,-54.27&travelmode=driving",
      );
    });
  });

  describe("calcularLotes", () => {
    test("Deve calcular lotes corretamente com tamanho padrão de 10", () => {
      const vinteECinco = Array.from({ length: 25 }, (_, i) => ({
        rua: `Rua ${i + 1}`,
      }));
      const lotes = calcularLotes(vinteECinco);
      expect(lotes).toHaveLength(3);
      expect(lotes[0]).toHaveLength(10);
      expect(lotes[1]).toHaveLength(10);
      expect(lotes[2]).toHaveLength(5);
    });

    test("Deve retornar array vazio para lista nula ou vazia", () => {
      expect(calcularLotes([])).toEqual([]);
      expect(calcularLotes(null as any)).toEqual([]);
    });
  });
});
