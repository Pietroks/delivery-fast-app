import axios from "axios";

interface Coordenada {
  lat: number;
  lon: number;
  enderecoFormatado: string;
}

export async function geocodificarEndereco(endereco: string): Promise<Coordenada> {
  try {
    const params: any = {
      q: endereco,
      format: "json",
      limit: 1,
      countrycodes: "br",
    };

    let response = await axios.get("https://nominatim.openstreetmap.org/search", {
      params,
      headers: {
        "User-Agent": "MeuAppDeRotasMVP/1.0",
      },
    });

    // Fallback: Se não achou com o número/complemento, remove números/vírgulas finais e tenta buscar só a rua
    if (!response.data || response.data.length === 0) {
      const enderecoSemNumero = endereco
        .replace(/,\s*Nº?\s*\d+.*$/i, "")
        .replace(/,\s*\d+.*$/, "")
        .trim();

      response = await axios.get("https://nominatim.openstreetmap.org/search", {
        params: { ...params, q: enderecoSemNumero },
        headers: {
          "User-Agent": "MeuAppDeRotasMVP/1.0",
        },
      });
    }

    if (!response.data || response.data.length === 0) {
      throw new Error(`Endereço não encontrado: ${endereco}`);
    }

    const resultado = response.data[0];
    return {
      lat: parseFloat(resultado.lat),
      lon: parseFloat(resultado.lon),
      enderecoFormatado: resultado.display_name,
    };
  } catch (error) {
    throw new Error(`Erro ao buscar endereço "${endereco}": ${(error as Error).message}`);
  }
}
