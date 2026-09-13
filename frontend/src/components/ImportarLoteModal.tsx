import React, { useState, useMemo } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
} from "react-native";
import { Ionicons, Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { api } from "../services/api";

interface ImportarLoteModalProps {
  visivel: boolean;
  onFechar: () => void;
  onImportadoComSucesso: () => void;
}

interface ItemImportado {
  rua: string;
  numero?: string;
  bairro?: string;
  cidade?: string;
  nomeDestinatario?: string;
  telefone?: string;
}

/**
 * Parser inteligente de linhas de texto coladas de WhatsApp/Bloco de Notas.
 * Suporta formatos como:
 * - Rua XV de Novembro, 1500 - Centro - João - 55999887766
 * - Av Brasil, 450, Bairro Operário
 * - Rua das Flores, 120
 */
export function parseLinhasParaEntregas(textoBruto: string): ItemImportado[] {
  if (!textoBruto?.trim()) return [];

  const linhas = textoBruto
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 2 && !l.startsWith("#") && !l.startsWith("//"));

  return linhas.map((linha) => {
    // Tenta quebrar por traços ou hífens para extrair partes
    const partesTraco = linha.split(/\s+-\s+/);
    let enderecoBase = partesTraco[0].trim();
    let bairro: string | undefined;
    let nomeDestinatario: string | undefined;
    let telefone: string | undefined;

    if (partesTraco.length > 1) {
      // Se houver mais partes: [Endereço, Bairro?, Nome?, Telefone?]
      partesTraco.slice(1).forEach((parte) => {
        const parteLimpa = parte.trim();
        const numeros = parteLimpa.replace(/\D/g, "");
        if (numeros.length >= 8 && numeros.length <= 13) {
          telefone = numeros;
        } else if (!bairro && (parteLimpa.toLowerCase().includes("centro") || parteLimpa.toLowerCase().includes("bairro"))) {
          bairro = parteLimpa.replace(/^bairro\s+/i, "");
        } else if (!nomeDestinatario) {
          nomeDestinatario = parteLimpa;
        }
      });
    }

    // Tenta separar rua e número na primeira parte (ex: "Rua A, 120" ou "Rua A 120")
    let rua = enderecoBase;
    let numero: string | undefined;

    const matchVirgula = enderecoBase.match(/^([^,]+),\s*(\d+[a-zA-Z]?)(.*)$/);
    if (matchVirgula) {
      rua = matchVirgula[1].trim();
      numero = matchVirgula[2].trim();
      if (matchVirgula[3]?.trim() && !bairro) {
        bairro = matchVirgula[3].replace(/^[\s,-]+/, "").trim();
      }
    }

    return {
      rua,
      numero,
      bairro,
      nomeDestinatario,
      telefone,
    };
  });
}

