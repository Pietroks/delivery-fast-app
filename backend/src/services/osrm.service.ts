import axios from "axios";

interface PontoRota {
  lat: number;
  lon: number;
  enderecoOriginal: string;
}

const CONSUMO_MEDIO_KM_L = 10;
const PRECO_COMBUSTIVEL = 5.8;

export async function otimizarSequencia(pontos: PontoRota[]) {
  try {
    const coordenadasString = pontos.map((ponto) => `${ponto.lon},${ponto.lat}`).join(";");

    const url = `https://router.project-osrm.org/trip/v1/driving/${coordenadasString}`;

    const response = await axios.get(url, {
      params: {
        source: "first",
        roundtrip: false,
      },
      headers: {
        "User-Agent": "DeliveryFastApp/1.0",
      },
      timeout: 5000,
    });

    if (response.data.code !== "Ok") {
      throw new Error(`Falha ao calcular rota no OSRM.`);
    }

    const waypoints = response.data.waypoints;

    const pontosOrdenados = waypoints
      .map((wp: any, indexOriginal: number) => ({
        ordemCalculada: wp.waypoint_index,
        pontoOriginal: pontos[indexOriginal],
      }))
      .sort((a: any, b: any) => a.ordemCalculada - b.ordemCalculada)
      .map((item: any, index: number) => ({
        ordem: index + 1,
        endereco: item.pontoOriginal?.enderecoOriginal,
        lat: item.pontoOriginal?.lat,
        lon: item.pontoOriginal?.lon,
      }));

    return pontosOrdenados;
  } catch (error) {
    throw new Error(`Erro na otimização da rota: ${(error as Error).message}`);
  }
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
