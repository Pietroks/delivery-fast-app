import React, { useMemo } from "react";
import { Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export interface ResumoRotaData {
  totalEntregas: number;
  distanciaKm: number;
  tempoEstimadoMin: number;
  economiaEstimadaRs: number;
}

interface ResumoRotaCardProps {
  resumo: ResumoRotaData | null;
  fallbackTotalEntregas: number;
  isOffline?: boolean;
  gpsAtivo?: boolean;
}

export const ResumoRotaCard: React.FC<ResumoRotaCardProps> = React.memo(
  ({ resumo, fallbackTotalEntregas, isOffline = false, gpsAtivo = true }) => {
    const totalEntregas = useMemo(
      () => resumo?.totalEntregas ?? fallbackTotalEntregas,
      [resumo?.totalEntregas, fallbackTotalEntregas],
    );

    const distanciaTotal = useMemo(() => resumo?.distanciaKm ?? 0, [resumo?.distanciaKm]);

    const tempoEstimado = useMemo(() => {
      if (!resumo?.tempoEstimadoMin) return "0 min";
      const h = Math.floor(resumo.tempoEstimadoMin / 60);
      const m = resumo.tempoEstimadoMin % 60;
      if (h === 0) return `${m} min`;
      return m > 0 ? `${h}h ${m}m` : `${h}h`;
    }, [resumo?.tempoEstimadoMin]);

    const economiaEstimada = useMemo(() => resumo?.economiaEstimadaRs ?? 0, [resumo?.economiaEstimadaRs]);

    return (
      <View className="bg-[#152033] p-4 rounded-xl border border-[#22334f] mb-3">
        {/* Cabeçalho de Telemetria com Status Operacional do Cockpit */}
        <View className="flex-row items-center justify-between mb-3">
          <View className="flex-row items-center">
            <Text className="text-[#94a3b8] text-xs font-bold uppercase tracking-wider mr-2">Resumo da Rota</Text>
            <View className="bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
              <Text className="text-emerald-400 text-[10px] font-semibold">Hoje</Text>
            </View>
          </View>

          {/* Indicador de Status do Sistema (GPS & Conectividade) */}
          {isOffline ? (
            <View className="bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/30 flex-row items-center">
              <Ionicons name="cloud-offline-outline" size={11} color="#f59e0b" style={{ marginRight: 4 }} />
              <Text className="text-amber-400 text-[10px] font-bold">Offline (Salvo Local)</Text>
            </View>
          ) : (
            <View className="bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20 flex-row items-center">
              <View className="w-1.5 h-1.5 rounded-full bg-[#22c55e] mr-1.5" />
              <Text className="text-emerald-400 text-[10px] font-bold">GPS Ativo • Sincronizado</Text>
            </View>
          )}
        </View>

        {/* Métricas Principais com Alta Legibilidade Solar (Números de 20-22px) */}
        <View className="flex-row justify-between items-center py-1">
          <View className="items-center flex-1">
            <Text className="text-white font-black text-xl" maxFontSizeMultiplier={1.3}>
              {totalEntregas}
            </Text>
            <Text className="text-[#94a3b8] text-[11px] font-medium mt-0.5">entregas</Text>
          </View>

          <View className="w-[1px] h-9 bg-[#22334f]" />

          <View className="items-center flex-1">
            <Text className="text-white font-black text-xl" maxFontSizeMultiplier={1.3}>
              {distanciaTotal} km
            </Text>
            <Text className="text-[#94a3b8] text-[11px] font-medium mt-0.5">distância</Text>
          </View>

          <View className="w-[1px] h-9 bg-[#22334f]" />

          <View className="items-center flex-1">
            <Text className="text-white font-black text-xl" maxFontSizeMultiplier={1.3}>
              {tempoEstimado}
            </Text>
            <Text className="text-[#94a3b8] text-[11px] font-medium mt-0.5">tempo est.</Text>
          </View>

          <View className="w-[1px] h-9 bg-[#22334f]" />

          <View className="items-center flex-1">
            <Text className="text-emerald-400 font-black text-xl" maxFontSizeMultiplier={1.3}>
              R$ {economiaEstimada.toFixed(2).replace(".", ",")}
            </Text>
            <Text className="text-[#94a3b8] text-[11px] font-medium mt-0.5">combustível</Text>
          </View>
        </View>
      </View>
    );
  },
);

ResumoRotaCard.displayName = "ResumoRotaCard";
