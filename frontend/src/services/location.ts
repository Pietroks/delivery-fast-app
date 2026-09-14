import * as Location from "expo-location";

interface CacheLocalizacao {
  lat: number;
  lon: number;
  cidade: string;
  timestamp: number;
}

let cacheLocalizacao: CacheLocalizacao | null = null;
const CACHE_MAX_AGE_MS = 5 * 60 * 1000;

export function getCidadeEmCache(): string {
  if (cacheLocalizacao && Date.now() - cacheLocalizacao.timestamp < CACHE_MAX_AGE_MS) {
    return cacheLocalizacao.cidade;
  }
  return cacheLocalizacao?.cidade || "";
}

export function setCidadeEmCache(cidade: string) {
  if (cacheLocalizacao) {
    cacheLocalizacao.cidade = cidade;
    cacheLocalizacao.timestamp = Date.now();
  } else {
    cacheLocalizacao = {
      lat: 0,
      lon: 0,
      cidade,
      timestamp: Date.now(),
    };
  }
}

export async function obterLocalizacaoECidadeRapida(): Promise<{
  lat?: number;
  lon?: number;
  cidade?: string;
}> {
  if (cacheLocalizacao && Date.now() - cacheLocalizacao.timestamp < 60 * 1000 && cacheLocalizacao.lat !== 0) {
    return {
      lat: cacheLocalizacao.lat,
      lon: cacheLocalizacao.lon,
      cidade: cacheLocalizacao.cidade,
    };
  }

  try {
    let permissao = await Location.getForegroundPermissionsAsync();
    if (permissao.status !== "granted") {
      permissao = await Location.requestForegroundPermissionsAsync();
    }
    if (permissao.status !== "granted") {
      return { cidade: cacheLocalizacao?.cidade };
    }

    let loc = await Location.getLastKnownPositionAsync();

    if (!loc) {
      const obterPosicaoComTimeout = Promise.race([
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low }),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 2500)),
      ]);
      loc = await obterPosicaoComTimeout;
    }

    if (!loc?.coords) {
      return { cidade: cacheLocalizacao?.cidade };
    }

    const { latitude, longitude } = loc.coords;
    let nomeCidade = cacheLocalizacao?.cidade || "";

    if (!nomeCidade) {
      try {
        const [endereco] = await Location.reverseGeocodeAsync({
          latitude,
          longitude,
        });

        if (endereco?.city || endereco?.subregion || endereco?.district) {
          nomeCidade = endereco.city || endereco.subregion || endereco.district || "";
        }
      } catch {}
    }

    cacheLocalizacao = {
      lat: latitude,
      lon: longitude,
      cidade: nomeCidade,
      timestamp: Date.now(),
    };

    return {
      lat: latitude,
      lon: longitude,
      cidade: nomeCidade,
    };
  } catch {
    return { cidade: cacheLocalizacao?.cidade };
  }
}
