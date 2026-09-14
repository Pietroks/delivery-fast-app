import React, { useState, useEffect, useCallback } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  TextInput,
  Share,
  Alert,
} from "react-native";
import { Ionicons, Feather } from "@expo/vector-icons";
import * as Linking from "expo-linking";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { api } from "../services/api";

export const CHAVE_STORAGE_CONFIG_FECHAMENTO = "@delivery_fast:config_fechamento_v1";

export interface ConfigFechamento {
  taxaEntrega: string;
  diaria: string;
  valorKm: string;
  chavePix: string;
}

export interface InsucessoRelatorio {
  id: string;
  rua: string;
  bairro?: string;
  destinatario?: string;
  status?: string;
  motivo?: string;
}

export interface DadosRelatorioFechamento {
  data: string;
  totalParadas: number;
  totalEntregues: number;
  totalInsucessos: number;
  kmRodados: number;
  horaInicio: string;
  horaFim: string;
  duracaoMinutos: number;
  tempoMedioPorParada: number;
  financeiro: {
    taxaEntrega: number;
    valorKm: number;
    diaria: number;
    ganhosEntregas: number;
    ganhosKm: number;
    totalGanhos: number;
  };
  insucessos: InsucessoRelatorio[];
}

interface FechamentoTurnoModalProps {
  visivel: boolean;
  onFechar: () => void;
}

