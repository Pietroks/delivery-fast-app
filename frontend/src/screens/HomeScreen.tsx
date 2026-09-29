import React, { useState, useCallback, useMemo } from "react";
import { StatusBar, Text, TouchableOpacity, View, ActivityIndicator, ScrollView, Modal } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import * as Location from "expo-location";
import * as Haptics from "expo-haptics";
import { api } from "../services/api";
import { GerenciadorRotas } from "../components/GerenciadorRotas";
import { abrirRotaGoogleMaps, calcularLotes } from "../utils/navigation";
import { ResumoRotaCard, ResumoRotaData } from "../components/ResumoRotaCard";
import { FinalizarRotaModal } from "../components/FinalizarRotaModal";
import { ImportarLoteModal } from "../components/ImportarLoteModal";
import { FechamentoTurnoModal } from "../components/FechamentoTurnoModal";
import { carregarRotasLocalmente, salvarRotasLocalmente } from "../services/storage";
import { useAuth } from "../contexts/AuthContext";
import { obterLocalizacaoECidadeRapida } from "../services/location";
import { alertaApp } from "../contexts/AlertContext";

export interface Parada {
  id: string;
  ordem: number;
  rua: string;
  bairro?: string;
  horarioEstimado?: string;
  lat: number;
  lon: number;
  telefone?: string;
  nomeDestinatario?: string;
}

