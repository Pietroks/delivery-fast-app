import { buscarEnderecoPorCep } from "../cep";

describe("Serviço: buscarEnderecoPorCep", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("Retorna null se o CEP tiver menos de 8 dígitos", async () => {
    const res = await buscarEnderecoPorCep("123");
    expect(res).toBeNull();
  });

  it("Deve consultar BrasilAPI e retornar dados com coordenadas", async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        street: "Rua Marquês do Herval",
        neighborhood: "Centro",
        city: "Santo Ângelo",
        location: {
          coordinates: {
            latitude: -28.298,
            longitude: -54.263,
          },
        },
      }),
    } as any);

    const res = await buscarEnderecoPorCep("98800000");
    expect(res).toEqual({
      rua: "Rua Marquês do Herval",
      bairro: "Centro",
      cidade: "Santo Ângelo",
      lat: -28.298,
      lon: -54.263,
    });
  });

  it("Deve recorrer ao ViaCEP quando BrasilAPI falhar", async () => {
    global.fetch = jest
      .fn()
      .mockRejectedValueOnce(new Error("Network error")) // BrasilAPI falha
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          logradouro: "Avenida Brasil",
          bairro: "Centro",
          localidade: "Santo Ângelo",
        }),
      } as any);

    const res = await buscarEnderecoPorCep("98800-000");
    expect(res).toEqual({
      rua: "Avenida Brasil",
      bairro: "Centro",
      cidade: "Santo Ângelo",
      lat: undefined,
      lon: undefined,
    });
  });
});
