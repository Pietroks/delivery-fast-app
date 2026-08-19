import AsyncStorage from "@react-native-async-storage/async-storage";
import { ResumoRotaData } from "../components/ResumoRotaCard";
import { Parada } from "../screens/HomeScreen";

const CHAVE_CACHE_ROTAS = "@delivery_fast:cache_rotas_v1";
const CHAVE_CACHE_RESUMO = "@delivery_fast:cache_resumo_v1";

interface CacheRotasData {
  paradas: Parada[];
  resumo: ResumoRotaData | null;
}

export async function salvarRotasLocalmente(paradas: Parada[], resumo: ResumoRotaData | null): Promise<void> {
  try {
    await AsyncStorage.multiSet([
      [CHAVE_CACHE_ROTAS, JSON.stringify(paradas)],
      [CHAVE_CACHE_RESUMO, JSON.stringify(resumo)],
    ]);
  } catch (error) {
    console.error("Erro ao salvar cache local de rotas:", error);
  }
}

export async function carregarRotasLocalmente(): Promise<CacheRotasData> {
  try {
    const [[, rotasSalvas], [, resumoSalvo]] = await AsyncStorage.multiGet([CHAVE_CACHE_ROTAS, CHAVE_CACHE_RESUMO]);

    return {
      paradas: rotasSalvas ? JSON.parse(rotasSalvas) : [],
      resumo: resumoSalvo ? JSON.parse(resumoSalvo) : null,
    };
  } catch (error) {
    console.error("Erro ao entregar cache total de rotas:", error);
    return { paradas: [], resumo: null };
  }
}
