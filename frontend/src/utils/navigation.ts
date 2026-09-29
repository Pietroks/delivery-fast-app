import { Linking, Platform } from "react-native";
import { alertaApp } from "../contexts/AlertContext";

export interface ParadaNavegacao {
  rua: string;
  lat?: number;
  lon?: number;
}

export function limparEnderecoParaMaps(endereco?: string): string {
  if (!endereco) return "";
  // Remove sufixos como "- CEP: 98800-000" para otimizar a busca no Google Maps
  return endereco.replace(/\s*-\s*CEP:?\s*[\d.-]+/gi, "").trim();
}

export function formatarPontoMaps(parada: ParadaNavegacao): string | null {
  if (
    parada.lat !== undefined &&
    parada.lon !== undefined &&
    parada.lat !== 0 &&
    parada.lon !== 0 &&
    !isNaN(parada.lat) &&
    !isNaN(parada.lon)
  ) {
    return `${parada.lat},${parada.lon}`;
  }
  const enderecoLimpo = limparEnderecoParaMaps(parada.rua);
  if (enderecoLimpo.length > 0) {
    return encodeURIComponent(enderecoLimpo);
  }
  return null;
}

/**
 * Abre o Google Maps traçando a rota partindo SEMPRE da localização atual do usuário (GPS)
 * cobrindo todas as entregas em sequência.
 */
export const LIMITE_MAXIMO_PARADAS = 10; // 9 waypoints + 1 destino final

export function calcularLotes<T>(itens: T[], tamanhoLote: number = LIMITE_MAXIMO_PARADAS): T[][] {
  if (!itens || itens.length === 0) return [];
  const lotes: T[][] = [];
  for (let i = 0; i < itens.length; i += tamanhoLote) {
    lotes.push(itens.slice(i, i + tamanhoLote));
  }
  return lotes;
}

export async function abrirRotaGoogleMaps(
  paradas: ParadaNavegacao[],
  loteIndex: number = 0,
  gpsUsuario?: { lat?: number; lon?: number },
) {
  if (!paradas || paradas.length === 0) {
    alertaApp("Atenção", "Nenhuma entrega cadastrada para iniciar a rota.");
    return;
  }

  try {
    const origemParam =
      gpsUsuario?.lat && gpsUsuario?.lon ? `${gpsUsuario.lat},${gpsUsuario.lon}` : "Current+Location";

    // 1 única entrega: Sua Localização Atual ➔ Entrega 1
    if (paradas.length === 1) {
      const destinoCodificado = formatarPontoMaps(paradas[0]);
      if (!destinoCodificado) return;

      // No Android físico, tenta o Intent nativo do app Google Maps em modo navegação curva a curva
      if (Platform.OS === "android") {
        const intentNativo = `google.navigation:q=${destinoCodificado}&mode=d`;
        const suportaNativo = await Linking.canOpenURL(intentNativo).catch(() => false);
        if (suportaNativo) {
          await Linking.openURL(intentNativo);
          return;
        }
      }

      const urlRotaDireta = `https://www.google.com/maps/dir/?api=1&origin=${origemParam}&destination=${destinoCodificado}&travelmode=driving`;
      await Linking.openURL(urlRotaDireta);
      return;
    }

    // Paginação de paradas por lotes de 10
    const todosLotes = calcularLotes(paradas, LIMITE_MAXIMO_PARADAS);
    const indexValido = Math.min(Math.max(loteIndex, 0), todosLotes.length - 1);
    const paradasParaNavegar = todosLotes[indexValido] || paradas.slice(0, LIMITE_MAXIMO_PARADAS);

    if (todosLotes.length > 1) {
      alertaApp(
        "Lote de Entregas",
        `O Google Maps suporta até 10 paradas por vez. Traçando a rota do Lote ${indexValido + 1} de ${todosLotes.length} (${paradasParaNavegar.length} entregas).`,
      );
    }

    // Destino final = Último endereço deste lote
    const destinoFinal = formatarPontoMaps(paradasParaNavegar[paradasParaNavegar.length - 1]);

    // Waypoints = Todos os endereços do primeiro até o penúltimo deste lote
    // Usamos %7C (pipe URL-encoded) para compatibilidade garantida com o parser de Intents do Android
    const waypoints = paradasParaNavegar
      .slice(0, -1)
      .map((p) => formatarPontoMaps(p))
      .filter((p): p is string => p !== null)
      .join("%7C");

    if (!destinoFinal) {
      alertaApp("Erro", "Endereço de destino inválido.");
      return;
    }

    let urlRota = `https://www.google.com/maps/dir/?api=1&origin=${origemParam}&destination=${destinoFinal}&travelmode=driving`;

    if (waypoints.length > 0) {
      urlRota += `&waypoints=${waypoints}`;
    }

    await Linking.openURL(urlRota);
  } catch (error: unknown) {
    const mensagem = error instanceof Error ? error.message : "Não foi possível abrir o Google Maps.";
    alertaApp("Erro", mensagem);
  }
}
