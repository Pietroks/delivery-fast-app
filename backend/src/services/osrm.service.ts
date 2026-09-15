import axios from "axios";

export interface PontoRota {
  id?: string;
  lat: number;
  lon: number;
  enderecoOriginal: string;
}

const CONSUMO_MEDIO_KM_L = 10;
const PRECO_COMBUSTIVEL = 5.8;

export function calcularDistanciaHaversineMetros(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3;
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function resolverTspLocal(pontos: PontoRota[]): PontoRota[] {
  if (pontos.length <= 2) return [...pontos];

  // Nearest Neighbor partindo do ponto inicial (localização do motorista ou 1ª entrega)
  const rota: PontoRota[] = [pontos[0]];
  const naoVisitados = pontos.slice(1);

  while (naoVisitados.length > 0) {
    const ultimo = rota[rota.length - 1];
    let menorDist = Infinity;
    let melhorIdx = 0;

    for (let i = 0; i < naoVisitados.length; i++) {
      const dist = calcularDistanciaHaversineMetros(ultimo.lat, ultimo.lon, naoVisitados[i].lat, naoVisitados[i].lon);
      if (dist < menorDist) {
        menorDist = dist;
        melhorIdx = i;
      }
    }

    rota.push(naoVisitados[melhorIdx]);
    naoVisitados.splice(melhorIdx, 1);
  }

  // Refinamento 2-Opt mantendo o ponto inicial fixo
  let melhorou = true;
  let iteracoes = 0;
  while (melhorou && iteracoes < 40) {
    melhorou = false;
    iteracoes++;

    for (let i = 1; i < rota.length - 1; i++) {
      for (let k = i + 1; k < rota.length; k++) {
        const dAtual =
          calcularDistanciaHaversineMetros(rota[i - 1].lat, rota[i - 1].lon, rota[i].lat, rota[i].lon) +
          (k + 1 < rota.length
            ? calcularDistanciaHaversineMetros(rota[k].lat, rota[k].lon, rota[k + 1].lat, rota[k + 1].lon)
            : 0);

        const dNova =
          calcularDistanciaHaversineMetros(rota[i - 1].lat, rota[i - 1].lon, rota[k].lat, rota[k].lon) +
          (k + 1 < rota.length
            ? calcularDistanciaHaversineMetros(rota[i].lat, rota[i].lon, rota[k + 1].lat, rota[k + 1].lon)
            : 0);

        if (dNova < dAtual - 5) {
          const segmento = rota.slice(i, k + 1).reverse();
          rota.splice(i, segmento.length, ...segmento);
          melhorou = true;
        }
      }
    }
  }

  return rota;
}

export async function otimizarSequencia(pontos: PontoRota[]) {
  if (!pontos || pontos.length === 0) {
    return [];
  }

  // Filtra apenas pontos com coordenadas geográficas válidas (evita Null Island 0,0)
  const pontosValidos = pontos.filter(
    (p) => p.lat !== 0 && p.lon !== 0 && !isNaN(p.lat) && !isNaN(p.lon),
  );
  const pontosSemCoords = pontos.filter(
    (p) => p.lat === 0 || p.lon === 0 || isNaN(p.lat) || isNaN(p.lon),
  );

  if (pontosValidos.length <= 1) {
    return pontos.map((ponto, index) => ({
      ordem: index + 1,
      id: ponto.id,
      endereco: ponto.enderecoOriginal,
      lat: ponto.lat,
      lon: ponto.lon,
    }));
  }

  // Tenta otimizar via OSRM com timeout rápido (3.5s)
  let pontosOrdenados: any[] | null = null;

  try {
    const coordenadasString = pontosValidos.map((ponto) => `${ponto.lon},${ponto.lat}`).join(";");
    const url = `https://router.project-osrm.org/trip/v1/driving/${coordenadasString}`;

    const response = await axios.get(url, {
      params: {
        source: "first",
        roundtrip: false,
      },
      headers: {
        "User-Agent": "DeliveryFastApp/1.0",
      },
      timeout: 3500,
    });

    if (response.data && response.data.code === "Ok" && Array.isArray(response.data.waypoints)) {
      const waypoints = response.data.waypoints;
      pontosOrdenados = waypoints
        .map((wp: any, indexOriginal: number) => ({
          ordemCalculada: wp.waypoint_index ?? indexOriginal,
          pontoOriginal: pontosValidos[indexOriginal],
        }))
        .sort((a: any, b: any) => a.ordemCalculada - b.ordemCalculada)
        .map((item: any, index: number) => ({
          ordem: index + 1,
          id: item.pontoOriginal?.id,
          endereco: item.pontoOriginal?.enderecoOriginal,
          lat: item.pontoOriginal?.lat,
          lon: item.pontoOriginal?.lon,
        }));
    }
  } catch {
    // Silencia erro do OSRM para acionar o algoritmo de fallback local abaixo
    pontosOrdenados = null;
  }

  // Fallback seguro: se OSRM falhar, der timeout ou retornar inválido, usa Nearest Neighbor + 2-Opt local
  if (!pontosOrdenados || pontosOrdenados.length === 0) {
    const resolvidoLocal = resolverTspLocal(pontosValidos);
    pontosOrdenados = resolvidoLocal.map((item, index) => ({
      ordem: index + 1,
      id: item.id,
      endereco: item.enderecoOriginal,
      lat: item.lat,
      lon: item.lon,
    }));
  }

  // Anexa pontos sem coordenadas ao final da rota
  if (pontosSemCoords.length > 0) {
    let proximaOrdem = pontosOrdenados.length + 1;
    for (const semCoord of pontosSemCoords) {
      pontosOrdenados.push({
        ordem: proximaOrdem++,
        id: semCoord.id,
        endereco: semCoord.enderecoOriginal,
        lat: semCoord.lat,
        lon: semCoord.lon,
      });
    }
  }

  return pontosOrdenados;
}

export function calcularMetricas(distanciaMetros: number, tempoSegundos: number) {
  const distanciaKm = distanciaMetros / 1000;
  const tempoMinutos = Math.round(tempoSegundos / 60);

  const custoEstimado = (distanciaKm / CONSUMO_MEDIO_KM_L) * PRECO_COMBUSTIVEL;

  return {
    distanciaKm: distanciaKm.toFixed(1),
    tempoFormatado: `${Math.floor(tempoMinutos / 60)}h ${tempoMinutos % 60}m`,
    custoEstimado: custoEstimado.toFixed(2),
  };
}
