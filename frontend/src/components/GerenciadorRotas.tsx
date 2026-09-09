import React, { useState, useCallback, useEffect } from "react";
import { Alert, Modal, Text, TextInput, TouchableOpacity, View, FlatList, Linking } from "react-native";
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

type EstadoCarregamento = "nenhum" | "atualizacao" | "conclusao" | "exclusao";

export const GerenciadorRotas: React.FC<GerenciadorRotasProps> = ({ paradas, onAtualizarLista, onAdicionarEntrega, onReordenarLocal }) => {
  const navigation = useNavigation<any>();

  const [listaLocal, setListaLocal] = useState<Parada[]>(paradas);
  const [paradaEmEdicao, setParadaEmEdicao] = useState<Parada | null>(null);
  const [textoEditado, setTextoEditado] = useState("");
  const [carregandoAcao, setCarregandoAcao] = useState<EstadoCarregamento>("nenhum");

  useEffect(() => {
    setListaLocal(paradas);
  }, [paradas]);

  // ---------------------------------------------------------------------
  // Helpers puros
  // ---------------------------------------------------------------------
  const formatarTelefone = (telefone?: string) => telefone?.replace(/\D/g, "");

  const restaurarLista = useCallback(() => {
    setListaLocal(paradas);
    onReordenarLocal?.(paradas);
  }, [paradas, onReordenarLocal]);

  const hapticaErro = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  }, []);

  const hapticaSucesso = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, []);

  // ---------------------------------------------------------------------
  // Ações de contato
  // ---------------------------------------------------------------------
  const ligarParaCliente = useCallback((telefone?: string) => {
    const numeroLimpo = formatarTelefone(telefone);
    if (!numeroLimpo) {
      Alert.alert("Telefone não informado", "Esta entrega não possui um número de telefone associado.");
      return;
    }
    Linking.openURL(`tel:${numeroLimpo}`).catch(() => {
      Alert.alert("Erro", "Não foi possível abrir o discador.");
    });
  }, []);

  const abrirWhatsapp = useCallback((telefone?: string, nomeCliente?: string) => {
    const numeroLimpo = formatarTelefone(telefone);
    if (!numeroLimpo) {
      Alert.alert("Telefone não informado", "Esta entrega não possui um número de telefone associado.");
      return;
    }
    const numeroFormatado = numeroLimpo.startsWith("55") ? numeroLimpo : `55${numeroLimpo}`;
    const saudacao = nomeCliente ? `Olá, ${nomeCliente}!` : "Olá!";
    const mensagem = encodeURIComponent(
      `${saudacao} Sou o entregador da sua encomenda. Estou entrando em contato para informar que estou a caminho da entrega.`,
    );
    const urlApp = `whatsapp://send?phone=${numeroFormatado}&text=${mensagem}`;
    const urlWeb = `https://wa.me/${numeroFormatado}?text=${mensagem}`;

    Linking.openURL(urlApp).catch(() => {
      Linking.openURL(urlWeb).catch(() => {
        Alert.alert("Erro", "Não foi possível abrir o WhatsApp.");
      });
    });
  }, []);

  // ---------------------------------------------------------------------
  // Navegação e reordenação
  // ---------------------------------------------------------------------
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
          paradas: paradasReordenadas.map(({ id, ordem }) => ({ id, ordem })),
        });
      } catch {
        restaurarLista();
        hapticaErro();
        Alert.alert("Erro de conexão", "Não foi possível salvar a nova ordem no servidor.");
      }
    },
    [onReordenarLocal, restaurarLista, hapticaErro],
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

  // ---------------------------------------------------------------------
  // Conclusão, exclusão e edição
  // ---------------------------------------------------------------------
  const handleConcluir = useCallback(
    async (item: Parada) => {
      hapticaSucesso();
      const novaLista = listaLocal.filter((p) => p.id !== item.id);
      setListaLocal(novaLista);
      onReordenarLocal?.(novaLista);
      setCarregandoAcao("conclusao");

      try {
        await api.put(`/entregas/${item.id}/status`, { status: "entregue" });
        onAtualizarLista();
      } catch {
        restaurarLista();
        hapticaErro();
        Alert.alert("Erro", "Não foi possível marcar como entregue.");
      } finally {
        setCarregandoAcao("nenhum");
      }
    },
    [listaLocal, onAtualizarLista, onReordenarLocal, restaurarLista, hapticaSucesso, hapticaErro],
  );

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
            setCarregandoAcao("exclusao");

            try {
              await api.delete(`/entregas/${item.id}`);
              onAtualizarLista();
            } catch {
              restaurarLista();
              hapticaErro();
              Alert.alert("Erro", "Não foi possível excluir a entrega.");
            } finally {
              setCarregandoAcao("nenhum");
            }
          },
        },
      ]);
    },
    [listaLocal, onAtualizarLista, onReordenarLocal, restaurarLista, hapticaErro],
  );

  const handleSalvarEdicao = async () => {
    if (!paradaEmEdicao || !textoEditado.trim()) return;

    setCarregandoAcao("atualizacao");
    try {
      await api.put(`/entregas/${paradaEmEdicao.id}`, { rua: textoEditado.trim() });
      setParadaEmEdicao(null);
      hapticaSucesso();
      onAtualizarLista();
    } catch {
      hapticaErro();
      Alert.alert("Erro", "Não foi possível atualizar o endereço.");
    } finally {
      setCarregandoAcao("nenhum");
    }
  };

  // ---------------------------------------------------------------------
  // Renderização
  // ---------------------------------------------------------------------
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
          <View className="bg-[#152033] p-3 rounded-xl mb-2 border border-[#22334f]">
            {/* Linha Superior */}
            <View className="flex-row items-center">
              <TouchableOpacity
                onPress={() => handleConcluir(item)}
                className="mr-2 bg-[#1e2e48] p-1.5 rounded-lg border border-emerald-500/50 active:bg-emerald-600 justify-center items-center"
              >
                <Ionicons name="checkmark-sharp" size={16} color="#22C55E" />
              </TouchableOpacity>

              <View className="bg-[#1e2e48] w-6 h-6 rounded-full justify-center items-center mr-2 border border-[#22334f]">
                <Text className="text-white font-bold text-[10px]">{index + 1}</Text>
              </View>

              <View className="flex-1 mr-2">
                <Text className="text-white text-xs font-semibold" numberOfLines={1}>
                  {item.rua}
                </Text>
                {item.nomeDestinatario ? (
                  <Text className="text-emerald-400 text-[10px] font-medium" numberOfLines={1}>
                    Destinatário: {item.nomeDestinatario}
                  </Text>
                ) : null}
                {item.bairro ? <Text className="text-[#94a3b8] text-[10px]">{item.bairro}</Text> : null}
                {item.horarioEstimado ? <Text className="text-[#64748b] text-[10px] mt-0.5">{item.horarioEstimado}</Text> : null}
              </View>

              <View className="flex-row items-center gap-1">
                {index > 0 && (
                  <TouchableOpacity
                    onPress={() => handleMoverPosicao(index, "cima")}
                    className="bg-[#1e2e48] p-1.5 rounded-md border border-[#22334f]"
                  >
                    <Ionicons name="chevron-up" size={13} color="#94A3B8" />
                  </TouchableOpacity>
                )}

                {index < listaLocal.length - 1 && (
                  <TouchableOpacity
                    onPress={() => handleMoverPosicao(index, "baixo")}
                    className="bg-[#1e2e48] p-1.5 rounded-md border border-[#22334f]"
                  >
                    <Ionicons name="chevron-down" size={13} color="#94A3B8" />
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  onPress={() => {
                    setParadaEmEdicao(item);
                    setTextoEditado(item.rua);
                  }}
                  className="p-1.5 bg-[#1e2e48] rounded-md border border-[#22334f]"
                >
                  <Ionicons name="pencil-outline" size={13} color="#38BDF8" />
                </TouchableOpacity>

                <TouchableOpacity onPress={() => handleExcluir(item)} className="p-1.5 bg-[#1e2e48] rounded-md border border-[#22334f]">
                  <Ionicons name="trash-outline" size={13} color="#EF4444" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Linha Inferior: Ações Rápidas */}
            <View className="flex-row items-center gap-2 mt-2 pt-2 border-t border-[#1e293b]">
              <TouchableOpacity
                onPress={() => ligarParaCliente(item.telefone)}
                className="flex-row items-center bg-[#1e2e48] border border-[#22334f] px-3 py-1.5 rounded-lg active:bg-blue-950"
                accessibilityLabel="Ligar para o cliente"
              >
                <Ionicons name="call-outline" size={13} color="#60a5fa" style={{ marginRight: 5 }} />
                <Text className="text-blue-400 text-xs font-semibold">Ligar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => abrirWhatsapp(item.telefone, item.nomeDestinatario)}
                className="flex-row items-center bg-[#1e2e48] border border-emerald-500/30 px-3 py-1.5 rounded-lg active:bg-emerald-950"
                accessibilityLabel="Enviar mensagem no WhatsApp"
              >
                <Ionicons name="logo-whatsapp" size={13} color="#22c55e" style={{ marginRight: 5 }} />
                <Text className="text-emerald-400 text-xs font-semibold">WhatsApp</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />

      {/* Botão Flutuante (FAB) */}
      <TouchableOpacity
        onPress={handleNavegarNovaEntrega}
        activeOpacity={0.8}
        className="absolute bottom-4 right-2 bg-[#22c55e] w-14 h-14 rounded-full justify-center shadow-2xl items-center border border-emerald-400 active:bg-emerald-600"
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

              <TouchableOpacity
                onPress={handleSalvarEdicao}
                disabled={carregandoAcao !== "nenhum"}
                className="px-4 py-2 rounded-xl bg-[#22c55e]"
              >
                <Text className="text-black text-xs font-bold">Salvar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};
