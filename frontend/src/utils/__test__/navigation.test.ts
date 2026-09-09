import { Alert, Linking } from "react-native";
import { abrirRotaGoogleMaps } from "../navigation";

describe("Utilitário: navigation (abrirRotaGoogleMaps)", () => {
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
});
