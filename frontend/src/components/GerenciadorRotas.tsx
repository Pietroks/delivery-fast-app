import React, { useState, useCallback, useEffect } from "react";
import { Alert, Modal, Text, TextInput, TouchableOpacity, View, FlatList } from "react-native";
import { Ionicons, Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import * as Haptics from "expo-haptics";
import { Parada } from "../screens/HomeScreen";
import { api } from "../services/api";

interface GerenciadorRotasProps {
  paradas: Parada[];
  onAtualizarLista: () => void;
  onAdicionarEntrega?: () => void;
  onReordenarLocal?: (novasParadas: Parada[]) => void;
}

export const GerenciadorRotas: React.FC<GerenciadorRotasProps> = ({ paradas, onAtualizarLista, onAdicionarEntrega, onReordenarLocal }) => {
  const navigation = useNavigation<any>();

  const [listaLocal, setListaLocal] = useState<Parada[]>(paradas);
  const [paradaEmEdicao, setParadaEmEdicao] = useState<Parada | null>(null);
  const [textoEditado, setTextoEditado] = useState("");
  const [carregandoAcao, setCarregandoAcao] = useState(false);

  useEffect(() => {
    setListaLocal(paradas);
  }, [paradas]);

  const handleNavegarNovaEntrega = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (onAdicionarEntrega) {
      onAdicionarEntrega();
    } else {
      navigation.navigate("NovaEntrega");
    }
  }, [navigation, onAdicionarEntrega]);

  const reordenarEOtimizarUI = useCallback(
    async (novaListaProcessada: Parada[]) => {
      const paradasReordenadas = novaListaProcessada.map((p, i) => ({ ...p, ordem: i + 1 }));

      setListaLocal(paradasReordenadas);

      onReordenarLocal?.(paradasReordenadas);

      try {
        await api.put("/rotas/reordenar", {
          paradas: paradasReordenadas.map((p) => ({ id: p.id, ordem: p.ordem })),
        });
      } catch {
        setListaLocal(paradas);
        onReordenarLocal?.(paradas);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert("Erro de conexão", "Não foi possível salvar a nova ordem no servidor.");
      }
    },
    [paradas, onReordenarLocal],
  );

  const handleMoverPosicao = useCallback(
    (indexAtual: number, direcao: "cima" | "baixo") => {
      const novoIndex = direcao === "cima" ? indexAtual - 1 : indexAtual + 1;
      if (novoIndex < 0 || novoIndex >= listaLocal.length) return;

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      const novaLista = [...listaLocal];
      const [itemRemovido] = novaLista.splice(indexAtual, 1);
      novaLista.splice(novoIndex, 0, itemRemovido);

      reordenarEOtimizarUI(novaLista);
    },
    [listaLocal, reordenarEOtimizarUI],
  );

  // 2. Concluir Entrega
  const handleConcluir = useCallback(
    async (item: Parada) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const novaLista = listaLocal.filter((p) => p.id !== item.id);
      setListaLocal(novaLista);
      onReordenarLocal?.(novaLista);

      try {
        await api.put(`/entregas/${item.id}/status`, { status: "entregue" });
        onAtualizarLista();
      } catch {
        setListaLocal(paradas);
        onReordenarLocal?.(paradas);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert("Erro", "Não foi possível marcar como entregue.");
      }
    },
    [paradas, listaLocal, onAtualizarLista, onReordenarLocal],
  );

  // 4. Excluir Parada
  const handleExcluir = useCallback(
    (item: Parada) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

      Alert.alert("Excluir parada", `Deseja remover "${item.rua}" da rota?`, [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Excluir",
          style: "destructive",
          onPress: async () => {
            const novaLista = listaLocal.filter((p) => p.id !== item.id);
            setListaLocal(novaLista);
            onReordenarLocal?.(novaLista);

            try {
              await api.delete(`/entregas/${item.id}`);
              onAtualizarLista();
            } catch {
              setListaLocal(paradas);
              onReordenarLocal?.(paradas);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
              Alert.alert("Erro", "Não foi possível excluir a entrega.");
            }
          },
        },
      ]);
    },
    [paradas, listaLocal, onAtualizarLista, onReordenarLocal],
  );

  // 5. Editar Endereço
  const handleSalvarEdicao = async () => {
    if (!paradaEmEdicao || !textoEditado.trim()) return;

    setCarregandoAcao(true);
    try {
      await api.put(`/entregas/${paradaEmEdicao.id}`, { rua: textoEditado.trim() });
      setParadaEmEdicao(null);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onAtualizarLista();
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Erro", "Não foi possível atualizar o endereço.");
    } finally {
      setCarregandoAcao(false);
    }
  };

  return (
    <View className="flex-1 relative">
      <FlatList
        data={listaLocal}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 80 }}
        ListEmptyComponent={
          <View className="items-center justify-center py-8">
            <Feather name="map-pin" size={32} color="#94A3B8" />
            <Text className="text-[#94A3B8] text-xs mt-2">Nenhuma rota pendente no momento.</Text>
          </View>
        }
        renderItem={({ item, index }) => (
          <View className="bg-[#152033] p-3 rounded-xl mb-2 flex-row items-center border border-[#22334f]">
            {/* Botão de Concluir (Check Verde) com borda explicativa */}
            <TouchableOpacity
              onPress={() => handleConcluir(item)}
              className="mr-2 bg-[#1e2e48] p-1.5 rounded-lg border border-emerald-500/50 active:bg-emerald-600 justify-center items-center"
            >
              <Ionicons name="checkmark-sharp" size={16} color="#22C55E" />
            </TouchableOpacity>

            {/* Número da Ordem */}
            <View className="bg-[#1e2e48] w-6 h-6 rounded-full justify-center items-center mr-2 border border-[#22334f]">
              <Text className="text-white font-bold text-[10px]">{index + 1}</Text>
            </View>

            {/* Endereço */}
            <View className="flex-1 mr-2">
              <Text className="text-white text-xs font-semibold" numberOfLines={1}>
                {item.rua}
              </Text>
              {item.bairro ? <Text className="text-[#94a3b8] text-[10px]">{item.bairro}</Text> : null}
              {item.horarioEstimado ? <Text className="text-[#64748b] text-[10px] mt-0.5">{item.horarioEstimado}</Text> : null}
            </View>

            {/* Ações Inteligentes com Legendas Claras */}
            <View className="flex-row items-center gap-1">
              {/* Mover para Cima (▲) */}
              {index > 0 && (
                <TouchableOpacity
                  onPress={() => handleMoverPosicao(index, "cima")}
                  className="bg-[#1e2e48] p-1.5 rounded-md border border-[#22334f]"
                >
                  <Ionicons name="chevron-up" size={13} color="#94A3B8" />
                </TouchableOpacity>
              )}

              {/* Mover para Baixo (▼) */}
              {index < listaLocal.length - 1 && (
                <TouchableOpacity
                  onPress={() => handleMoverPosicao(index, "baixo")}
                  className="bg-[#1e2e48] p-1.5 rounded-md border border-[#22334f]"
                >
                  <Ionicons name="chevron-down" size={13} color="#94A3B8" />
                </TouchableOpacity>
              )}

              {/* Editar */}
              <TouchableOpacity
                onPress={() => {
                  setParadaEmEdicao(item);
                  setTextoEditado(item.rua);
                }}
                className="p-1.5 bg-[#1e2e48] rounded-md border border-[#22334f]"
              >
                <Ionicons name="pencil-outline" size={13} color="#38BDF8" />
              </TouchableOpacity>

              {/* Excluir */}
              <TouchableOpacity onPress={() => handleExcluir(item)} className="p-1.5 bg-[#1e2e48] rounded-md border border-[#22334f]">
                <Ionicons name="trash-outline" size={13} color="#EF4444" />
              </TouchableOpacity>
            </View>
          </View>
        )}
      />

      {/* Botão Flutuante (FAB) no Canto Inferior Direito para Nova Entrega */}
      <TouchableOpacity
        onPress={handleNavegarNovaEntrega}
        activeOpacity={0.8}
        className="absolute bottom-4 right-2 bg-[#22c55e] w-13 h-13 rounded-full justify-center shadow-2xl items-center border border-emerald-400 active:bg-emerald-600"
        style={{ elevation: 5 }}
      >
        <Ionicons name="add" size={28} color="#000000" />
      </TouchableOpacity>

      {/* Modal de Edição */}
      <Modal visible={!!paradaEmEdicao} transparent animationType="fade">
        <View className="flex-1 bg-black/70 justify-center px-4">
          <View className="bg-[#152033] border border-[#22334f] rounded-2xl p-4">
            <Text className="text-white font-bold text-sm mb-3">Editar Endereço</Text>

            <TextInput
              className="bg-[#0b1320] border border-[#22334f] text-white p-3 rounded-xl text-xs mb-4"
              value={textoEditado}
              onChangeText={setTextoEditado}
              placeholder="Digite o novo endereço"
              placeholderTextColor="#64748b"
            />

            <View className="flex-row justify-end gap-2">
              <TouchableOpacity onPress={() => setParadaEmEdicao(null)} className="px-4 py-2 rounded-xl bg-[#1e2e48]">
                <Text className="text-white text-xs font-semibold">Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={handleSalvarEdicao} disabled={carregandoAcao} className="px-4 py-2 rounded-xl bg-[#22c55e]">
                <Text className="text-black text-xs font-bold">Salvar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};
