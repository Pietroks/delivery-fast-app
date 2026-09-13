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
export const LIMITE_MAXIMO_PARADAS = 10; // 9 waypoints + 1 destino final

export function calcularLotes<T>(itens: T[], tamanhoLote: number = LIMITE_MAXIMO_PARADAS): T[][] {
  if (!itens || itens.length === 0) return [];
  const lotes: T[][] = [];
  for (let i = 0; i < itens.length; i += tamanhoLote) {
    lotes.push(itens.slice(i, i + tamanhoLote));
  }
  return lotes;
}

export async function abrirRotaGoogleMaps(paradas: ParadaNavegacao[], loteIndex: number = 0) {
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

    // Paginação de paradas por lotes de 10
    const todosLotes = calcularLotes(paradas, LIMITE_MAXIMO_PARADAS);
    const indexValido = Math.min(Math.max(loteIndex, 0), todosLotes.length - 1);
    const paradasParaNavegar = todosLotes[indexValido] || paradas.slice(0, LIMITE_MAXIMO_PARADAS);

    if (todosLotes.length > 1) {
      Alert.alert(
        "Lote de Entregas",
        `O Google Maps suporta até 10 paradas por vez. Traçando a rota do Lote ${indexValido + 1} de ${todosLotes.length} (${paradasParaNavegar.length} entregas).`,
      );
    }

    // Destino final = Último endereço deste lote
    const destinoFinal = codificarEndereco(paradasParaNavegar[paradasParaNavegar.length - 1].rua);

    // Waypoints = Todos os endereços do primeiro até o penúltimo deste lote
    const waypoints = paradasParaNavegar
      .slice(0, -1)
      .map((p) => codificarEndereco(p.rua))
      .filter((p): p is string => p !== null)
      .join("|");

    if (!destinoFinal) {
      Alert.alert("Erro", "Endereço de destino inválido.");
      return;
    }

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
