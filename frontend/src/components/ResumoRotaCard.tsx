import React, { useMemo } from "react";
import { Text, View } from "react-native";

export interface ResumoRotaData {
  totalEntragas: number;
  distanciaKm: number;
  tempoEstimadoMin: number;
  economiaEstimadaRs: number;
}

interface ResumoRotaCardProps {
  resumo: ResumoRotaData | null;
  fallbackTotalEntregas: number;
}

export const ResumoRotaCard: React.FC<ResumoRotaCardProps> = React.memo(({ resumo, fallbackTotalEntregas }) => {
  const totalEntregas = useMemo(() => resumo?.totalEntragas ?? fallbackTotalEntregas, [resumo?.totalEntragas, fallbackTotalEntregas]);

  const distanciaTotal = useMemo(() => resumo?.distanciaKm ?? 0, [resumo?.distanciaKm]);

  const tempoEstimado = useMemo(() => {
    if (!resumo?.tempoEstimadoMin) return "0h 0m";
    const h = Math.floor(resumo.tempoEstimadoMin / 60);
    const m = resumo.tempoEstimadoMin % 60;
    return `${h}h ${m}m`;
  }, [resumo?.tempoEstimadoMin]);

  const economiaEstimada = useMemo(() => resumo?.economiaEstimadaRs ?? 0, [resumo?.economiaEstimadaRs]);

  return (
    <View className="bg-emerald-900 p-4 rounded-2xl border border-[#22334F] mb-4">
      <Text className="text-[#94A3B8] text-xs font-medium mb-3">Resumo da rota</Text>
      <View className="flex-row justify-between">
        <View>
          <Text className="text-white font-bold text-base">{totalEntregas}</Text>
          <Text className="text-[#94A3B8] text-[10px]">entregas</Text>
        </View>
        <View>
          <Text className="text-white font-bold text-base">{distanciaTotal} km</Text>
          <Text className="text-[#94A3B8] text-[10px]">distância</Text>
        </View>
        <View>
          <Text className="text-white font-bold text-base">{tempoEstimado}</Text>
          <Text className="text-[#94A3B8] text-[10px]">tempo est.</Text>
        </View>
        <View>
          <Text className="text-emerald-400 font-bold text-base">R$ {economiaEstimada.toFixed(2).replace(".", ",")}</Text>
          <Text className="text-[#94A3B8] text-[10px]">economia est.</Text>
        </View>
      </View>
    </View>
  );
});

ResumoRotaCard.displayName = "ResumoRotaCard";
