import React, { useState, useCallback, useEffect, useRef } from "react";
import { Alert, Modal, Text, TextInput, TouchableOpacity, View, FlatList, Linking, RefreshControl } from "react-native";
import { Ionicons, Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../types/navigation";
import * as Haptics from "expo-haptics";
import { Parada } from "../screens/HomeScreen";
import { api } from "../services/api";
import { ComprovanteEntregaModal, DadosComprovante } from "./ComprovanteEntregaModal";
import { alertaApp } from "../contexts/AlertContext";
import { abrirRotaGoogleMaps, abrirNavegacaoIndividual } from "../utils/navigation";
import { CardParadaAtiva } from "./CardParadaAtiva";
import { InsucessoEntregaModal, DadosInsucesso } from "./InsucessoEntregaModal";

interface GerenciadorRotasProps {
  paradas: Parada[];
  onAtualizarLista: () => void;
  onAdicionarEntrega?: () => void;
  onReordenarLocal?: (novasParadas: Parada[]) => void;
  refreshing?: boolean;
  onRefresh?: () => void;
  isOffline?: boolean;
  gpsUsuario?: { lat?: number; lon?: number };
}

type EstadoCarregamento = "nenhum" | "atualizacao" | "conclusao" | "exclusao";

interface ItemDesfazer {
  tipo: "concluida" | "excluida";
  parada: Parada;
  indexOriginal: number;
}

export const GerenciadorRotas: React.FC<GerenciadorRotasProps> = ({
  paradas,
  onAtualizarLista,
  onAdicionarEntrega,
  onReordenarLocal,
  refreshing,
  onRefresh,
  isOffline = false,
  gpsUsuario,
}) => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [listaLocal, setListaLocal] = useState<Parada[]>(paradas);
  const [paradaEmEdicao, setParadaEmEdicao] = useState<Parada | null>(null);
  const [paradaOpcoes, setParadaOpcoes] = useState<{ parada: Parada; index: number } | null>(null);
  const [textoEditado, setTextoEditado] = useState("");
  const [carregandoAcao, setCarregandoAcao] = useState<EstadoCarregamento>("nenhum");
  const [paradaComprovante, setParadaComprovante] = useState<Parada | null>(null);
  const [carregandoComprovante, setCarregandoComprovante] = useState(false);
  const [paradaInsucesso, setParadaInsucesso] = useState<Parada | null>(null);
  const [carregandoInsucesso, setCarregandoInsucesso] = useState(false);
  const [itemDesfazer, setItemDesfazer] = useState<ItemDesfazer | null>(null);

  const timerDesfazerRef = useRef<NodeJS.Timeout | null>(null);

  const limparTimerDesfazer = () => {
    if (timerDesfazerRef.current) {
      clearTimeout(timerDesfazerRef.current);
      timerDesfazerRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      limparTimerDesfazer();
    };
  }, []);

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

  const iniciarTimerDesfazer = (novoItem: ItemDesfazer) => {
    limparTimerDesfazer();
    setItemDesfazer(novoItem);
    timerDesfazerRef.current = setTimeout(() => {
      setItemDesfazer(null);
      timerDesfazerRef.current = null;
    }, 5000);
  };

  const handleDesfazer = useCallback(async () => {
    if (!itemDesfazer) return;
    limparTimerDesfazer();

    const { parada, indexOriginal, tipo } = itemDesfazer;
    hapticaSucesso();

    const novaLista = [...listaLocal];
    novaLista.splice(indexOriginal, 0, parada);
    setListaLocal(novaLista);
    onReordenarLocal?.(novaLista);
    setItemDesfazer(null);

    try {
      if (tipo === "concluida") {
        await api.put(`/entregas/${parada.id}/status`, { status: "pendente" });
      }
      onAtualizarLista();
    } catch {
      hapticaErro();
      alertaApp("Erro", "Não foi possível desfazer a alteração no servidor.");
    }
  }, [itemDesfazer, listaLocal, onReordenarLocal, onAtualizarLista, hapticaSucesso, hapticaErro]);

  // ---------------------------------------------------------------------
  // Ações de contato
  // ---------------------------------------------------------------------
  const ligarParaCliente = useCallback((telefone?: string) => {
    const numeroLimpo = formatarTelefone(telefone);
    if (!numeroLimpo) {
      alertaApp("Telefone não informado", "Esta entrega não possui um número de telefone associado.");
      return;
    }
    const urlTel = `tel:${numeroLimpo}`;
    Linking.openURL(urlTel).catch(() => {
      alertaApp("Erro", "Não foi possível iniciar a chamada telefônica neste dispositivo.");
    });
  }, []);

  const abrirWhatsapp = useCallback((telefone?: string, nomeCliente?: string) => {
    const numeroLimpo = formatarTelefone(telefone);
    if (!numeroLimpo) {
      alertaApp("Telefone não informado", "Esta entrega não possui um número de telefone associado.");
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
        alertaApp("Erro", "Não foi possível abrir o WhatsApp.");
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
        alertaApp("Erro de conexão", "Não foi possível salvar a nova ordem no servidor.");
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
      const indexOriginal = Math.max(0, listaLocal.findIndex((p) => p.id === item.id));
      const novaLista = listaLocal.filter((p) => p.id !== item.id);
      setListaLocal(novaLista);
      onReordenarLocal?.(novaLista);
      setCarregandoAcao("conclusao");

      iniciarTimerDesfazer({
        tipo: "concluida",
        parada: item,
        indexOriginal,
      });

      try {
        await api.put(`/entregas/${item.id}/status`, { status: "entregue" });
        onAtualizarLista();
      } catch {
        restaurarLista();
        hapticaErro();
        alertaApp("Erro", "Não foi possível marcar como entregue.");
      } finally {
        setCarregandoAcao("nenhum");
      }
    },
    [listaLocal, onAtualizarLista, onReordenarLocal, restaurarLista, hapticaSucesso, hapticaErro],
  );

  const handleAbrirComprovante = useCallback((item: Parada) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setParadaComprovante(item);
  }, []);

  const handleConfirmarComprovante = useCallback(
    async (dados: DadosComprovante) => {
      if (!paradaComprovante) return;
      const item = paradaComprovante;
      hapticaSucesso();
      const indexOriginal = Math.max(0, listaLocal.findIndex((p) => p.id === item.id));
      const novaLista = listaLocal.filter((p) => p.id !== item.id);
      setListaLocal(novaLista);
      onReordenarLocal?.(novaLista);
      setCarregandoComprovante(true);

      iniciarTimerDesfazer({
        tipo: "concluida",
        parada: item,
        indexOriginal,
      });

      try {
        await api.put(`/entregas/${item.id}/status`, dados);
        setParadaComprovante(null);
        onAtualizarLista();
      } catch {
        restaurarLista();
        hapticaErro();
        alertaApp("Erro", "Não foi possível registrar o comprovante da entrega.");
      } finally {
        setCarregandoComprovante(false);
      }
    },
    [paradaComprovante, listaLocal, onAtualizarLista, onReordenarLocal, restaurarLista, hapticaSucesso, hapticaErro],
  );

  const handleExcluir = useCallback(
    (item: Parada) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      alertaApp("Excluir parada", `Deseja remover "${item.rua}" da rota?`, [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Excluir",
          style: "destructive",
          onPress: async () => {
            const indexOriginal = Math.max(0, listaLocal.findIndex((p) => p.id === item.id));
            const novaLista = listaLocal.filter((p) => p.id !== item.id);
            setListaLocal(novaLista);
            onReordenarLocal?.(novaLista);
            setCarregandoAcao("exclusao");

            iniciarTimerDesfazer({
              tipo: "excluida",
              parada: item,
              indexOriginal,
            });

            try {
              await api.delete(`/entregas/${item.id}`);
              onAtualizarLista();
            } catch {
              restaurarLista();
              hapticaErro();
              alertaApp("Erro", "Não foi possível excluir a entrega.");
            } finally {
              setCarregandoAcao("nenhum");
            }
          },
        },
      ]);
    },
    [listaLocal, onAtualizarLista, onReordenarLocal, restaurarLista, hapticaErro],
  );

  const handleInsucesso = useCallback((item: Parada) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setParadaInsucesso(item);
  }, []);

  const handleConfirmarInsucesso = useCallback(
    async (dados: DadosInsucesso) => {
      if (!paradaInsucesso) return;
      const item = paradaInsucesso;
      setCarregandoInsucesso(true);
      hapticaSucesso();

      if (dados.moverParaFinal) {
        // Otimisticamente move o item para o final da lista local
        const indexOriginal = listaLocal.findIndex((p) => p.id === item.id);
        const novaLista = [...listaLocal];
        const [removido] = novaLista.splice(indexOriginal, 1);
        novaLista.push(removido);
        setListaLocal(novaLista);
        onReordenarLocal?.(novaLista);
        setParadaInsucesso(null);

        try {
          await api.put(`/entregas/${item.id}/status`, {
            status: "pendente",
            motivoFalha: dados.motivoFalha,
            observacao: dados.observacao,
            moverParaFinal: true,
          });
          onAtualizarLista();
        } catch {
          restaurarLista();
          hapticaErro();
          alertaApp("Erro", "Não foi possível mover a entrega para o final.");
        } finally {
          setCarregandoInsucesso(false);
        }
      } else {
        // Encerra como tentativa falha
        const indexOriginal = listaLocal.findIndex((p) => p.id === item.id);
        const novaLista = listaLocal.filter((p) => p.id !== item.id);
        setListaLocal(novaLista);
        onReordenarLocal?.(novaLista);
        setParadaInsucesso(null);

        iniciarTimerDesfazer({
          tipo: "concluida",
          parada: item,
          indexOriginal,
        });

        try {
          await api.put(`/entregas/${item.id}/status`, {
            status: "tentativa_falha",
            motivoFalha: dados.motivoFalha,
            observacao: dados.observacao,
            moverParaFinal: false,
          });
          onAtualizarLista();
        } catch {
          restaurarLista();
          hapticaErro();
          alertaApp("Erro", "Não foi possível registrar o insucesso da entrega.");
        } finally {
          setCarregandoInsucesso(false);
        }
      }
    },
    [paradaInsucesso, listaLocal, onAtualizarLista, onReordenarLocal, restaurarLista, hapticaSucesso, hapticaErro],
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
      alertaApp("Erro", "Não foi possível atualizar o endereço.");
    } finally {
      setCarregandoAcao("nenhum");
    }
  };

  // ---------------------------------------------------------------------
  // Renderização do Cockpit
  // ---------------------------------------------------------------------
  return (
    <View className="flex-1 relative">
      <FlatList
        data={listaLocal}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 90 }}
        refreshControl={<RefreshControl refreshing={refreshing || false} onRefresh={onRefresh} tintColor="#22c55e" colors={["#22c55e"]} />}
        ListHeaderComponent={
          isOffline ? (
            <View className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 mb-2.5 flex-row items-center">
              <Ionicons name="cloud-offline-outline" size={18} color="#f59e0b" style={{ marginRight: 8 }} />
              <View className="flex-1">
                <Text className="text-amber-400 text-xs font-bold">Modo Offline Ativo</Text>
                <Text className="text-[#94a3b8] text-[11px] mt-0.5">
                  Suas baixas e rotas estão salvas no aparelho e serão sincronizadas assim que a conexão retornar.
                </Text>
              </View>
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View className="items-center justify-center py-8">
            <Feather name="map-pin" size={32} color="#94a3b8" />
            <Text className="text-[#94a3b8] text-xs mt-2">Nenhuma rota pendente no momento.</Text>
          </View>
        }
        renderItem={({ item, index }) => {
          if (index === 0) {
            return (
              <View>
                <CardParadaAtiva
                  parada={item}
                  index={0}
                  totalParadas={listaLocal.length}
                  onConcluir={handleAbrirComprovante}
                  onNavegarGPS={(p) => abrirNavegacaoIndividual(p, gpsUsuario)}
                  onLigar={ligarParaCliente}
                  onWhatsapp={abrirWhatsapp}
                  onOpcoes={(p, idx) => setParadaOpcoes({ parada: p, index: idx })}
                  onInsucesso={handleInsucesso}
                />
                {listaLocal.length > 1 && (
                  <View className="flex-row items-center justify-between mt-1 mb-2.5 px-1">
                    <Text className="text-[#94a3b8] text-xs font-bold uppercase tracking-wider">
                      Próximas Paradas ({listaLocal.length - 1})
                    </Text>
                    <Text className="text-[#64748b] text-[11px]">Na sequência otimizada</Text>
                  </View>
                )}
              </View>
            );
          }

          return (
            <View className="bg-[#152033] p-3.5 rounded-xl mb-2.5 border border-[#22334f]">
              {/* Topo do Card: Número da Parada, Endereço Completo e Botão de Opções */}
              <View className="flex-row items-start justify-between">
                {/* Badge de Ordem da Parada */}
                <View className="bg-[#1e2e48] px-2.5 py-1.5 rounded-lg border border-[#22334f] mr-2.5 items-center justify-center min-w-[36px]">
                  <Text className="text-white font-black text-xs" maxFontSizeMultiplier={1.3}>
                    #{index + 1}
                  </Text>
                </View>

                {/* Informações de Endereço - 2 Linhas Sem Truncamento Prematuro */}
                <View className="flex-1 mr-2">
                  <Text className="text-white text-sm font-semibold leading-5" numberOfLines={2}>
                    {item.rua}
                  </Text>
                  {item.nomeDestinatario ? (
                    <Text className="text-emerald-400 text-xs font-medium mt-0.5" numberOfLines={1}>
                      Destinatário: {item.nomeDestinatario}
                    </Text>
                  ) : null}
                  {item.bairro ? <Text className="text-[#94a3b8] text-xs mt-0.5">{item.bairro}</Text> : null}
                  {item.horarioEstimado ? <Text className="text-[#64748b] text-[11px] mt-0.5">{item.horarioEstimado}</Text> : null}
                </View>

                {/* Botão de Opções da Parada (Menu Seguro com Alvo >= 48dp) */}
                <TouchableOpacity
                  onPress={() => setParadaOpcoes({ parada: item, index })}
                  className="w-12 h-12 rounded-xl bg-[#1e2e48] border border-[#22334f] items-center justify-center active:bg-[#0b1320]"
                  accessibilityRole="button"
                  accessibilityLabel={`Opções da entrega ${index + 1}`}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                >
                  <Ionicons name="ellipsis-vertical" size={18} color="#94a3b8" />
                </TouchableOpacity>
              </View>

              {/* Barra Tática de Ações: GPS, Discador, WhatsApp e Conclusão Primária */}
              <View className="flex-row items-center gap-2 mt-3 pt-2.5 border-t border-[#22334f]">
                {/* Botão GPS Direto para esta entrega */}
                <TouchableOpacity
                  onPress={() => abrirNavegacaoIndividual(item, gpsUsuario)}
                  className="flex-row items-center justify-center bg-[#1e2e48] border border-sky-500/40 px-3 min-h-[48px] rounded-xl active:bg-[#0b1320]"
                  accessibilityRole="button"
                  accessibilityLabel="Abrir rota no GPS para esta entrega"
                >
                  <Ionicons name="navigate-outline" size={16} color="#38bdf8" style={{ marginRight: 4 }} />
                  <Text className="text-sky-400 text-xs font-bold">GPS</Text>
                </TouchableOpacity>

                {/* Botão Ligar (Discador Telefônico Nativo) */}
                <TouchableOpacity
                  onPress={() => ligarParaCliente(item.telefone)}
                  className="flex-row items-center justify-center bg-[#1e2e48] border border-[#22334f] px-3 min-h-[48px] rounded-xl active:bg-[#0b1320]"
                  accessibilityRole="button"
                  accessibilityLabel="Ligar para o cliente"
                >
                  <Ionicons name="call-outline" size={16} color="#60a5fa" style={{ marginRight: 4 }} />
                  <Text className="text-blue-400 text-xs font-bold">Ligar</Text>
                </TouchableOpacity>

                {/* Botão WhatsApp */}
                <TouchableOpacity
                  onPress={() => abrirWhatsapp(item.telefone, item.nomeDestinatario)}
                  className="flex-row items-center justify-center bg-[#1e2e48] border border-emerald-500/30 px-3 min-h-[48px] rounded-xl active:bg-[#0b1320]"
                  accessibilityRole="button"
                  accessibilityLabel="Enviar mensagem no WhatsApp"
                >
                  <Ionicons name="logo-whatsapp" size={16} color="#22c55e" style={{ marginRight: 4 }} />
                  <Text className="text-emerald-400 text-xs font-bold">WhatsApp</Text>
                </TouchableOpacity>

                {/* Botão Primário: Concluir Entrega / Registrar Comprovante */}
                <TouchableOpacity
                  onPress={() => handleAbrirComprovante(item)}
                  className="flex-1 flex-row items-center justify-center bg-[#22c55e] min-h-[48px] px-2.5 rounded-xl active:bg-[#16a34a]"
                  accessibilityRole="button"
                  accessibilityLabel={`Concluir entrega para ${item.rua}`}
                >
                  <Ionicons name="checkmark-circle-outline" size={17} color="#000000" style={{ marginRight: 4 }} />
                  <Text className="text-black text-xs font-black" numberOfLines={1}>Concluir Entrega</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
      />

      {/* Toast / Snackbar Tático de Desfazer (5 segundos de resguardo) */}
      {itemDesfazer && (
        <View
          className="absolute bottom-5 left-3 right-3 bg-[#1e2e48] border border-emerald-500/60 rounded-xl p-3 shadow-2xl flex-row items-center justify-between z-50"
          style={{ elevation: 9 }}
        >
          <View className="flex-row items-center flex-1 mr-2">
            <Ionicons name="checkmark-circle" size={22} color="#22c55e" style={{ marginRight: 8 }} />
            <View className="flex-1">
              <Text className="text-white text-xs font-bold" numberOfLines={1}>
                {itemDesfazer.tipo === "concluida" ? "Entrega concluída!" : "Parada removida!"}
              </Text>
              <Text className="text-[#94a3b8] text-[11px]" numberOfLines={1}>
                {itemDesfazer.parada.rua}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={handleDesfazer}
            className="bg-sky-500/20 border border-sky-400/50 px-3.5 py-2.5 rounded-lg active:bg-sky-500/40 min-h-[44px] justify-center items-center"
            accessibilityRole="button"
            accessibilityLabel="Desfazer ação"
          >
            <Text className="text-sky-300 text-xs font-black tracking-wide">DESFAZER</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Modal de Ações da Parada (Reordenar, Editar e Excluir com Segurança) */}
      <Modal visible={!!paradaOpcoes} transparent animationType="fade">
        <View className="flex-1 bg-black/75 justify-end p-4">
          <View className="bg-[#152033] border border-[#22334f] rounded-2xl p-5 mb-2">
            <View className="flex-row items-center justify-between pb-3 mb-3 border-b border-[#22334f]">
              <View className="flex-1 mr-2">
                <Text className="text-emerald-400 text-xs font-bold">
                  Parada #{paradaOpcoes ? paradaOpcoes.index + 1 : ""}
                </Text>
                <Text className="text-white text-sm font-semibold mt-0.5" numberOfLines={2}>
                  {paradaOpcoes?.parada.rua}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setParadaOpcoes(null)}
                className="w-10 h-10 rounded-xl bg-[#1e2e48] border border-[#22334f] items-center justify-center active:bg-[#0b1320]"
                accessibilityRole="button"
                accessibilityLabel="Fechar menu de opções"
              >
                <Ionicons name="close" size={20} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <View className="gap-2.5">
              <TouchableOpacity
                onPress={() => {
                  if (paradaOpcoes) {
                    const p = paradaOpcoes.parada;
                    setParadaOpcoes(null);
                    abrirNavegacaoIndividual(p, gpsUsuario);
                  }
                }}
                className="flex-row items-center min-h-[48px] px-4 rounded-xl bg-[#1e2e48] border border-sky-500/40 active:bg-[#0b1320]"
                accessibilityRole="button"
                accessibilityLabel="Traçar rota no GPS para este endereço"
              >
                <Ionicons name="navigate-outline" size={18} color="#38bdf8" />
                <Text className="text-sky-400 text-xs font-semibold ml-3">Traçar rota no GPS</Text>
              </TouchableOpacity>

              {paradaOpcoes && paradaOpcoes.index > 0 && (
                <TouchableOpacity
                  onPress={() => {
                    const idx = paradaOpcoes.index;
                    setParadaOpcoes(null);
                    handleMoverPosicao(idx, "cima");
                  }}
                  className="flex-row items-center min-h-[48px] px-4 rounded-xl bg-[#1e2e48] border border-[#22334f] active:bg-[#0b1320]"
                  accessibilityRole="button"
                  accessibilityLabel="Mover parada para cima"
                >
                  <Ionicons name="arrow-up" size={18} color="#38bdf8" />
                  <Text className="text-white text-xs font-semibold ml-3">Mover para cima na rota</Text>
                </TouchableOpacity>
              )}

              {paradaOpcoes && paradaOpcoes.index < listaLocal.length - 1 && (
                <TouchableOpacity
                  onPress={() => {
                    const idx = paradaOpcoes.index;
                    setParadaOpcoes(null);
                    handleMoverPosicao(idx, "baixo");
                  }}
                  className="flex-row items-center min-h-[48px] px-4 rounded-xl bg-[#1e2e48] border border-[#22334f] active:bg-[#0b1320]"
                  accessibilityRole="button"
                  accessibilityLabel="Mover parada para baixo"
                >
                  <Ionicons name="arrow-down" size={18} color="#38bdf8" />
                  <Text className="text-white text-xs font-semibold ml-3">Mover para baixo na rota</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                onPress={() => {
                  if (paradaOpcoes) {
                    const p = paradaOpcoes.parada;
                    setParadaOpcoes(null);
                    setParadaEmEdicao(p);
                    setTextoEditado(p.rua);
                  }
                }}
                className="flex-row items-center min-h-[48px] px-4 rounded-xl bg-[#1e2e48] border border-[#22334f] active:bg-[#0b1320]"
                accessibilityRole="button"
                accessibilityLabel="Editar endereço"
              >
                <Ionicons name="pencil-outline" size={18} color="#38bdf8" />
                <Text className="text-white text-xs font-semibold ml-3">Editar endereço</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  if (paradaOpcoes) {
                    const p = paradaOpcoes.parada;
                    setParadaOpcoes(null);
                    handleInsucesso(p);
                  }
                }}
                className="flex-row items-center min-h-[48px] px-4 rounded-xl bg-[#1e2e48] border border-amber-500/30 active:bg-amber-950/40"
                accessibilityRole="button"
                accessibilityLabel="Relatar problema ou insucesso nesta entrega"
              >
                <Ionicons name="alert-circle-outline" size={18} color="#f59e0b" />
                <Text className="text-amber-400 text-xs font-semibold ml-3">Relatar problema / insucesso</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  if (paradaOpcoes) {
                    const p = paradaOpcoes.parada;
                    setParadaOpcoes(null);
                    handleExcluir(p);
                  }
                }}
                className="flex-row items-center min-h-[48px] px-4 rounded-xl bg-[#1e2e48] border border-red-500/30 active:bg-red-950/40"
                accessibilityRole="button"
                accessibilityLabel="Excluir parada da rota"
              >
                <Ionicons name="trash-outline" size={18} color="#ef4444" />
                <Text className="text-red-400 text-xs font-semibold ml-3">Excluir parada da rota</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal de Edição */}
      <Modal visible={!!paradaEmEdicao} transparent animationType="fade">
        <View className="flex-1 bg-black/75 justify-center px-4">
          <View className="bg-[#152033] border border-[#22334f] rounded-2xl p-5">
            <Text className="text-white font-bold text-sm mb-3">Editar Endereço</Text>

            <TextInput
              className="bg-[#0b1320] border border-[#22334f] text-white p-3.5 rounded-xl text-xs mb-4"
              value={textoEditado}
              onChangeText={setTextoEditado}
              placeholder="Digite o novo endereço"
              placeholderTextColor="#64748b"
            />

            <View className="flex-row justify-end gap-2.5">
              <TouchableOpacity
                onPress={() => setParadaEmEdicao(null)}
                className="min-h-[48px] px-4 justify-center items-center rounded-xl bg-[#1e2e48] active:bg-[#152033]"
                accessibilityRole="button"
                accessibilityLabel="Cancelar edição"
              >
                <Text className="text-white text-xs font-semibold">Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleSalvarEdicao}
                disabled={carregandoAcao !== "nenhum"}
                className="min-h-[48px] px-5 justify-center items-center rounded-xl bg-[#22c55e] active:bg-[#16a34a]"
                accessibilityRole="button"
                accessibilityLabel="Salvar endereço"
              >
                <Text className="text-black text-xs font-bold">Salvar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal de Comprovante de Entrega */}
      <ComprovanteEntregaModal
        visivel={!!paradaComprovante}
        parada={paradaComprovante}
        carregando={carregandoComprovante}
        onFechar={() => setParadaComprovante(null)}
        onConfirmar={handleConfirmarComprovante}
      />

      {/* Modal de Insucesso na Entrega */}
      <InsucessoEntregaModal
        visivel={!!paradaInsucesso}
        parada={paradaInsucesso}
        carregando={carregandoInsucesso}
        onFechar={() => setParadaInsucesso(null)}
        onConfirmar={handleConfirmarInsucesso}
      />
    </View>
  );
};
