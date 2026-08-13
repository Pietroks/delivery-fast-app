import React, { useState, useMemo, useCallback } from "react";
import { StatusBar, Text, TouchableOpacity, View, ActivityIndicator, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import * as Location from "expo-location";
import { api } from "../services/api";
import { GerenciadorRotas } from "../components/GerenciadorRotas";
import { abrirRotaGoogleMaps } from "../utils/navigation";

export interface Parada {
  id: string;
  ordem: number;
  rua: string;
  bairro?: string;
  horarioEstimado?: string;
  lat: number;
  lon: number;
}

interface ResumoRota {
  totalEntregas: number;
  distanciaKm: number;
  tempoEstimadoMin: number;
  economiaEstimadaRs: number;
}

export default function HomeScreen() {
  const [rotas, setRotas] = useState<Parada[]>([]);
  const [resumo, setResumo] = useState<ResumoRota | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [otimizando, setOtimizando] = useState(false);

  const carregarEntregas = useCallback(async () => {
    setCarregando(true);
    try {
      const response = await api.get("/rotas/atual");
      if (response.data) {
        setRotas(response.data.paradas || []);
        setResumo(response.data.resumo || null);
      }
    } catch {
      setRotas([]);
    } finally {
      setCarregando(false);
    }
  }, []);

  const handleOtimizarRota = useCallback(async () => {
    // Agora permite otimizar mesmo com apenas 1 entrega cadastrada (GPS do Usuário + 1 Entrega)
    if (rotas.length === 0) {
      Alert.alert("Atenção", "Cadastre pelo menos 1 entrega para otimizar a rota.");
      return;
    }

    setOtimizando(true);
    try {
      // 1. Verifica se os serviços de GPS do celular estão ativos
      const servicoAtivo = await Location.hasServicesEnabledAsync();
      if (!servicoAtivo) {
        Alert.alert("GPS Desativado", "Por favor, ative a localização/GPS do seu celular para calcular a rota.");
        setOtimizando(false);
        return;
      }

      // 2. Solicita permissão explícita de localização
      const { status } = await Location.requestForegroundPermissionsAsync();
      let latUsuario: number | undefined;
      let lonUsuario: number | undefined;

      if (status !== "granted") {
        Alert.alert("Permissão negada", "O app precisa da sua localização para traçar a rota a partir de onde você está.");
      } else {
        // 3. Captura posição do GPS
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        latUsuario = location.coords.latitude;
        lonUsuario = location.coords.longitude;
      }

      // 4. Envia para o backend (Localização do Usuário + Entregas)
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

  useFocusEffect(
    useCallback(() => {
      carregarEntregas();
    }, [carregarEntregas]),
  );

  const totalEntregas = useMemo(() => resumo?.totalEntregas ?? rotas.length, [resumo?.totalEntregas, rotas.length]);
  const distanciaTotal = useMemo(() => resumo?.distanciaKm ?? 0, [resumo?.distanciaKm]);
  const tempoEstimado = useMemo(() => {
    if (!resumo?.tempoEstimadoMin) return "0h 0m";
    const h = Math.floor(resumo.tempoEstimadoMin / 60);
    const m = resumo.tempoEstimadoMin % 60;
    return `${h}h ${m}m`;
  }, [resumo?.tempoEstimadoMin]);
  const economiaEstimada = useMemo(() => resumo?.economiaEstimadaRs ?? 0, [resumo?.economiaEstimadaRs]);

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
          <GerenciadorRotas paradas={rotas} onAtualizarLista={carregarEntregas} />
        )}

        <TouchableOpacity
          className={`py-3.5 rounded-xl flex-row justify-center items-center mt-2 ${
            temRotas ? "bg-[#22c55e] active:bg-emerald-600" : "bg-[#1e2e48] opacity-50"
          }`}
          onPress={temRotas ? handleIniciarRota : undefined}
          disabled={!temRotas}
          accessibilityLabel="Iniciar rota"
        >
          <Ionicons name="play" size={16} color={temRotas ? "#000000" : "#64748b"} style={{ marginRight: 6 }} />
          <Text className={`font-bold text-sm ${temRotas ? "text-black" : "text-[#64748b]"}`}>Iniciar rota</Text>
        </TouchableOpacity>

        <Text className="text-center text-xs text-[#94A3B8] py-3">Você será redirecionado para o seu aplicativo de mapas preferido.</Text>
      </View>
    </SafeAreaView>
  );
}