export const FechamentoTurnoModal: React.FC<FechamentoTurnoModalProps> = ({ visivel, onFechar }) => {
  const [carregando, setCarregando] = useState(true);
  const [editandoConfig, setEditandoConfig] = useState(false);
  const [salvandoConfig, setSalvandoConfig] = useState(false);

  const [taxaEntrega, setTaxaEntrega] = useState("8.00");
  const [diaria, setDiaria] = useState("0.00");
  const [valorKm, setValorKm] = useState("0.00");
  const [chavePix, setChavePix] = useState("");

  const [dados, setDados] = useState<DadosRelatorioFechamento | null>(null);

  // Carrega configurações pré-salvas do motorista
  const carregarConfiguracoes = useCallback(async () => {
    try {
      const salvo = await AsyncStorage.getItem(CHAVE_STORAGE_CONFIG_FECHAMENTO);
      if (salvo) {
        const parsed: ConfigFechamento = JSON.parse(salvo);
        if (parsed.taxaEntrega !== undefined) setTaxaEntrega(parsed.taxaEntrega);
        if (parsed.diaria !== undefined) setDiaria(parsed.diaria);
        if (parsed.valorKm !== undefined) setValorKm(parsed.valorKm);
        if (parsed.chavePix !== undefined) setChavePix(parsed.chavePix);
        return parsed;
      }
    } catch {}
    return { taxaEntrega: "8.00", diaria: "0.00", valorKm: "0.00", chavePix: "" };
  }, []);

  const buscarRelatorio = useCallback(
    async (tx: string, d: string, km: string) => {
      setCarregando(true);
      try {
        const taxaNum = parseFloat(tx.replace(",", ".")) || 0;
        const diariaNum = parseFloat(d.replace(",", ".")) || 0;
        const kmNum = parseFloat(km.replace(",", ".")) || 0;

        const response = await api.get("/relatorios/fechamento", {
          params: {
            taxaEntrega: taxaNum,
            diaria: diariaNum,
            valorKm: kmNum,
          },
        });

        if (response.data?.sucesso && response.data?.relatorio) {
          setDados(response.data.relatorio);
        }
      } catch (error) {
        Alert.alert("Erro", "Não foi possível carregar o relatório de fechamento.");
      } finally {
        setCarregando(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (visivel) {
      (async () => {
        const cfg = await carregarConfiguracoes();
        await buscarRelatorio(cfg.taxaEntrega, cfg.diaria, cfg.valorKm);
      })();
    }
  }, [visivel, carregarConfiguracoes, buscarRelatorio]);

  const handleSalvarConfig = async () => {
    setSalvandoConfig(true);
    try {
      const configParaSalvar: ConfigFechamento = {
        taxaEntrega: taxaEntrega || "0.00",
        diaria: diaria || "0.00",
        valorKm: valorKm || "0.00",
        chavePix: chavePix || "",
      };
      await AsyncStorage.setItem(CHAVE_STORAGE_CONFIG_FECHAMENTO, JSON.stringify(configParaSalvar));
      setEditandoConfig(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await buscarRelatorio(configParaSalvar.taxaEntrega, configParaSalvar.diaria, configParaSalvar.valorKm);
    } catch {
      Alert.alert("Erro", "Falha ao salvar as configurações.");
    } finally {
      setSalvandoConfig(false);
    }
  };

  const formatarDuração = (minutos: number) => {
    if (minutos < 60) return `${minutos}min`;
    const horas = Math.floor(minutos / 60);
    const minsRestantes = minutos % 60;
    return `${horas}h ${minsRestantes > 0 ? `${minsRestantes}min` : ""}`;
  };

  const gerarTextoCompartilhamento = () => {
    if (!dados) return "";

    const dataObj = new Date();
    const dataFormatada = dataObj.toLocaleDateString("pt-BR");
    const duracaoTexto = formatarDuração(dados.duracaoMinutos);

    let texto = `📋 *FECHAMENTO DE TURNO - DELIVERY FAST*\n`;
    texto += `📅 Data: ${dataFormatada} | ${dados.horaInicio} às ${dados.horaFim}\n\n`;

    texto += `📊 *RESUMO DO TURNO:*\n`;
    texto += `• Entregas realizadas: ${dados.totalEntregues} de ${dados.totalParadas}\n`;
    texto += `• Distância estimada: ${dados.kmRodados} km\n`;
    texto += `• Tempo em rota: ${duracaoTexto} (${dados.tempoMedioPorParada} min/parada)\n\n`;

    texto += `💰 *VALORES A RECEBER:*\n`;
    if (dados.financeiro.taxaEntrega > 0) {
      texto += `• Entregas: R$ ${dados.financeiro.ganhosEntregas.toFixed(2)} (${dados.totalEntregues}x R$ ${dados.financeiro.taxaEntrega.toFixed(2)})\n`;
    }
    if (dados.financeiro.diaria > 0) {
      texto += `• Diária fixa: R$ ${dados.financeiro.diaria.toFixed(2)}\n`;
    }
    if (dados.financeiro.valorKm > 0) {
      texto += `• Adicional por Km: R$ ${dados.financeiro.ganhosKm.toFixed(2)} (${dados.kmRodados} km)\n`;
    }
    texto += `👉 *TOTAL A PAGAR: R$ ${dados.financeiro.totalGanhos.toFixed(2)}*\n`;

    if (chavePix.trim()) {
      texto += `🔑 *Chave PIX:* ${chavePix.trim()}\n`;
    }

    if (dados.insucessos && dados.insucessos.length > 0) {
      texto += `\n⚠️ *DEVOLUÇÕES / CONFERÊNCIA (${dados.insucessos.length}):*\n`;
      dados.insucessos.forEach((ins, idx) => {
        texto += `${idx + 1}. ${ins.rua} (${ins.motivo || "Não entregue"})\n`;
      });
    }

    texto += `\n✅ Comprovantes com fotos e assinaturas arquivados no app.`;
    return texto;
  };

  const handleEnviarWhatsApp = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const texto = gerarTextoCompartilhamento();
    const url = `whatsapp://send?text=${encodeURIComponent(texto)}`;

    try {
      const suportado = await Linking.canOpenURL(url);
      if (suportado) {
        await Linking.openURL(url);
      } else {
        // Fallback para compartilhamento nativo geral
        await Share.share({ message: texto, title: "Fechamento de Turno" });
      }
    } catch {
      await Share.share({ message: texto, title: "Fechamento de Turno" });
    }
  };

  const handleCompartilharGeral = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const texto = gerarTextoCompartilhamento();
    try {
      await Share.share({ message: texto, title: "Fechamento de Turno - Delivery Fast" });
    } catch {}
  };

  return (
    <Modal visible={visivel} transparent animationType="slide" onRequestClose={onFechar}>
      <View className="flex-1 justify-end bg-black/75">
        <View className="bg-[#152033] rounded-t-3xl border-t border-[#22334f] p-5 max-h-[92%]">
          {/* Cabeçalho */}
          <View className="flex-row items-center justify-between pb-3 border-b border-[#22334f]">
            <View className="flex-row items-center">
              <View className="bg-emerald-500/10 p-2 rounded-xl border border-emerald-500/20 mr-2.5">
                <Ionicons name="receipt-outline" size={20} color="#22c55e" />
              </View>
              <View>
                <Text className="text-white text-base font-bold">Fechamento de Turno</Text>
                <Text className="text-[#94A3B8] text-xs">Resumo financeiro e operacional do dia</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onFechar} className="p-1">
              <Ionicons name="close" size={22} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          {carregando ? (
            <View className="py-16 items-center justify-center">
              <ActivityIndicator size="large" color="#22c55e" />
              <Text className="text-[#94a3b8] text-xs mt-3">Calculando totais do turno...</Text>
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} className="my-3">
              {/* Botão para Configurar Taxas */}
              <TouchableOpacity
                onPress={() => setEditandoConfig(!editandoConfig)}
                className="flex-row items-center justify-between bg-[#0b1320] p-3 rounded-xl mb-3 border border-[#22334f]"
              >
                <View className="flex-row items-center">
                  <Feather name="settings" size={14} color="#38bdf8" />
                  <Text className="text-[#38bdf8] text-xs font-semibold ml-2">
                    {editandoConfig ? "Fechar Ajuste de Taxas" : "Ajustar Taxa por Entrega / Diária / PIX"}
                  </Text>
                </View>
                <Ionicons
                  name={editandoConfig ? "chevron-up" : "chevron-down"}
                  size={16}
                  color="#38bdf8"
                />
              </TouchableOpacity>

              {/* Painel de Edição de Configurações */}
              {editandoConfig && (
                <View className="bg-[#0b1320] p-4 rounded-2xl border border-[#22334f] mb-4">
                  <Text className="text-white text-xs font-bold mb-3">Definir seus valores de cobrança:</Text>

                  <View className="flex-row gap-3 mb-3">
                    <View className="flex-1">
                      <Text className="text-[#94a3b8] text-[11px] mb-1">R$ por Entrega</Text>
                      <TextInput
                        value={taxaEntrega}
                        onChangeText={setTaxaEntrega}
                        keyboardType="decimal-pad"
                        placeholder="8.00"
                        placeholderTextColor="#64748b"
                        className="bg-[#152033] border border-[#22334f] rounded-xl px-3 py-2 text-white text-xs"
                      />
                    </View>

                    <View className="flex-1">
                      <Text className="text-[#94a3b8] text-[11px] mb-1">Diária Fixa (R$)</Text>
                      <TextInput
                        value={diaria}
                        onChangeText={setDiaria}
                        keyboardType="decimal-pad"
                        placeholder="0.00"
                        placeholderTextColor="#64748b"
                        className="bg-[#152033] border border-[#22334f] rounded-xl px-3 py-2 text-white text-xs"
                      />
                    </View>

                    <View className="flex-1">
                      <Text className="text-[#94a3b8] text-[11px] mb-1">R$ por Km</Text>
                      <TextInput
                        value={valorKm}
                        onChangeText={setValorKm}
                        keyboardType="decimal-pad"
                        placeholder="0.00"
                        placeholderTextColor="#64748b"
                        className="bg-[#152033] border border-[#22334f] rounded-xl px-3 py-2 text-white text-xs"
                      />
                    </View>
                  </View>

                  <View className="mb-3">
                    <Text className="text-[#94a3b8] text-[11px] mb-1">Chave PIX para Recebimento</Text>
                    <TextInput
                      value={chavePix}
                      onChangeText={setChavePix}
                      placeholder="CPF, Telefone ou E-mail PIX"
                      placeholderTextColor="#64748b"
                      className="bg-[#152033] border border-[#22334f] rounded-xl px-3 py-2 text-white text-xs"
                    />
                  </View>

                  <TouchableOpacity
                    onPress={handleSalvarConfig}
                    disabled={salvandoConfig}
                    className="bg-sky-500 py-2.5 rounded-xl items-center justify-center active:bg-sky-600"
                  >
                    {salvandoConfig ? (
                      <ActivityIndicator size="small" color="#000000" />
                    ) : (
                      <Text className="text-black font-bold text-xs">Salvar e Recalcular</Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}

              {/* Card Principal: Total Financeiro a Receber */}
              <View className="bg-[#10242a] p-5 rounded-2xl border border-emerald-500/40 mb-4 items-center">
                <Text className="text-[#94a3b8] text-xs font-semibold uppercase tracking-wider mb-1">
                  Total a Receber no Turno
                </Text>
                <Text className="text-emerald-400 font-extrabold text-3xl">
                  R$ {dados?.financeiro?.totalGanhos?.toFixed(2) || "0.00"}
                </Text>
                <Text className="text-[#94a3b8] text-[11px] mt-1">
                  {dados?.totalEntregues || 0} entregas feitas
                  {parseFloat(diaria) > 0 ? ` + R$ ${parseFloat(diaria).toFixed(2)} diária` : ""}
                  {parseFloat(valorKm) > 0 ? ` + R$ ${dados?.financeiro?.ganhosKm.toFixed(2)} km` : ""}
                </Text>
              </View>

              {/* Grid de 4 Indicadores Operacionais */}
              <View className="flex-row flex-wrap justify-between gap-2.5 mb-4">
                {/* Paradas */}
                <View className="bg-[#0b1320] p-3.5 rounded-2xl border border-[#22334f] w-[48%]">
                  <View className="flex-row items-center mb-1">
                    <Ionicons name="checkmark-done-circle" size={16} color="#22c55e" />
                    <Text className="text-[#94a3b8] text-[11px] ml-1.5">Entregas</Text>
                  </View>
                  <Text className="text-white font-bold text-lg">
                    {dados?.totalEntregues || 0}{" "}
                    <Text className="text-[#64748b] text-xs font-normal">/ {dados?.totalParadas || 0}</Text>
                  </Text>
                  <Text className="text-[#64748b] text-[10px] mt-0.5">
                    {dados?.totalInsucessos ? `${dados.totalInsucessos} devolução` : "100% de sucesso"}
                  </Text>
                </View>

                {/* Km Rodados */}
                <View className="bg-[#0b1320] p-3.5 rounded-2xl border border-[#22334f] w-[48%]">
                  <View className="flex-row items-center mb-1">
                    <Ionicons name="speedometer-outline" size={16} color="#38bdf8" />
                    <Text className="text-[#94a3b8] text-[11px] ml-1.5">Km Percorridos</Text>
                  </View>
                  <Text className="text-white font-bold text-lg">{dados?.kmRodados || 0} km</Text>
                  <Text className="text-[#64748b] text-[10px] mt-0.5">Distância viária</Text>
                </View>

                {/* Horários do Turno */}
                <View className="bg-[#0b1320] p-3.5 rounded-2xl border border-[#22334f] w-[48%]">
                  <View className="flex-row items-center mb-1">
                    <Ionicons name="time-outline" size={16} color="#f59e0b" />
                    <Text className="text-[#94a3b8] text-[11px] ml-1.5">Tempo do Turno</Text>
                  </View>
                  <Text className="text-white font-bold text-sm">
                    {formatarDuração(dados?.duracaoMinutos || 0)}
                  </Text>
                  <Text className="text-[#64748b] text-[10px] mt-0.5">
                    {dados?.horaInicio} às {dados?.horaFim}
                  </Text>
                </View>

                {/* Média por Parada */}
                <View className="bg-[#0b1320] p-3.5 rounded-2xl border border-[#22334f] w-[48%]">
                  <View className="flex-row items-center mb-1">
                    <Ionicons name="flash-outline" size={16} color="#a855f7" />
                    <Text className="text-[#94a3b8] text-[11px] ml-1.5">Média / Parada</Text>
                  </View>
                  <Text className="text-white font-bold text-sm">
                    {dados?.tempoMedioPorParada || 0} min
                  </Text>
                  <Text className="text-[#64748b] text-[10px] mt-0.5">Tempo por entrega</Text>
                </View>
              </View>

              {/* Lista de Insucessos / Devoluções (Se houver) */}
              {dados?.insucessos && dados.insucessos.length > 0 && (
                <View className="bg-[#21160a] p-3.5 rounded-2xl border border-amber-500/40 mb-4">
                  <View className="flex-row items-center mb-2">
                    <Ionicons name="alert-circle" size={16} color="#f59e0b" />
                    <Text className="text-amber-400 font-bold text-xs ml-1.5">
                      Devoluções para Conferência ({dados.insucessos.length})
                    </Text>
                  </View>
                  {dados.insucessos.map((item, idx) => (
                    <View key={item.id || idx} className="py-1 border-t border-[#3b2713] first:border-t-0">
                      <Text className="text-white text-[11px] font-semibold" numberOfLines={1}>
                        • {item.rua}
                      </Text>
                      <Text className="text-[#f59e0b] text-[10px]">
                        Motivo: {item.motivo || "Não entregue"}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </ScrollView>
          )}

          {/* Botões de Ação */}
          <View className="pt-2 border-t border-[#22334f] gap-2">
            <TouchableOpacity
              onPress={handleEnviarWhatsApp}
              activeOpacity={0.8}
              className="bg-emerald-500 py-3.5 rounded-xl flex-row items-center justify-center active:bg-emerald-600"
            >
              <Ionicons name="logo-whatsapp" size={18} color="#000000" />
              <Text className="text-black font-bold text-xs ml-2">Enviar Acerto no WhatsApp</Text>
            </TouchableOpacity>

            <View className="flex-row gap-2">
              <TouchableOpacity
                onPress={handleCompartilharGeral}
                activeOpacity={0.8}
                className="flex-1 py-3 rounded-xl border border-[#22334f] bg-[#0b1320] flex-row items-center justify-center"
              >
                <Ionicons name="share-social-outline" size={16} color="#94a3b8" />
                <Text className="text-[#94A3B8] font-bold text-xs ml-2">Outros Apps</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={onFechar}
                activeOpacity={0.8}
                className="flex-1 py-3 rounded-xl border border-[#22334f] items-center justify-center"
              >
                <Text className="text-[#94A3B8] font-bold text-xs">Fechar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};
