import React, { useState, useEffect, useCallback } from "react";
import { Modal, View, Text, TouchableOpacity, FlatList, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Parada } from "../screens/HomeScreen";

interface FinalizarRotaModalProps {
  visivel: boolean;
  paradas: Parada[];
  carregando: boolean;
  onFechar: () => void;
  onConfirmar: (idsConcluidos: string[]) => Promise<void>;
}

export const FinalizarRotaModal: React.FC<FinalizarRotaModalProps> = ({ visivel, paradas, carregando, onFechar, onConfirmar }) => {
  const [selecionados, setSelecionados] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (visivel) {
      const mapaInicial: Record<string, boolean> = {};
      paradas.forEach((p) => {
        mapaInicial[p.id] = true;
      });
      setSelecionados(mapaInicial);
    }
  }, [visivel, paradas]);

  const toggleItem = useCallback((id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelecionados((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  }, []);

  const handleSalvar = async () => {
    const idsParaConcluir = Object.keys(selecionados).filter((id) => selecionados[id]);
    await onConfirmar(idsParaConcluir);
  };

  const totalMarcadas = Object.values(selecionados).filter(Boolean).length;

  return (
    <Modal visible={visivel} transparent animationType="slide" onRequestClose={onFechar}>
      <View className="flex-1 justify-end bg-black/70">
        <View className="bg-[#152033] rounded-t-3xl border-t border-[#22334f] p-5 max-h-[85%]">
          {/* Cabeçalho */}
          <View className="flex-row items-center justify-between pb-3 border-b border-[#22334f]">
            <View className="flex-1 mr-2">
              <Text className="text-white text-base font-bold">Finalizar Rota</Text>
              <Text className="text-[#94A3B8] text-xs mt-0.5">Desmarque os pedidos que não puderam ser entregues</Text>
            </View>
            <TouchableOpacity onPress={onFechar} className="p-1" disabled={carregando}>
              <Ionicons name="close" size={22} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          {/* Lista de Paradas com Checkbox */}
          <FlatList
            data={paradas}
            keyExtractor={(item) => item.id}
            className="my-3 max-h-80"
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => {
              const isChecked = !!selecionados[item.id];
              return (
                <TouchableOpacity
                  onPress={() => toggleItem(item.id)}
                  activeOpacity={0.7}
                  className={`flex-row items-center p-3 rounded-xl mb-2 border ${
                    isChecked ? "bg-[#10242a] border-emerald-500/40" : "bg-[#0b1320] border-[#22334f] opacity-60"
                  }`}
                >
                  <View
                    className={`w-6 h-6 rounded-lg mr-3 items-center justify-center border ${
                      isChecked ? "bg-emerald-500 border-emerald-400" : "border-[#64748b]"
                    }`}
                  >
                    {isChecked && <Ionicons name="checkmark" size={16} color="#000000" />}
                  </View>

                  <View className="flex-1">
                    <Text className="text-white text-xs font-semibold" numberOfLines={1}>
                      {item.rua}
                    </Text>
                    <Text className="text-[#94A3B8] text-[10px]">
                      {item.nomeDestinatario ? `${item.nomeDestinatario} • ` : ""}
                      {item.bairro || "Sem bairro"}
                    </Text>
                  </View>

                  <Text className={`text-[10px] font-bold ml-2 ${isChecked ? "text-emerald-400" : "text-amber-400"}`}>
                    {isChecked ? "Entregue" : "Pendente"}
                  </Text>
                </TouchableOpacity>
              );
            }}
          />

          {/* Botões de Ação */}
          <View className="pt-2 border-t border-[#22334f] flex-row gap-3">
            <TouchableOpacity
              onPress={onFechar}
              disabled={carregando}
              className="flex-1 py-3 rounded-xl border border-[#22334f] items-center justify-center"
            >
              <Text className="text-[#94A3B8] font-bold text-xs">Cancelar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleSalvar}
              disabled={carregando}
              className="flex-1 bg-emerald-500 py-3 rounded-xl items-center justify-center active:bg-emerald-600"
            >
              {carregando ? (
                <ActivityIndicator size="small" color="#000000" />
              ) : (
                <Text className="text-black font-bold text-xs">
                  Confirmar ({totalMarcadas}/{paradas.length})
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};
