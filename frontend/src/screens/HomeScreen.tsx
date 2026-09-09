import React, { useState, useCallback } from "react";
import { StatusBar, Text, TouchableOpacity, View, ActivityIndicator, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import * as Location from "expo-location";
import * as Haptics from "expo-haptics";
import { api } from "../services/api";
import { GerenciadorRotas } from "../components/GerenciadorRotas";
import { abrirRotaGoogleMaps } from "../utils/navigation";
import { ResumoRotaCard, ResumoRotaData } from "../components/ResumoRotaCard";
import { FinalizarRotaModal } from "../components/FinalizarRotaModal";
import { carregarRotasLocalmente, salvarRotasLocalmente } from "../services/storage";

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
  const [rotas, setRotas] = useState<Parada[]>([]);
  const [resumo, setResumo] = useState<ResumoRotaData | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [otimizando, setOtimizando] = useState(false);
  const [modalFinalizarAberto, setModalFinalizarAberto] = useState(false);
  const [finalizando, setFinalizando] = useState(false);

  const obterCoordenadasGPS = async (): Promise<{ lat?: number; lon?: number }> => {
    try {
      const servicoAtivo = await Location.hasServicesEnabledAsync();
      if (!servicoAtivo) return {};

      const { status } = await Location.getForegroundPermissionsAsync();
      if (status !== "granted") return {};

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      return {
        lat: location.coords.latitude,
        lon: location.coords.longitude,
      };
    } catch {
      return {};
    }
  };

  const carregarEntregas = useCallback(async () => {
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
  }, []);

  const handleOtimizarRota = useCallback(async () => {
    if (rotas.length === 0) {
      Alert.alert("Atenção", "Cadastre pelo menos 1 entrega para otimizar a rota.");
      return;
    }

    setOtimizando(true);
    try {
      const servicoAtivo = await Location.hasServicesEnabledAsync();
      if (!servicoAtivo) {
        Alert.alert("GPS Desativado", "Por favor, ative a localização do celular para otimizar o trajeto.");
        setOtimizando(false);
        return;
      }

      const { status } = await Location.requestForegroundPermissionsAsync();
      let latUsuario: number | undefined;
      let lonUsuario: number | undefined;

      if (status === "granted") {
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        latUsuario = location.coords.latitude;
        lonUsuario = location.coords.longitude;
      }

      const response = await api.post("/rotas/otimizar", {
        latUsuario,
        lonUsuario,
      });

      const mensagem = response.data?.mensagem || "Rota otimizada com sucesso!";
      await carregarEntregas();
      Alert.alert("Sucesso", mensagem);
    } catch (error) {
      Alert.alert("Erro", "Não foi possível otimizar a rota.");
    } finally {
      setOtimizando(false);
    }
  }, [rotas.length, carregarEntregas]);

  const handleIniciarRota = useCallback(async () => {
    if (rotas.length === 0) return;
    try {
      await abrirRotaGoogleMaps(rotas);
    } catch {
      Alert.alert("Erro", "Não foi possível disparar a rota no GPS.");
    }
  }, [rotas]);

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
            <Text className="text-white text-lg font-bold">Olá, João!</Text>
            <Text className="text-[#94A3B8] text-xs">Pronto para otimizar suas entregas?</Text>
          </View>
          <TouchableOpacity className="bg-[#152033] p-2.5 rounded-full border border-[#22334f]" accessibilityLabel="Notificações">
            <Ionicons name="notifications-outline" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <ResumoRotaCard resumo={resumo} fallbackTotalEntregas={rotas.length} />

        <View className="flex-row items-center justify-between mb-3">
          <Text className="text-white font-bold text-sm">Sua rota otimizada</Text>

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

        {carregando ? (
          <View className="py-8 justify-center items-center">
            <ActivityIndicator size="small" color="#22c55e" />
          </View>
        ) : (
          <GerenciadorRotas paradas={rotas} onAtualizarLista={carregarEntregas} onReordenarLocal={setRotas} />
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
            <Text className={`font-bold text-sm ${temRotas ? "text-black" : "text-[#64748b]"}`}>Iniciar no GPS</Text>
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
    </SafeAreaView>
  );
}
