import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { Ionicons, Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Parada } from "../screens/HomeScreen";

export interface DadosInsucesso {
  motivoFalha: string;
  observacao?: string;
  moverParaFinal: boolean;
}

export interface InsucessoEntregaModalProps {
  visivel: boolean;
  parada: Parada | null;
  carregando?: boolean;
  onFechar: () => void;
  onConfirmar: (dados: DadosInsucesso) => Promise<void> | void;
}

export const MOTIVOS_INSUCESSO = [
  {
    id: "destinatario_ausente",
    label: "Destinatário Ausente",
    descricao: "Ninguém atende ou portão fechado",
    icone: "user-x" as const,
  },
  {
    id: "endereco_nao_localizado",
    label: "Endereço Não Localizado",
    descricao: "Número inexistente ou rua sem acesso",
    icone: "map-pin" as const,
  },
  {
    id: "recusado",
    label: "Recusado pelo Destinatário",
    descricao: "Mercadoria avariada ou pedido incorreto",
    icone: "slash" as const,
  },
  {
    id: "problema_operacional",
    label: "Problema Operacional",
    descricao: "Chuva forte, pneu furado ou imprevisto",
    icone: "alert-triangle" as const,
  },
];

export const InsucessoEntregaModal: React.FC<InsucessoEntregaModalProps> = ({
  visivel,
  parada,
  carregando = false,
  onFechar,
  onConfirmar,
}) => {
  const [motivoSelecionado, setMotivoSelecionado] = useState<string>("destinatario_ausente");
  const [observacao, setObservacao] = useState("");

  const handleSelecionarMotivo = (id: string) => {
    Haptics.selectionAsync();
    setMotivoSelecionado(id);
  };

  const handleAcao = (moverParaFinal: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onConfirmar({
      motivoFalha: motivoSelecionado,
      observacao: observacao.trim() || undefined,
      moverParaFinal,
    });
  };

  if (!parada) return null;

  return (
    <Modal visible={visivel} transparent animationType="slide" onRequestClose={onFechar}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1 bg-black/80 justify-end"
      >
        <View className="bg-[#152033] border-t border-[#22334f] rounded-t-3xl max-h-[90%] p-5 shadow-2xl">
          {/* Cabeçalho do Modal */}
          <View className="flex-row items-center justify-between mb-4">
            <View className="flex-row items-center">
              <View className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 items-center justify-center mr-3">
                <Ionicons name="alert-circle" size={22} color="#f59e0b" />
              </View>
              <View>
                <Text className="text-white text-base font-bold">Relatar Insucesso</Text>
                <Text className="text-[#94a3b8] text-xs">O que aconteceu nesta parada?</Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={onFechar}
              disabled={carregando}
              className="w-9 h-9 rounded-full bg-[#1e2e48] border border-[#22334f] items-center justify-center active:bg-[#0b1320]"
              accessibilityRole="button"
              accessibilityLabel="Fechar modal de insucesso"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close" size={18} color="#94a3b8" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} className="mb-2">
            {/* Resumo do Endereço Afetado */}
            <View className="bg-[#0b1320] border border-[#22334f] rounded-xl p-3 mb-4">
              <Text className="text-[#94a3b8] text-[11px] font-bold uppercase tracking-wider mb-1">
                Endereço da Entrega
              </Text>
              <Text className="text-white text-sm font-semibold leading-5" numberOfLines={2}>
                {parada.rua}
              </Text>
              {parada.nomeDestinatario ? (
                <Text className="text-emerald-400 text-xs mt-0.5">Destinatário: {parada.nomeDestinatario}</Text>
              ) : null}
            </View>

            {/* Lista de Motivos Selecionáveis */}
            <Text className="text-[#94a3b8] text-xs font-bold uppercase tracking-wider mb-2.5">
              Selecione o Motivo
            </Text>

            <View className="gap-2 mb-4">
              {MOTIVOS_INSUCESSO.map((item) => {
                const isSelected = motivoSelecionado === item.id;
                return (
                  <TouchableOpacity
                    key={item.id}
                    onPress={() => handleSelecionarMotivo(item.id)}
                    className={`flex-row items-center p-3 rounded-xl border ${
                      isSelected
                        ? "bg-amber-500/15 border-amber-500/60"
                        : "bg-[#1e2e48] border-[#22334f] active:bg-[#152033]"
                    }`}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: isSelected }}
                    accessibilityLabel={item.label}
                  >
                    <View
                      className={`w-9 h-9 rounded-lg items-center justify-center mr-3 ${
                        isSelected ? "bg-amber-500/20" : "bg-[#0b1320]"
                      }`}
                    >
                      <Feather name={item.icone} size={18} color={isSelected ? "#f59e0b" : "#94a3b8"} />
                    </View>

                    <View className="flex-1">
                      <Text
                        className={`text-sm font-bold ${isSelected ? "text-amber-400" : "text-white"}`}
                      >
                        {item.label}
                      </Text>
                      <Text className="text-[#94a3b8] text-xs mt-0.5">{item.descricao}</Text>
                    </View>

                    <Ionicons
                      name={isSelected ? "radio-button-on" : "radio-button-off"}
                      size={20}
                      color={isSelected ? "#f59e0b" : "#64748b"}
                    />
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Campo Opcional de Observação */}
            <Text className="text-[#94a3b8] text-xs font-bold uppercase tracking-wider mb-2">
              Observação Adicional (Opcional)
            </Text>
            <TextInput
              className="bg-[#0b1320] border border-[#22334f] text-white p-3.5 rounded-xl text-xs mb-4 min-h-[70px]"
              placeholder="Ex: Portão com cadeado, ninguém atendeu ao interfone"
              placeholderTextColor="#64748b"
              value={observacao}
              onChangeText={setObservacao}
              multiline
              maxLength={200}
              textAlignVertical="top"
            />
          </ScrollView>

          {/* Botões Táticos de Decisão */}
          <View className="gap-2.5 pt-2 border-t border-[#22334f]">
            {/* Opção A: Reordenar para o Final (Permite tentar de novo no final) */}
            <TouchableOpacity
              onPress={() => handleAcao(true)}
              disabled={carregando}
              className="w-full bg-[#1e2e48] border border-amber-500/50 min-h-[50px] rounded-xl flex-row items-center justify-center active:bg-amber-950/30 px-3"
              accessibilityRole="button"
              accessibilityLabel="Tentar novamente no final do turno"
            >
              {carregando ? (
                <ActivityIndicator size="small" color="#f59e0b" />
              ) : (
                <View className="flex-row items-center">
                  <Ionicons name="refresh" size={17} color="#f59e0b" style={{ marginRight: 8 }} />
                  <View>
                    <Text className="text-amber-400 text-xs font-extrabold tracking-wide uppercase">
                      TENTAR NO FINAL DO TURNO
                    </Text>
                    <Text className="text-[#94a3b8] text-[10px]">
                      Move a parada para a última posição da rota
                    </Text>
                  </View>
                </View>
              )}
            </TouchableOpacity>

            {/* Opção B: Encerrar como Falha Definitiva */}
            <TouchableOpacity
              onPress={() => handleAcao(false)}
              disabled={carregando}
              className="w-full bg-red-500/20 border border-red-500/50 min-h-[50px] rounded-xl flex-row items-center justify-center active:bg-red-950/40 px-3"
              accessibilityRole="button"
              accessibilityLabel="Encerrar como entrega com falha"
            >
              {carregando ? (
                <ActivityIndicator size="small" color="#ef4444" />
              ) : (
                <View className="flex-row items-center">
                  <Ionicons name="close-circle" size={17} color="#ef4444" style={{ marginRight: 8 }} />
                  <View>
                    <Text className="text-red-400 text-xs font-extrabold tracking-wide uppercase">
                      ENCERRAR COMO FALHA
                    </Text>
                    <Text className="text-[#94a3b8] text-[10px]">
                      Remove da rota atual e grava no histórico
                    </Text>
                  </View>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};
