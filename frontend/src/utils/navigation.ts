import { Linking, Alert } from "react-native";

interface ParadaNavegacao {
  rua: string;
  lat?: number;
  lon?: number;
}

function codificarEndereco(endereco?: string): string | null {
  const limpo = endereco?.trim();
  return limpo && limpo.length > 0 ? encodeURIComponent(limpo) : null;
}

/**
 * Abre o Google Maps traçando a rota partindo SEMPRE da localização atual do usuário (GPS)
 * cobrindo todas as entregas em sequência.
 */
export async function abrirRotaGoogleMaps(paradas: ParadaNavegacao[]) {
  if (!paradas || paradas.length === 0) {
    Alert.alert("Atenção", "Nenhuma entrega cadastrada para iniciar a rota.");
    return;
  }

  try {
    // 1 única entrega: Sua Localização Atual ➔ Entrega 1
    if (paradas.length === 1) {
      const destinoCodificado = codificarEndereco(paradas[0].rua);
      if (!destinoCodificado) return;

      const urlRotaDireta = `https://www.google.com/maps/dir/?api=1&destination=${destinoCodificado}&travelmode=driving`;
      await Linking.openURL(urlRotaDireta);
      return;
    }

    // 2 ou mais entregas:
    // Destino final = Último endereço da lista
    const destinoFinal = codificarEndereco(paradas[paradas.length - 1].rua);

    // Waypoints = Todos os endereços do primeiro até o penúltimo
    const waypoints = paradas
      .slice(0, -1)
      .map((p) => codificarEndereco(p.rua))
      .filter((p): p is string => p !== null)
      .join("|");

    if (!destinoFinal) {
      Alert.alert("Erro", "Endereço de destino inválido.");
      return;
    }

    // Omitindo 'origin', o Google Maps usa o GPS atual do dispositivo como Ponto de Partida!
    let urlRota = `https://www.google.com/maps/dir/?api=1&destination=${destinoFinal}&travelmode=driving`;

    if (waypoints.length > 0) {
      urlRota += `&waypoints=${waypoints}`;
    }

    await Linking.openURL(urlRota);
  } catch (error: unknown) {
    const mensagem = error instanceof Error ? error.message : "Não foi possível abrir o Google Maps.";
    Alert.alert("Erro", mensagem);
  }
}
