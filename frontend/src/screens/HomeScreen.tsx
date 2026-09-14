import React, { useState, useCallback, useMemo } from "react";
import { StatusBar, Text, TouchableOpacity, View, ActivityIndicator, Alert, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import * as Location from "expo-location";
import * as Haptics from "expo-haptics";
import { api } from "../services/api";
import { GerenciadorRotas } from "../components/GerenciadorRotas";
import { abrirRotaGoogleMaps, calcularLotes } from "../utils/navigation";
import { ResumoRotaCard, ResumoRotaData } from "../components/ResumoRotaCard";
import { FinalizarRotaModal } from "../components/FinalizarRotaModal";
import { ImportarLoteModal } from "../components/ImportarLoteModal";
import { carregarRotasLocalmente, salvarRotasLocalmente } from "../services/storage";
import { useAuth } from "../contexts/AuthContext";
import { obterLocalizacaoECidadeRapida } from "../services/location";

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
  const { nomeUsuario } = useAuth();
  const [rotas, setRotas] = useState<Parada[]>([]);
  const [resumo, setResumo] = useState<ResumoRotaData | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [otimizando, setOtimizando] = useState(false);
  const [modalFinalizarAberto, setModalFinalizarAberto] = useState(false);
  const [modalImportarAberto, setModalImportarAberto] = useState(false);
  const [loteAtivoIndex, setLoteAtivoIndex] = useState(0);
  const [finalizando, setFinalizando] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

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
    // Se ainda não temos rotas na memória, tenta carregar o cache local instantaneamente
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

        await salvarRotasLocalmente(paradasServidor, resumoServidor);
      }
    } catch {
      const cacheLocal = await carregarRotasLocalmente();
      setRotas(cacheLocal.paradas);
      setResumo(cacheLocal.resumo);
      if (cacheLocal.paradas.length > 0) {
        Alert.alert("Modo offline", "Não foi possível conectar ao servidor. Exibindo a rota salva localmente.");
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

  const handleOtimizarRota = useCallback(async () => {
    if (rotas.length === 0) {
      Alert.alert("Atenção", "Cadastre pelo menos 1 entrega para otimizar a rota.");
      return;
    }

    setOtimizando(true);
    try {
      // Pega coordenadas instantaneamente do serviço compartilhado
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
        Alert.alert("Erro", response.data?.erro || "Não foi possível otimizar a rota.");
        return;
      }

      const mensagem = response.data?.mensagem || "Rota otimizada com sucesso!";
      await carregarEntregas();
      Alert.alert("Sucesso", mensagem);
    } catch (error) {
      Alert.alert("Erro", "Não foi possível otimizar a rota.");
    } finally {
      setOtimizando(false);
    }
  }, [rotas.length, carregarEntregas]);

  const lotes = useMemo(() => calcularLotes(rotas), [rotas]);
  const temVariosLotes = lotes.length > 1;

  const handleIniciarRota = useCallback(async () => {
    if (rotas.length === 0) return;
    try {
      if (loteAtivoIndex === 0) {
        await abrirRotaGoogleMaps(rotas);
      } else {
        await abrirRotaGoogleMaps(rotas, loteAtivoIndex);
      }
    } catch {
      Alert.alert("Erro", "Não foi possível disparar a rota no GPS.");
    }
  }, [rotas, loteAtivoIndex]);

  const confirmarFinalizacaoLote = useCallback(
    async (idsConcluidos: string[]) => {
      if (idsConcluidos.length === 0) {
        Alert.alert("Atenção", "Nenhuma entrega marcada para finalizar.");
        return;
      }

      setFinalizando(true);
      try {
        await api.put("/rotas/concluir-todas", { idsConcluidos });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setModalFinalizarAberto(false);
        await carregarEntregas();
        Alert.alert("Sucesso", `${idsConcluidos.length} entrega(s) finalizada(s)!`);
      } catch {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert("Erro", "Não foi possível finalizar as entregas.");
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
        <View className="flex-row items-center justify-between my-3">
          <View>
            <Text className="text-white text-lg font-bold">Olá, {nomeUsuario}!</Text>
            <Text className="text-[#94A3B8] text-xs">Pronto para otimizar suas entregas?</Text>
          </View>
          <TouchableOpacity className="bg-[#152033] p-2.5 rounded-full border border-[#22334f]" accessibilityLabel="Notificações">
            <Ionicons name="notifications-outline" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <ResumoRotaCard resumo={resumo} fallbackTotalEntregas={rotas.length} />

        <View className="flex-row items-center justify-between mb-3">
          <Text className="text-white font-bold text-sm">Sua rota otimizada</Text>

          <View className="flex-row items-center gap-2">
            <TouchableOpacity
              onPress={() => setModalImportarAberto(true)}
              className="bg-[#152033] border border-[#22334f] px-2.5 py-1.5 rounded-lg flex-row items-center gap-1 active:bg-[#1e2e48]"
              accessibilityLabel="Importar lista"
            >
              <Ionicons name="document-text-outline" size={13} color="#38bdf8" />
              <Text className="text-sky-400 text-xs font-semibold">Importar</Text>
            </TouchableOpacity>

            {temRotas && (
              <TouchableOpacity
                onPress={handleOtimizarRota}
                disabled={otimizando}
                className="bg-[#1e2e48] border border-emerald-500/50 px-3 py-1.5 rounded-lg flex-row items-center gap-1.5 active:bg-emerald-950"
              >
                {otimizando ? (
                  <ActivityIndicator size="small" color="#22c55e" />
                ) : (
                  <>
                    <Ionicons name="sparkles-outline" size={14} color="#22c55e" />
                    <Text className="text-emerald-400 text-xs font-bold">Otimizar Rota</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Seletor de Lotes quando rota excede 10 paradas */}
        {temVariosLotes && (
          <View className="mb-2.5 bg-[#152033] p-2 rounded-xl border border-[#22334f]">
            <View className="flex-row items-center justify-between mb-1.5 px-1">
              <Text className="text-[#94a3b8] text-[10px] font-bold uppercase">Lotes de Navegação</Text>
              <Text className="text-emerald-400 text-[10px] font-semibold">Google Maps (10 por vez)</Text>
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
                    className={`px-3 py-1.5 rounded-lg border flex-row items-center gap-1.5 mr-2 ${
                      isActive ? "bg-emerald-500/20 border-emerald-400" : "bg-[#1e2e48] border-[#22334f]"
                    }`}
                  >
                    <Ionicons name="layers-outline" size={12} color={isActive ? "#22c55e" : "#94a3b8"} />
                    <Text className={`text-xs font-bold ${isActive ? "text-emerald-400" : "text-[#94a3b8]"}`}>
                      Lote {index + 1} ({inicio} a {fim})
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {carregando && rotas.length === 0 ? (
          <View className="py-8 justify-center items-center flex-1">
            <ActivityIndicator size="small" color="#22c55e" />
          </View>
        ) : (
          <GerenciadorRotas
            paradas={rotas}
            onAtualizarLista={carregarEntregas}
            onReordenarLocal={setRotas}
            refreshing={refreshing}
            onRefresh={onRefresh}
          />
        )}

        {/* Botões de Ação Inferiores */}
        <View className="flex-row gap-2 mt-2">
          <TouchableOpacity
            className={`flex-1 py-3.5 rounded-xl flex-row justify-center items-center mt-2 ${
              temRotas ? "bg-[#22c55e] active:bg-emerald-600" : "bg-[#1e2e48] opacity-50"
            }`}
            onPress={temRotas ? handleIniciarRota : undefined}
            disabled={!temRotas || finalizando}
            accessibilityLabel="Iniciar rota"
          >
            <Ionicons name="play" size={16} color={temRotas ? "#000000" : "#64748b"} style={{ marginRight: 6 }} />
            <Text className={`font-bold text-sm ${temRotas ? "text-black" : "text-[#64748b]"}`}>
              {temVariosLotes ? `Iniciar Lote ${loteAtivoIndex + 1} no GPS` : "Iniciar no GPS"}
            </Text>
          </TouchableOpacity>

          {temRotas && (
            <TouchableOpacity
              className="bg-[#152033] border border-emerald-500/50 px-4 py-3.5 rounded-xl flex-row justify-center items-center active:bg-emerald-950"
              onPress={() => {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                setModalFinalizarAberto(true);
              }}
              disabled={finalizando}
            >
              <Ionicons name="checkmark-done-sharp" size={16} color="#22c55e" style={{ marginRight: 6 }} />
              <Text className="text-emerald-400 font-bold text-xs">Finalizar Rota</Text>
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
    </SafeAreaView>
  );
}