export const ImportarLoteModal: React.FC<ImportarLoteModalProps> = ({
  visivel,
  onFechar,
  onImportadoComSucesso,
}) => {
  const [texto, setTexto] = useState("");
  const [carregando, setCarregando] = useState(false);

  const paradasDetectadas = useMemo(() => parseLinhasParaEntregas(texto), [texto]);

  const handleImportar = async () => {
    if (paradasDetectadas.length === 0) {
      Alert.alert("Atenção", "Cole pelo menos uma linha de endereço válida.");
      return;
    }

    setCarregando(true);
    try {
      const response = await api.post("/entregas/lote", {
        entregas: paradasDetectadas,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTexto("");
      onImportadoComSucesso();
      onFechar();
      Alert.alert(
        "Sucesso",
        response.data?.mensagem || `${paradasDetectadas.length} entregas importadas com sucesso!`,
      );
    } catch (error: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      const mensagemErro = error.response?.data?.erro || "Falha ao importar o lote de entregas.";
      Alert.alert("Erro", mensagemErro);
    } finally {
      setCarregando(false);
    }
  };

  return (
    <Modal visible={visivel} transparent animationType="slide" onRequestClose={onFechar}>
      <View className="flex-1 justify-end bg-black/75">
        <View className="bg-[#152033] rounded-t-3xl border-t border-[#22334f] p-5 max-h-[90%]">
          {/* Cabeçalho */}
          <View className="flex-row items-center justify-between pb-3 border-b border-[#22334f]">
            <View className="flex-1 mr-2">
              <Text className="text-white text-base font-bold">Importar Lista de Entregas</Text>
              <Text className="text-[#94A3B8] text-xs mt-0.5">
                Cole a lista de endereços do WhatsApp ou bloco de notas
              </Text>
            </View>
            <TouchableOpacity onPress={onFechar} className="p-1" disabled={carregando}>
              <Ionicons name="close" size={22} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} className="my-3">
            <Text className="text-[#94a3b8] text-[11px] mb-2">
              Dica: Digite ou cole 1 endereço por linha. Se tiver número e nome, separe por vírgula ou traço.
            </Text>

            <TextInput
              className="bg-[#0b1320] border border-[#22334f] text-white p-3.5 rounded-xl text-xs min-h-[140px] leading-5 font-mono"
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              placeholder={`Exemplo:\nRua XV de Novembro, 1500 - Centro - Carlos\nAv Brasil, 450 - Maria - 55999887766\nRua das Flores, 120`}
              placeholderTextColor="#475569"
              value={texto}
              onChangeText={setTexto}
              editable={!carregando}
            />

            {/* Contador de Paradas Detectadas */}
            <View className="flex-row items-center justify-between mt-3 px-1">
              <View className="flex-row items-center gap-1.5">
                <Feather name="layers" size={14} color="#22c55e" />
                <Text className="text-emerald-400 font-bold text-xs">
                  {paradasDetectadas.length} parada(s) detectada(s)
                </Text>
              </View>

              {texto.length > 0 && (
                <TouchableOpacity onPress={() => setTexto("")} disabled={carregando}>
                  <Text className="text-[#94a3b8] text-xs">Limpar</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Preview das primeiras 3 paradas */}
            {paradasDetectadas.length > 0 && (
              <View className="mt-3 bg-[#0b1320]/60 p-2.5 rounded-xl border border-[#1e293b]">
                <Text className="text-[#64748b] text-[10px] font-bold mb-1 uppercase">Pré-visualização:</Text>
                {paradasDetectadas.slice(0, 3).map((item, idx) => (
                  <Text key={idx} className="text-[#cbd5e1] text-[11px] py-0.5" numberOfLines={1}>
                    • {item.rua}
                    {item.numero ? `, ${item.numero}` : ""}
                    {item.bairro ? ` (${item.bairro})` : ""}
                    {item.nomeDestinatario ? ` - ${item.nomeDestinatario}` : ""}
                  </Text>
                ))}
                {paradasDetectadas.length > 3 && (
                  <Text className="text-[#64748b] text-[10px] italic mt-1">
                    ... e mais {paradasDetectadas.length - 3} entrega(s)
                  </Text>
                )}
              </View>
            )}
          </ScrollView>

          {/* Botões de Ação */}
          <View className="pt-2 border-t border-[#22334f] flex-row gap-3">
            <TouchableOpacity
              onPress={onFechar}
              disabled={carregando}
              className="flex-1 py-3.5 rounded-xl border border-[#22334f] items-center justify-center"
            >
              <Text className="text-[#94A3B8] font-bold text-xs">Cancelar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleImportar}
              disabled={carregando || paradasDetectadas.length === 0}
              className={`flex-1 py-3.5 rounded-xl items-center justify-center ${
                paradasDetectadas.length > 0 ? "bg-[#22c55e] active:bg-emerald-600" : "bg-[#1e2e48] opacity-50"
              }`}
            >
              {carregando ? (
                <View className="flex-row items-center gap-2">
                  <ActivityIndicator size="small" color="#000000" />
                  <Text className="text-black font-bold text-xs">Importando...</Text>
                </View>
              ) : (
                <Text className="text-black font-bold text-xs">
                  Importar ({paradasDetectadas.length})
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};
