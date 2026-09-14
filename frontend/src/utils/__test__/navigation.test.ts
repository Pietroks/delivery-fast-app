import { Alert, Linking } from "react-native";
import { abrirRotaGoogleMaps, calcularLotes } from "../navigation";

describe("Utilitário: navigation (abrirRotaGoogleMaps e calcularLotes)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Linking, "openURL").mockResolvedValue(true as any);
    jest.spyOn(Alert, "alert").mockImplementation(() => {});
  });

  test("Deve alertar se a lista de paradas estiver vazia", async () => {
    await abrirRotaGoogleMaps([]);
    expect(Alert.alert).toHaveBeenCalledWith("Atenção", "Nenhuma entrega cadastrada para iniciar a rota.");
    expect(Linking.openURL).not.toHaveBeenCalled();
  });

  test("Deve abrir rota direta para 1 entrega", async () => {
    await abrirRotaGoogleMaps([{ rua: "Rua A, 100" }]);
    expect(Linking.openURL).toHaveBeenCalledWith(expect.stringContaining("destination=Rua%20A%2C%20100"));
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

  test("Deve abrir o segundo lote quando loteIndex for 1", async () => {
    const dozeParadas = Array.from({ length: 12 }, (_, i) => ({
      rua: `Rua Teste, ${i + 1}`,
    }));

    await abrirRotaGoogleMaps(dozeParadas, 1);

    expect(Linking.openURL).toHaveBeenCalledWith(expect.stringContaining("destination=Rua%20Teste%2C%2012"));
  });

  test("Deve priorizar coordenadas lat,lon precisas quando disponíveis", async () => {
    await abrirRotaGoogleMaps([
      { rua: "Rua 1", lat: -28.298, lon: -54.263 },
      { rua: "Rua 2", lat: -28.299, lon: -54.264 },
    ]);

    expect(Linking.openURL).toHaveBeenCalledWith(
      expect.stringContaining("destination=-28.299,-54.264&travelmode=driving&waypoints=-28.298,-54.263"),
    );
  });
});
