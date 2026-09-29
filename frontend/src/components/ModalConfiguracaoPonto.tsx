import React, { useState, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Switch,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { Ionicons, Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { ConfigPontoPartida, salvarConfigPontoPartida } from "../services/storage";
import { buscarEnderecoPorCep } from "../services/cep";

export interface ModalConfiguracaoPontoProps {
  visivel: boolean;
  configInicial: ConfigPontoPartida;
  onFechar: () => void;
  onSalvar: (novaConfig: ConfigPontoPartida) => void;
}

export const ModalConfiguracaoPonto: React.FC<ModalConfiguracaoPontoProps> = ({
  visivel,
  configInicial,
  onFechar,
  onSalvar,
}) => {
  const [tipo, setTipo] = useState<"gps" | "hub">(configInicial.tipo || "gps");
  const [hubEndereco, setHubEndereco] = useState(configInicial.hubEndereco || "");
  const [hubCep, setHubCep] = useState(configInicial.hubCep || "");
  const [hubLat, setHubLat] = useState<number | undefined>(configInicial.hubLat);
  const [hubLon, setHubLon] = useState<number | undefined>(configInicial.hubLon);
  const [retornarABase, setRetornarABase] = useState(configInicial.retornarABase || false);
  const [buscandoCep, setBuscandoCep] = useState(false);
  const [statusCep, setStatusCep] = useState<string | null>(null);

  useEffect(() => {
    if (visivel) {
      setTipo(configInicial.tipo || "gps");
      setHubEndereco(configInicial.hubEndereco || "");
      setHubCep(configInicial.hubCep || "");
      setHubLat(configInicial.hubLat);
      setHubLon(configInicial.hubLon);
      setRetornarABase(configInicial.retornarABase || false);
      setStatusCep(null);
    }
  }, [visivel, configInicial]);

  const handleBuscarCep = async () => {
    const cepLimpo = hubCep.replace(/\D/g, "");
    if (cepLimpo.length !== 8) {
      setStatusCep("CEP inválido (digite 8 dígitos).");
      return;
    }

    setBuscandoCep(true);
    setStatusCep(null);
    try {
      const res = await buscarEnderecoPorCep(cepLimpo);
      if (res && res.rua) {
        const enderecoCompleto = `${res.rua}${res.bairro ? ` - ${res.bairro}` : ""}${res.cidade ? `, ${res.cidade}` : ""}`;
        setHubEndereco(enderecoCompleto);
        if (res.lat && res.lon) {
          setHubLat(res.lat);
          setHubLon(res.lon);
          setStatusCep("Endereço e coordenadas localizados com sucesso!");
        } else {
          setStatusCep("Endereço localizado (coordenadas serão resolvidas na otimização).");
        }
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        setStatusCep("CEP não localizado. Preencha o endereço manualmente.");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      }
    } catch {
      setStatusCep("Erro ao buscar CEP. Preencha manualmente.");
    } finally {
      setBuscandoCep(false);
    }
  };

  const handleSalvar = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const novaConfig: ConfigPontoPartida = {
      tipo,
      hubEndereco: tipo === "hub" ? hubEndereco.trim() || undefined : undefined,
      hubCep: tipo === "hub" ? hubCep.trim() || undefined : undefined,
      hubLat: tipo === "hub" ? hubLat : undefined,
      hubLon: tipo === "hub" ? hubLon : undefined,
      retornarABase,
    };

    await salvarConfigPontoPartida(novaConfig);
    onSalvar(novaConfig);
    onFechar();
  };

  return (
    <Modal visible={visivel} transparent animationType="slide" onRequestClose={onFechar}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1 bg-black/80 justify-end"
      >
        <View className="bg-[#152033] border-t border-[#22334f] rounded-t-3xl max-h-[92%] p-5 shadow-2xl">
          {/* Cabeçalho do Modal */}
          <View className="flex-row items-center justify-between mb-4">
            <View className="flex-row items-center">
              <View className="w-10 h-10 rounded-xl bg-sky-500/15 border border-sky-500/30 items-center justify-center mr-3">
                <Ionicons name="location" size={22} color="#38bdf8" />
              </View>
              <View>
                <Text className="text-white text-base font-bold">Ponto de Partida e Retorno</Text>
                <Text className="text-[#94a3b8] text-xs">Configure o início e fim da sua jornada</Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={onFechar}
              className="w-9 h-9 rounded-full bg-[#1e2e48] border border-[#22334f] items-center justify-center active:bg-[#0b1320]"
              accessibilityRole="button"
              accessibilityLabel="Fechar modal de configuração"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close" size={18} color="#94a3b8" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} className="mb-2">
            {/* Seletor de Tipo de Partida: GPS vs Hub Fixo */}
            <Text className="text-[#94a3b8] text-xs font-bold uppercase tracking-wider mb-2">
              Origem da Rota
            </Text>

            <View className="flex-row gap-2 mb-4">
              {/* Opção GPS */}
              <TouchableOpacity
                onPress={() => {
                  Haptics.selectionAsync();
                  setTipo("gps");
                }}
                className={`flex-1 p-3.5 rounded-xl border items-center justify-center ${
                  tipo === "gps"
                    ? "bg-sky-500/15 border-sky-500"
                    : "bg-[#1e2e48] border-[#22334f] active:bg-[#152033]"
                }`}
                accessibilityRole="radio"
                accessibilityState={{ selected: tipo === "gps" }}
                accessibilityLabel="Partir da Localização Atual (GPS)"
              >
                <Ionicons
                  name="navigate-circle"
                  size={24}
                  color={tipo === "gps" ? "#38bdf8" : "#94a3b8"}
                  style={{ marginBottom: 4 }}
                />
                <Text className={`text-xs font-bold ${tipo === "gps" ? "text-sky-400" : "text-white"}`}>
                  GPS Ao Vivo
                </Text>
                <Text className="text-[#94a3b8] text-[10px] text-center mt-0.5">Onde você estiver agora</Text>
              </TouchableOpacity>

              {/* Opção Hub Fixo */}
              <TouchableOpacity
                onPress={() => {
                  Haptics.selectionAsync();
                  setTipo("hub");
                }}
                className={`flex-1 p-3.5 rounded-xl border items-center justify-center ${
                  tipo === "hub"
                    ? "bg-amber-500/15 border-amber-500"
                    : "bg-[#1e2e48] border-[#22334f] active:bg-[#152033]"
                }`}
                accessibilityRole="radio"
                accessibilityState={{ selected: tipo === "hub" }}
                accessibilityLabel="Partir de um Hub ou Galpão Fixo"
              >
                <Ionicons
                  name="business"
                  size={24}
                  color={tipo === "hub" ? "#f59e0b" : "#94a3b8"}
                  style={{ marginBottom: 4 }}
                />
                <Text className={`text-xs font-bold ${tipo === "hub" ? "text-amber-400" : "text-white"}`}>
                  Hub / Galpão
                </Text>
                <Text className="text-[#94a3b8] text-[10px] text-center mt-0.5">Endereço fixo cadastrado</Text>
              </TouchableOpacity>
            </View>

            {/* Configuração de Endereço do Hub (Visível quando Hub está selecionado) */}
            {tipo === "hub" && (
              <View className="bg-[#0b1320] border border-[#22334f] rounded-2xl p-4 mb-4">
                <Text className="text-white text-xs font-bold mb-3 flex-row items-center">
                  <Feather name="map-pin" size={13} color="#f59e0b" /> Endereço do Hub Central
                </Text>

                {/* Linha de CEP com Busca Automática */}
                <View className="flex-row items-center gap-2 mb-3">
                  <TextInput
                    className="flex-1 bg-[#152033] border border-[#22334f] text-white p-3 rounded-xl text-xs"
                    placeholder="CEP do Galpão (ex: 98800000)"
                    placeholderTextColor="#64748b"
                    value={hubCep}
                    onChangeText={setHubCep}
                    keyboardType="numeric"
                    maxLength={9}
                  />
                  <TouchableOpacity
                    onPress={handleBuscarCep}
                    disabled={buscandoCep}
                    className="bg-[#1e2e48] border border-sky-500/40 px-3.5 h-[44px] rounded-xl items-center justify-center active:bg-[#152033]"
                    accessibilityRole="button"
                    accessibilityLabel="Buscar CEP do Hub"
                  >
                    {buscandoCep ? (
                      <ActivityIndicator size="small" color="#38bdf8" />
                    ) : (
                      <Text className="text-sky-400 text-xs font-bold">Buscar</Text>
                    )}
                  </TouchableOpacity>
                </View>

                {/* Logradouro e Bairro */}
                <TextInput
                  className="bg-[#152033] border border-[#22334f] text-white p-3 rounded-xl text-xs mb-2"
                  placeholder="Nome do Galpão ou Rua, Número, Bairro"
                  placeholderTextColor="#64748b"
                  value={hubEndereco}
                  onChangeText={setHubEndereco}
                />

                {statusCep && (
                  <Text className={`text-[11px] ${statusCep.includes("sucesso") ? "text-emerald-400" : "text-amber-400"}`}>
                    {statusCep}
                  </Text>
                )}
              </View>
            )}

            {/* Alternador de Retorno à Base no Fechamento da Rota */}
            <View className="bg-[#0b1320] border border-[#22334f] rounded-2xl p-4 mb-4 flex-row items-center justify-between">
              <View className="flex-1 mr-3">
                <View className="flex-row items-center mb-1">
                  <Ionicons name="repeat" size={16} color="#22c55e" style={{ marginRight: 6 }} />
                  <Text className="text-white text-xs font-bold">Retorno à Base no Final</Text>
                </View>
                <Text className="text-[#94a3b8] text-[11px] leading-4">
                  Calcula o trajeto e a quilometragem de volta ao ponto inicial após a última entrega.
                </Text>
              </View>

              <Switch
                value={retornarABase}
                onValueChange={(val) => {
                  Haptics.selectionAsync();
                  setRetornarABase(val);
                }}
                thumbColor={retornarABase ? "#22c55e" : "#64748b"}
                trackColor={{ false: "#1e2e48", true: "#22c55e40" }}
              />
            </View>
          </ScrollView>

          {/* Botão de Salvar Preferência */}
          <View className="pt-2 border-t border-[#22334f]">
            <TouchableOpacity
              onPress={handleSalvar}
              className="w-full bg-[#22c55e] h-[52px] min-h-[52px] rounded-xl flex-row items-center justify-center active:bg-[#16a34a] shadow-lg shadow-emerald-500/20"
              accessibilityRole="button"
              accessibilityLabel="Salvar configuração de ponto de partida"
            >
              <Ionicons name="checkmark-sharp" size={19} color="#000000" style={{ marginRight: 6 }} />
              <Text className="text-black text-xs font-black tracking-wide uppercase">
                SALVAR CONFIGURAÇÃO
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};
