export interface EnderecoCepResultado {
  rua?: string;
  bairro?: string;
  cidade?: string;
  lat?: number;
  lon?: number;
}

/**
 * Consulta CEP em serviços públicos brasileiros resilientes.
 * 1. BrasilAPI v2 (retorna coordenadas de alta precisão via CEP geocodificado)
 * 2. ViaCEP (fallback consagrado para logradouro, bairro e cidade)
 */
export async function buscarEnderecoPorCep(cep: string): Promise<EnderecoCepResultado | null> {
  const limpo = (cep || "").replace(/\D/g, "");
  if (limpo.length !== 8) return null;

  // 1. BrasilAPI v2
  try {
    const resposta = await fetch(`https://brasilapi.com.br/api/cep/v2/${limpo}`);
    if (resposta.ok) {
      const dados = await resposta.json();
      const lat = dados.location?.coordinates?.latitude;
      const lon = dados.location?.coordinates?.longitude;
      return {
        rua: dados.street || "",
        bairro: dados.neighborhood || "",
        cidade: dados.city || "",
        lat: lat ? Number(lat) : undefined,
        lon: lon ? Number(lon) : undefined,
      };
    }
  } catch {}

  // 2. Fallback ViaCEP
  try {
    const resposta = await fetch(`https://viacep.com.br/ws/${limpo}/json/`);
    if (resposta.ok) {
      const dados = await resposta.json();
      if (!dados.erro) {
        return {
          rua: dados.logradouro || "",
          bairro: dados.bairro || "",
          cidade: dados.localidade || "",
        };
      }
    }
  } catch {}

  return null;
}