export default function HomeScreen() {
  const navigation = useNavigation<any>();
  const { nomeUsuario } = useAuth();
  const [rotas, setRotas] = useState<Parada[]>([]);
  const [resumo, setResumo] = useState<ResumoRotaData | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [otimizando, setOtimizando] = useState(false);
  const [modalFinalizarAberto, setModalFinalizarAberto] = useState(false);
  const [modalImportarAberto, setModalImportarAberto] = useState(false);
  const [modalFechamentoAberto, setModalFechamentoAberto] = useState(false);
  const [modalAjudaLotesAberto, setModalAjudaLotesAberto] = useState(false);
  const [loteAtivoIndex, setLoteAtivoIndex] = useState(0);
  const [finalizando, setFinalizando] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isOffline, setIsOffline] = useState(false);

  const obterCoordenadasGPS = async (): Promise<{ lat?: number; lon?: number }> => {
    try {
      const loc = await obterLocalizacaoECidadeRapida();
      if (loc.lat && loc.lon) {
        return { lat: loc.lat, lon: loc.lon };
      }
      return {};
    } catch {
      return {};
    }
  };

  const carregarEntregas = useCallback(async () => {
    if (rotas.length === 0) {
      try {
        const cacheLocal = await carregarRotasLocalmente();
        if (cacheLocal.paradas && cacheLocal.paradas.length > 0) {
          setRotas(cacheLocal.paradas);
          setResumo(cacheLocal.resumo);
        }
      } catch {}
    }

    setCarregando(true);
    try {
      const gps = await obterCoordenadasGPS();
      const config = gps.lat && gps.lon ? { params: { lat: gps.lat, lon: gps.lon } } : undefined;
      const response = config ? await api.get("/rotas/atual", config) : await api.get("/rotas/atual");

      if (response.data) {
        const paradasServidor = response.data.paradas || [];
        const resumoServidor = response.data.resumo || null;

        setRotas(paradasServidor);
        setResumo(resumoServidor);
        setIsOffline(false);

        await salvarRotasLocalmente(paradasServidor, resumoServidor);
      }
    } catch {
      setIsOffline(true);
      const cacheLocal = await carregarRotasLocalmente();
      setRotas(cacheLocal.paradas);
      setResumo(cacheLocal.resumo);
      if (cacheLocal.paradas.length > 0) {
        alertaApp("Modo offline", "Não foi possível conectar ao servidor. Exibindo a rota salva localmente.");
      }
    } finally {
      setCarregando(false);
    }
  }, [rotas.length]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await carregarEntregas();
    setRefreshing(false);
  }, [carregarEntregas]);

  const lotes = useMemo(() => calcularLotes(rotas), [rotas]);
  const temVariosLotes = lotes.length > 1;

  const handleIniciarRota = useCallback(async () => {
    if (rotas.length === 0) {
      alertaApp("Atenção", "Nenhuma rota para iniciar.");
      return;
    }

    try {
      const gps = await obterCoordenadasGPS();
      await abrirRotaGoogleMaps(rotas, loteAtivoIndex, gps);
    } catch {
      alertaApp("Erro", "Não foi possível abrir o Google Maps.");
    }
  }, [rotas, loteAtivoIndex]);

  const handleOtimizarRota = useCallback(async () => {
    if (rotas.length === 0) {
      alertaApp("Atenção", "Cadastre pelo menos 1 entrega para otimizar a rota.");
      return;
    }

    setOtimizando(true);
    try {
      const gpsRapido = await obterLocalizacaoECidadeRapida();
      let latUsuario = gpsRapido.lat;
      let lonUsuario = gpsRapido.lon;

      if (!latUsuario || !lonUsuario) {
        const servicoAtivo = await Location.hasServicesEnabledAsync();
        if (servicoAtivo) {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status === "granted") {
            const loc = await Location.getLastKnownPositionAsync();
            if (loc?.coords) {
              latUsuario = loc.coords.latitude;
              lonUsuario = loc.coords.longitude;
            }
          }
        }
      }

      const response = await api.post("/rotas/otimizar", {
        latUsuario,
        lonUsuario,
      });

      if (response.data?.sucesso === false) {
        alertaApp("Erro", response.data?.erro || "Não foi possível otimizar a rota.");
        return;
      }

      await carregarEntregas();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      alertaApp(
        "Rota Otimizada!",
        "Deseja iniciar a rota e traçar o trajeto no Google Maps agora?",
        [
          {
            text: "Mais tarde",
            style: "cancel",
          },
          {
            text: "Iniciar no GPS",
            style: "default",
            onPress: () => {
              handleIniciarRota();
            },
          },
        ],
        "sucesso",
      );
    } catch (error) {
      alertaApp("Erro", "Não foi possível otimizar a rota.");
    } finally {
      setOtimizando(false);
    }
  }, [rotas.length, carregarEntregas, handleIniciarRota]);

  const confirmarFinalizacaoLote = useCallback(
    async (idsSelecionados: string[]) => {
      setFinalizando(true);
      try {
        await api.put("/rotas/finalizar", { ids: idsSelecionados });
        await carregarEntregas();
        setModalFinalizarAberto(false);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        alertaApp("Sucesso", "Entregas finalizadas com sucesso!");
      } catch (err: any) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        alertaApp("Erro", err?.response?.data?.erro || "Erro ao finalizar entregas.");
      } finally {
        setFinalizando(false);
      }
    },
    [carregarEntregas],
  );

  useFocusEffect(
    useCallback(() => {
      carregarEntregas();
    }, [carregarEntregas]),
  );

  const temRotas = rotas.length > 0;

  return (
    <SafeAreaView className="flex-1 bg-[#0b1320] px-4 pt-2">
      <StatusBar barStyle="light-content" />

      <View className="flex-1">
        {/* Cabeçalho de Status Tático do Cockpit */}
        <View className="flex-row items-center justify-between my-2.5">
          <View>
            <Text className="text-white text-lg font-bold">
              {temRotas ? `Cockpit de Rota • ${rotas.length} ${rotas.length === 1 ? "entrega" : "entregas"}` : `Olá, ${nomeUsuario}!`}
            </Text>
            <Text className="text-[#94a3b8] text-xs mt-0.5">
              {temRotas
                ? (temVariosLotes ? `Lote ${loteAtivoIndex + 1} de ${lotes.length} selecionado` : "Trajeto otimizado e pronto para navegação")
                : "Pronto para iniciar seu turno de entregas?"}
            </Text>
          </View>
        </View>

        {/* Card Resumo de Telemetria com Glanceability Solar */}
        <ResumoRotaCard resumo={resumo} fallbackTotalEntregas={rotas.length} isOffline={isOffline} />

        {/* Subcabeçalho de Ações: Nova Entrega e Importar da Lista */}
        <View className="flex-row items-center justify-between mb-2.5">
          <Text className="text-white font-bold text-sm">Sua rota otimizada</Text>

          <View className="flex-row items-center gap-2">
            <TouchableOpacity
              onPress={() => navigation.navigate("NovaEntrega")}
              className="bg-[#152033] border border-[#22334f] px-3 py-2 rounded-xl flex-row items-center gap-1.5 active:bg-[#1e2e48]"
              accessibilityRole="button"
              accessibilityLabel="Adicionar nova entrega manual"
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <Ionicons name="add" size={15} color="#22c55e" />
              <Text className="text-emerald-400 text-xs font-semibold">Nova</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setModalImportarAberto(true)}
              className="bg-[#152033] border border-[#22334f] px-3 py-2 rounded-xl flex-row items-center gap-1.5 active:bg-[#1e2e48]"
              accessibilityRole="button"
              accessibilityLabel="Importar lista de entregas"
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <Ionicons name="document-text-outline" size={14} color="#38bdf8" />
              <Text className="text-sky-400 text-xs font-semibold">Importar</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Botão de Otimizar Rota - Largura Total Ergonômica (Zero risco de corte em telas estreitas) */}
        {temRotas && (
          <TouchableOpacity
            onPress={handleOtimizarRota}
            disabled={otimizando}
            className="w-full bg-[#1e2e48] border border-emerald-500/40 h-[46px] rounded-xl flex-row items-center justify-center gap-2 mb-2.5 active:bg-emerald-900/30"
            accessibilityRole="button"
            accessibilityLabel="Otimizar Rota"
          >
            {otimizando ? (
              <ActivityIndicator size="small" color="#22c55e" />
            ) : (
              <>
                <Ionicons name="sparkles-outline" size={15} color="#22c55e" />
                <Text className="text-emerald-400 text-xs font-bold">Otimizar Rota</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {/* Seletor de Lotes quando rota excede 10 paradas (Com Botão Educativo) */}
        {temVariosLotes && (
          <View className="mb-2.5 bg-[#152033] p-2.5 rounded-xl border border-[#22334f]">
            <View className="flex-row items-center justify-between mb-2 px-1">
              <Text className="text-[#94a3b8] text-[10px] font-bold uppercase tracking-wider" maxFontSizeMultiplier={1.3}>
                Lotes de Navegação
              </Text>
              <TouchableOpacity
                onPress={() => setModalAjudaLotesAberto(true)}
                className="flex-row items-center gap-1 active:opacity-70"
                accessibilityRole="button"
                accessibilityLabel="Entender divisão em lotes do Google Maps"
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text className="text-emerald-400 text-[10px] font-semibold" maxFontSizeMultiplier={1.3}>
                  Google Maps (10 por vez)
                </Text>
                <Ionicons name="information-circle-outline" size={13} color="#38bdf8" />
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
              {lotes.map((lote, index) => {
                const isActive = index === loteAtivoIndex;
                const inicio = index * 10 + 1;
                const fim = index * 10 + lote.length;
                return (
                  <TouchableOpacity
                    key={index}
                    onPress={() => setLoteAtivoIndex(index)}
                    className={`px-3 py-2 rounded-xl border flex-row items-center gap-1.5 mr-2 ${
                      isActive ? "bg-emerald-500/20 border-emerald-400" : "bg-[#1e2e48] border-[#22334f] active:bg-[#152033]"
                    }`}
                    accessibilityRole="button"
                    accessibilityLabel={`Selecionar lote ${index + 1}`}
                  >
                    <Ionicons name="layers-outline" size={13} color={isActive ? "#22c55e" : "#94a3b8"} />
                    <Text className={`text-xs font-bold ${isActive ? "text-emerald-400" : "text-[#94a3b8]"}`} maxFontSizeMultiplier={1.3}>
                      Lote {index + 1} ({inicio} a {fim})
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Lista Ativa ou Hero Onboarding no Estado Vazio */}
        {carregando && rotas.length === 0 ? (
          <View className="py-8 justify-center items-center flex-1">
            <ActivityIndicator size="small" color="#22c55e" />
          </View>
        ) : temRotas ? (
          <GerenciadorRotas
            paradas={rotas}
            onAtualizarLista={carregarEntregas}
            onReordenarLocal={setRotas}
            refreshing={refreshing}
            onRefresh={onRefresh}
            isOffline={isOffline}
          />
        ) : (
          <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
            <View className="bg-[#152033] border border-[#22334f] rounded-2xl p-6 items-center my-3">
              <View className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 items-center justify-center mb-3">
                <Ionicons name="rocket-outline" size={28} color="#22c55e" />
              </View>
              <Text className="text-white font-bold text-base text-center">Pronto para rodar?</Text>
              <Text className="text-[#94a3b8] text-xs text-center mt-1.5 leading-5 max-w-[280px]">
                Cole sua lista de pedidos do WhatsApp ou adicione endereços avulsos para calcular a rota mais rápida.
              </Text>

              <View className="w-full gap-2.5 mt-5">
                <TouchableOpacity
                  onPress={() => setModalImportarAberto(true)}
                  className="w-full h-[50px] bg-[#22c55e] rounded-xl flex-row items-center justify-center active:bg-[#16a34a]"
                  accessibilityRole="button"
                  accessibilityLabel="Importar lista do WhatsApp"
                >
                  <Ionicons name="logo-whatsapp" size={18} color="#000000" style={{ marginRight: 8 }} />
                  <Text className="text-black font-extrabold text-xs tracking-wide">IMPORTAR DO WHATSAPP</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => navigation.navigate("NovaEntrega")}
                  className="w-full h-[48px] bg-[#1e2e48] border border-[#22334f] rounded-xl flex-row items-center justify-center active:bg-[#0b1320]"
                  accessibilityRole="button"
                  accessibilityLabel="Adicionar entrega manual"
                >
                  <Ionicons name="add-circle-outline" size={18} color="#38bdf8" style={{ marginRight: 8 }} />
                  <Text className="text-sky-300 font-bold text-xs">Adicionar Entrega Manual</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        )}

        {/* Botões de Ação Inferiores */}
        <View className="flex-row gap-2.5 mt-2">
          {temRotas ? (
            <>
              <TouchableOpacity
                className="flex-1 h-[52px] rounded-xl flex-row justify-center items-center mt-2 bg-[#22c55e] active:bg-[#16a34a]"
                onPress={handleIniciarRota}
                disabled={finalizando}
                accessibilityRole="button"
                accessibilityLabel={temVariosLotes ? `Iniciar Lote ${loteAtivoIndex + 1} no GPS` : "Iniciar no GPS"}
              >
                <Ionicons name="play" size={16} color="#000000" style={{ marginRight: 6 }} />
                <Text className="font-bold text-sm text-black">
                  {temVariosLotes ? `Iniciar Lote ${loteAtivoIndex + 1} no GPS` : "Iniciar no GPS"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                className="bg-[#152033] border border-emerald-500/40 px-4 h-[52px] rounded-xl flex-row justify-center items-center active:bg-[#1e2e48] mt-2"
                onPress={() => {
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                  setModalFinalizarAberto(true);
                }}
                disabled={finalizando}
                accessibilityRole="button"
                accessibilityLabel="Finalizar Rota"
              >
                <Ionicons name="checkmark-done-sharp" size={16} color="#22c55e" style={{ marginRight: 6 }} />
                <Text className="text-emerald-400 font-bold text-xs">Finalizar Rota</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              className="flex-1 h-[48px] rounded-xl flex-row justify-center items-center mt-2 bg-[#152033] border border-[#22334f] active:bg-[#1e2e48]"
              onPress={() => setModalFechamentoAberto(true)}
              accessibilityRole="button"
              accessibilityLabel="Fechamento do Turno de Hoje"
            >
              <Ionicons name="receipt-outline" size={16} color="#94a3b8" style={{ marginRight: 8 }} />
              <Text className="font-semibold text-xs text-[#94a3b8]">
                Fechamento do Turno de Hoje
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Modal de Fechamento com Seleção */}
      <FinalizarRotaModal
        visivel={modalFinalizarAberto}
        paradas={rotas}
        carregando={finalizando}
        onFechar={() => setModalFinalizarAberto(false)}
        onConfirmar={confirmarFinalizacaoLote}
      />

      {/* Modal de Importação em Massa */}
      <ImportarLoteModal
        visivel={modalImportarAberto}
        onFechar={() => setModalImportarAberto(false)}
        onImportadoComSucesso={carregarEntregas}
      />

      {/* Modal de Fechamento de Turno & Relatório */}
      <FechamentoTurnoModal
        visivel={modalFechamentoAberto}
        onFechar={() => setModalFechamentoAberto(false)}
      />

      {/* Modal Explicativo dos Lotes do Google Maps */}
      <Modal visible={modalAjudaLotesAberto} transparent animationType="fade">
        <View className="flex-1 bg-black/75 justify-center px-4">
          <View className="bg-[#152033] border border-[#22334f] rounded-2xl p-5">
            <View className="flex-row items-center mb-3">
              <View className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/30 items-center justify-center mr-3">
                <Ionicons name="layers-outline" size={20} color="#38bdf8" />
              </View>
              <Text className="text-white font-bold text-sm flex-1">Por que dividir em lotes de 10?</Text>
            </View>
            <Text className="text-[#94a3b8] text-xs leading-5 mb-5">
              O aplicativo oficial do Google Maps suporta no máximo 10 paradas por trajeto. Para você rodar o dia inteiro sem travamentos e com navegação curva a curva por voz, o Delivery Fast particiona suas entregas automaticamente em lotes sequenciais (1 a 10, 11 a 20, etc.).
            </Text>
            <TouchableOpacity
              onPress={() => setModalAjudaLotesAberto(false)}
              className="h-[48px] bg-[#22c55e] rounded-xl items-center justify-center active:bg-[#16a34a]"
              accessibilityRole="button"
              accessibilityLabel="Entendi, fechar explicação"
            >
              <Text className="text-black font-extrabold text-xs tracking-wide">ENTENDI, VAMOS RODAR!</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
