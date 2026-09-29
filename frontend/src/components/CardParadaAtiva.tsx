import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons, Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Parada } from "../screens/HomeScreen";

export interface CardParadaAtivaProps {
  parada: Parada;
  index?: number;
  totalParadas?: number;
  onConcluir: (parada: Parada) => void;
  onNavegarGPS: (parada: Parada) => void;
  onLigar?: (telefone?: string) => void;
  onWhatsapp?: (telefone?: string, nomeCliente?: string) => void;
  onOpcoes?: (parada: Parada, index: number) => void;
  onInsucesso?: (parada: Parada) => void;
}

export const CardParadaAtiva: React.FC<CardParadaAtivaProps> = ({
  parada,
  index = 0,
  totalParadas = 1,
  onConcluir,
  onNavegarGPS,
  onLigar,
  onWhatsapp,
  onOpcoes,
  onInsucesso,
}) => {
  const handlePressConcluir = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onConcluir(parada);
  };

  const handlePressGPS = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onNavegarGPS(parada);
  };

  const handlePressInsucesso = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    onInsucesso?.(parada);
  };

  return (
    <View className="bg-[#152033] rounded-2xl mb-3 border-2 border-emerald-500/50 p-4 shadow-xl shadow-emerald-500/10">
      {/* Cabeçalho do Card Ativo: Badge Pulsante, Contagem de Parada e Menu de Opções */}
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-row items-center">
          <View className="flex-row items-center bg-emerald-500/15 border border-emerald-500/40 px-2.5 py-1 rounded-full mr-2">
            <View className="w-2 h-2 rounded-full bg-[#22c55e] mr-1.5 animate-pulse" />
            <Text className="text-emerald-400 text-[11px] font-extrabold tracking-wider uppercase" maxFontSizeMultiplier={1.3}>
              EM ANDAMENTO • PARADA #{index + 1}
            </Text>
          </View>
          {totalParadas > 1 && (
            <Text className="text-[#64748b] text-[11px] font-medium">de {totalParadas}</Text>
          )}
        </View>

        {onOpcoes && (
          <TouchableOpacity
            onPress={() => onOpcoes(parada, index)}
            className="w-10 h-10 rounded-xl bg-[#1e2e48] border border-[#22334f] items-center justify-center active:bg-[#0b1320]"
            accessibilityRole="button"
            accessibilityLabel={`Opções da entrega ${index + 1}`}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <Ionicons name="ellipsis-vertical" size={17} color="#94a3b8" />
          </TouchableOpacity>
        )}
      </View>

      {/* Endereço de Destaque com Alta Visibilidade Solar */}
      <View className="mb-3.5">
        <Text className="text-white text-base font-bold leading-6" numberOfLines={3} maxFontSizeMultiplier={1.4}>
          {parada.rua}
        </Text>

        {parada.nomeDestinatario ? (
          <View className="flex-row items-center mt-1">
            <Feather name="user" size={13} color="#22c55e" style={{ marginRight: 5 }} />
            <Text className="text-emerald-400 text-xs font-semibold" numberOfLines={1}>
              {parada.nomeDestinatario}
            </Text>
          </View>
        ) : null}

        <View className="flex-row items-center flex-wrap gap-x-3 gap-y-1 mt-1">
          {parada.bairro ? (
            <View className="flex-row items-center">
              <Feather name="map-pin" size={12} color="#94a3b8" style={{ marginRight: 4 }} />
              <Text className="text-[#94a3b8] text-xs font-medium">{parada.bairro}</Text>
            </View>
          ) : null}

          {parada.horarioEstimado ? (
            <View className="flex-row items-center">
              <Feather name="clock" size={12} color="#64748b" style={{ marginRight: 4 }} />
              <Text className="text-[#64748b] text-[11px] font-medium">{parada.horarioEstimado}</Text>
            </View>
          ) : null}
        </View>
      </View>

      {/* Barra de Contato Rápido (Se houver telefone associado) */}
      {parada.telefone ? (
        <View className="flex-row items-center gap-2 mb-3.5 pb-3 border-b border-[#22334f]">
          {onLigar && (
            <TouchableOpacity
              onPress={() => onLigar(parada.telefone)}
              className="flex-1 flex-row items-center justify-center bg-[#1e2e48] border border-blue-500/30 h-11 rounded-xl active:bg-[#0b1320]"
              accessibilityRole="button"
              accessibilityLabel="Ligar para o destinatário"
            >
              <Ionicons name="call" size={15} color="#60a5fa" style={{ marginRight: 6 }} />
              <Text className="text-blue-400 text-xs font-bold">Ligar</Text>
            </TouchableOpacity>
          )}

          {onWhatsapp && (
            <TouchableOpacity
              onPress={() => onWhatsapp(parada.telefone, parada.nomeDestinatario)}
              className="flex-1 flex-row items-center justify-center bg-[#1e2e48] border border-emerald-500/30 h-11 rounded-xl active:bg-[#0b1320]"
              accessibilityRole="button"
              accessibilityLabel="Enviar mensagem no WhatsApp"
            >
              <Ionicons name="logo-whatsapp" size={15} color="#22c55e" style={{ marginRight: 6 }} />
              <Text className="text-emerald-400 text-xs font-bold">WhatsApp</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : null}

      {/* Botão Primário Gigante: CHEGUEI • CONCLUIR ENTREGA (54dp de altura para operação com luvas) */}
      <TouchableOpacity
        onPress={handlePressConcluir}
        className="w-full bg-[#22c55e] h-[54px] min-h-[54px] rounded-xl flex-row items-center justify-center mb-2.5 active:bg-[#16a34a] shadow-lg shadow-emerald-500/30"
        accessibilityRole="button"
        accessibilityLabel={`Concluir entrega para ${parada.rua}`}
      >
        <Ionicons name="checkmark-circle" size={20} color="#000000" style={{ marginRight: 6 }} />
        <Text className="text-black text-xs font-extrabold tracking-wider mr-1">CHEGUEI •</Text>
        <Text className="text-black text-xs font-black">Concluir Entrega</Text>
      </TouchableOpacity>

      {/* Linha Tática Secundária: Navegar no GPS e Tratamento de Exceção/Insucesso */}
      <View className="flex-row items-center gap-2">
        <TouchableOpacity
          onPress={handlePressGPS}
          className="flex-1 flex-row items-center justify-center bg-[#1e2e48] border border-sky-500/50 min-h-[48px] rounded-xl active:bg-[#0b1320]"
          accessibilityRole="button"
          accessibilityLabel="Abrir rota no GPS para esta entrega"
        >
          <Ionicons name="navigate" size={16} color="#38bdf8" style={{ marginRight: 5 }} />
          <Text className="text-sky-400 text-xs font-bold mr-1">ABRIR NO</Text>
          <Text className="text-sky-400 text-xs font-black">GPS</Text>
        </TouchableOpacity>

        {onInsucesso && (
          <TouchableOpacity
            onPress={handlePressInsucesso}
            className="flex-1 flex-row items-center justify-center bg-[#1e2e48] border border-amber-500/40 min-h-[48px] rounded-xl active:bg-[#0b1320]"
            accessibilityRole="button"
            accessibilityLabel="Relatar insucesso ou problema na entrega"
          >
            <Ionicons name="alert-circle-outline" size={16} color="#f59e0b" style={{ marginRight: 5 }} />
            <Text className="text-amber-400 text-xs font-bold">Problema</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};
