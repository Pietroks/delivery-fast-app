import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useCallback, useState } from "react";
import { api } from "../services/api";
import { SafeAreaView } from "react-native-safe-area-context";
import { ActivityIndicator, FlatList, RefreshControl, StatusBar, Text, TouchableOpacity, View } from "react-native";
import { Feather, Ionicons } from "@expo/vector-icons";

export interface EntregaConcluida {
  id: string;
  rua: string;
  bairro?: string;
  nomeDestinatario?: string;
  updated_at?: string;
}

interface ResumoHistorico {
  totalConcluidas: number;
  ultimaEntregaHora: string;
}

export default function HistoricoScreen() {
  const navigation = useNavigation();

  const [historico, setHistorico] = useState<EntregaConcluida[]>([]);
  const [resumo, setResumo] = useState<ResumoHistorico>({
    totalConcluidas: 0,
    ultimaEntregaHora: "--:--",
  });
  const [carregando, setCarregando] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const carregarHistorico = useCallback(async () => {
    try {
      const response = await api.get("/entregas/historico-hoje");
      if (response.data) {
        setHistorico(response.data.entregas || []);
        if (response.data.resumo) {
          setResumo(response.data.resumo);
        }
      }
    } catch {
      setHistorico([]);
    } finally {
      setCarregando(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setCarregando(true);
      carregarHistorico();
    }, [carregarHistorico]),
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    carregarHistorico();
  }, [carregarHistorico]);

  const formatarDataHora = (isoString?: string) => {
    if (!isoString) return "";
    const data = new Date(isoString);
    const dataFormatada = data.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
    const horaFormatada = data.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    return `${dataFormatada} às ${horaFormatada}`;
  };

  return (
    <SafeAreaView className="flex-1 bg-[#0b1320] px-4 pt-2">
      <StatusBar barStyle="light-content" />

      {/* Cabeçalho */}
      <View className="flex-row items-center my-3">
        {navigation.canGoBack() && (
          <TouchableOpacity onPress={() => navigation.goBack()} className="p-1 mr-3">
            <Ionicons name="arrow-back" size={22} color="#ffffff" />
          </TouchableOpacity>
        )}
        <Text className="text-white text-base font-bold flex-1 text-center mr-6">Histórico de Entregas</Text>
      </View>

      {/* Resumo Métricas */}
      <View className="bg-[#152033] p-4 rounded-2xl shadow-2xl border border-[#22334f] mb-4 flex-row justify-around items-center">
        <View className="items-center">
          <View className="bg-emerald-500/10 p-2 rounded-xl mb-1 border border-emerald-500/20">
            <Ionicons name="checkmark-done-sharp" size={20} color="#22c55e" />
          </View>
          <Text className="text-white font-bold text-lg">{resumo.totalConcluidas}</Text>
          <Text className="text-[#94a3b8] text-[10px]">Total Concluídas</Text>
        </View>

        <View className="h-10 w-[1px] bg-[#22334f]" />

        <View className="items-center">
          <View className="bg-sky-500/10 p-2 rounded-xl mb-1 border border-sky-500/20">
            <Ionicons name="time-outline" size={20} color="#38bdf8" />
          </View>
          <Text className="text-white font-bold text-lg">{resumo.ultimaEntregaHora}</Text>
          <Text className="text-[#94a3b8] text-[10px]">Última Entrega</Text>
        </View>
      </View>

      <Text className="text-white font-bold text-sm mb-3">Todas as entregas concluídas</Text>

      {carregando ? (
        <View className="py-8 justify-center items-center flex-1">
          <ActivityIndicator size="small" color="#22c55e" />
        </View>
      ) : (
        <FlatList
          data={historico}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#22c55e" />}
          ListEmptyComponent={
            <View className="items-center justify-center py-12">
              <Feather name="check-circle" size={36} color="#64748b" />
              <Text className="text-[#94a3b8] text-xs mt-3 text-center">Nenhuma entrega concluída até o momento.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View className="bg-[#152033] p-3 rounded-xl mb-2 flex-row items-center border border-[#22334f]">
              <View className="mr-3 bg-emerald-500/10 p-2 rounded-lg border border-emerald-500/30">
                <Ionicons name="checkmark-sharp" size={16} color="#22c55e" />
              </View>

              <View className="flex-1 mr-2">
                <Text className="text-white text-xs font-semibold" numberOfLines={1}>
                  {item.rua}
                </Text>
                {item.nomeDestinatario ? <Text className="text-[#94a3b8] text-[10px]">Cliente: {item.nomeDestinatario}</Text> : null}
                {item.bairro ? <Text className="text-[#64748b] text-[10px]">{item.bairro}</Text> : null}
              </View>

              {item.updated_at && (
                <View className="bg-[#1e2e48] px-2 py-1 rounded-md border border-[#22334f]">
                  <Text className="text-emerald-400 text-[10px] font-bold">{formatarDataHora(item.updated_at)}</Text>
                </View>
              )}
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}
