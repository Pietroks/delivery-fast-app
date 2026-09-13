import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useCallback, useState } from "react";
import { api } from "../services/api";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
  Modal,
  Image,
  ScrollView,
} from "react-native";
import { Feather, Ionicons } from "@expo/vector-icons";

export interface EntregaConcluida {
  id: string;
  rua: string;
  bairro?: string;
  nomeDestinatario?: string;
  nome_destinatario?: string;
  documento_recebedor?: string;
  foto_comprovante?: string;
  assinatura_digital?: string;
  referencia?: string;
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
  const [comprovanteSelecionado, setComprovanteSelecionado] = useState<EntregaConcluida | null>(null);

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
          renderItem={({ item }) => {
            const temFoto = !!item.foto_comprovante || item.referencia?.includes("fotoComprovante");
            const temAssinatura = !!item.assinatura_digital || item.referencia?.includes("assinaturaDigital");
            const nomeRecebedor = item.nome_destinatario || item.nomeDestinatario;

            return (
              <TouchableOpacity
                onPress={() => setComprovanteSelecionado(item)}
                activeOpacity={0.8}
                className="bg-[#152033] p-3.5 rounded-xl mb-2.5 border border-[#22334f] active:bg-[#1a283f]"
              >
                <View className="flex-row items-center">
                  <View className="mr-3 bg-emerald-500/10 p-2 rounded-lg border border-emerald-500/30">
                    <Ionicons name="checkmark-sharp" size={16} color="#22c55e" />
                  </View>

                  <View className="flex-1 mr-2">
                    <Text className="text-white text-xs font-semibold" numberOfLines={1}>
                      {item.rua}
                    </Text>
                    {nomeRecebedor ? (
                      <Text className="text-[#94a3b8] text-[10px]">Recebido por: {nomeRecebedor}</Text>
                    ) : null}
                    {item.bairro ? <Text className="text-[#64748b] text-[10px]">{item.bairro}</Text> : null}
                  </View>

                  {item.updated_at && (
                    <View className="bg-[#1e2e48] px-2 py-1 rounded-md border border-[#22334f]">
                      <Text className="text-emerald-400 text-[10px] font-bold">{formatarDataHora(item.updated_at)}</Text>
                    </View>
                  )}
                </View>

                {/* Badges de Comprovante anexado */}
                {(temFoto || temAssinatura || item.documento_recebedor) && (
                  <View className="flex-row items-center gap-1.5 mt-2 pt-2 border-t border-[#1e293b]">
                    {temFoto && (
                      <View className="flex-row items-center bg-sky-500/10 border border-sky-500/30 px-2 py-0.5 rounded-md">
                        <Ionicons name="camera" size={11} color="#38bdf8" style={{ marginRight: 3 }} />
                        <Text className="text-sky-400 text-[10px] font-medium">Foto anexada</Text>
                      </View>
                    )}

                    {temAssinatura && (
                      <View className="flex-row items-center bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-md">
                        <Feather name="edit-3" size={10} color="#22c55e" style={{ marginRight: 3 }} />
                        <Text className="text-emerald-400 text-[10px] font-medium">Assinado</Text>
                      </View>
                    )}

                    {item.documento_recebedor && (
                      <View className="flex-row items-center bg-[#1e2e48] px-2 py-0.5 rounded-md">
                        <Text className="text-[#94a3b8] text-[10px]">Doc: {item.documento_recebedor}</Text>
                      </View>
                    )}
                  </View>
                )}
              </TouchableOpacity>
            );
          }}
        />
      )}

      {/* Modal de Detalhes do Comprovante */}
      <Modal visible={!!comprovanteSelecionado} transparent animationType="slide" onRequestClose={() => setComprovanteSelecionado(null)}>
        <View className="flex-1 justify-end bg-black/75">
          <View className="bg-[#152033] rounded-t-3xl border-t border-[#22334f] p-5 max-h-[85%]">
            <View className="flex-row items-center justify-between pb-3 border-b border-[#22334f]">
              <View className="flex-1 mr-2">
                <Text className="text-white text-base font-bold">Comprovante de Entrega</Text>
                <Text className="text-[#94a3b8] text-xs mt-0.5">Confirmação de recebimento registrada</Text>
              </View>
              <TouchableOpacity onPress={() => setComprovanteSelecionado(null)} className="p-1">
                <Ionicons name="close" size={22} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            {comprovanteSelecionado && (
              <ScrollView showsVerticalScrollIndicator={false} className="my-3">
                <View className="bg-[#0b1320] p-3 rounded-xl border border-[#22334f] mb-3">
                  <Text className="text-[#64748b] text-[10px] font-bold uppercase mb-1">Endereço:</Text>
                  <Text className="text-white text-xs font-semibold">{comprovanteSelecionado.rua}</Text>
                  {comprovanteSelecionado.bairro ? (
                    <Text className="text-[#94a3b8] text-[11px] mt-0.5">{comprovanteSelecionado.bairro}</Text>
                  ) : null}
                </View>

                <View className="bg-[#0b1320] p-3 rounded-xl border border-[#22334f] mb-3">
                  <Text className="text-[#64748b] text-[10px] font-bold uppercase mb-1">Recebedor:</Text>
                  <Text className="text-emerald-400 text-xs font-bold">
                    {comprovanteSelecionado.nome_destinatario || comprovanteSelecionado.nomeDestinatario || "Não informado"}
                  </Text>
                  {comprovanteSelecionado.documento_recebedor ? (
                    <Text className="text-[#94a3b8] text-[11px] mt-0.5">
                      Documento: {comprovanteSelecionado.documento_recebedor}
                    </Text>
                  ) : null}
                  {comprovanteSelecionado.updated_at ? (
                    <Text className="text-[#64748b] text-[10px] mt-1">
                      Data/Hora: {formatarDataHora(comprovanteSelecionado.updated_at)}
                    </Text>
                  ) : null}
                </View>

                {comprovanteSelecionado.foto_comprovante ? (
                  <View className="mb-3">
                    <Text className="text-[#64748b] text-[10px] font-bold uppercase mb-1.5">Foto Registrada:</Text>
                    <View className="w-full h-52 rounded-xl overflow-hidden border border-[#22334f] bg-black">
                      <Image source={{ uri: comprovanteSelecionado.foto_comprovante }} className="w-full h-full" resizeMode="cover" />
                    </View>
                  </View>
                ) : null}

                {comprovanteSelecionado.assinatura_digital ? (
                  <View className="bg-emerald-500/10 border border-emerald-500/30 p-3 rounded-xl flex-row items-center gap-2 mb-3">
                    <Feather name="check-circle" size={16} color="#22c55e" />
                    <Text className="text-emerald-400 text-xs font-semibold">Assinatura digital coletada na tela</Text>
                  </View>
                ) : null}
              </ScrollView>
            )}

            <TouchableOpacity
              onPress={() => setComprovanteSelecionado(null)}
              className="bg-[#1e2e48] border border-[#22334f] py-3 rounded-xl items-center justify-center mt-2"
            >
              <Text className="text-white font-bold text-xs">Fechar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
