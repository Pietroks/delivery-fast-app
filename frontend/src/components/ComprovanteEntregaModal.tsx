import React, { useState, useEffect, useRef } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  Alert,
  ScrollView,
  PanResponder,
  GestureResponderEvent,
  PanResponderGestureState,
} from "react-native";
import { Ionicons, Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { Parada } from "../screens/HomeScreen";

export interface DadosComprovante {
  status: "entregue";
  recebidoPor?: string;
  documentoRecebedor?: string;
  fotoComprovante?: string;
  assinaturaDigital?: string;
}

interface ComprovanteEntregaModalProps {
  visivel: boolean;
  parada: Parada | null;
  carregando: boolean;
  onFechar: () => void;
  onConfirmar: (dados: DadosComprovante) => Promise<void>;
}

interface Traço {
  pontos: { x: number; y: number }[];
}

export const ComprovanteEntregaModal: React.FC<ComprovanteEntregaModalProps> = ({
  visivel,
  parada,
  carregando,
  onFechar,
  onConfirmar,
}) => {
  const [abaAtiva, setAbaAtiva] = useState<"foto" | "assinatura">("foto");
  const [fotoUri, setFotoUri] = useState<string | null>(null);
  const [recebidoPor, setRecebidoPor] = useState("");
  const [documentoRecebedor, setDocumentoRecebedor] = useState("");
  const [tracos, setTracos] = useState<Traço[]>([]);
  const tracoAtualRef = useRef<{ x: number; y: number }[]>([]);

  useEffect(() => {
    if (visivel && parada) {
      setRecebidoPor(parada.nomeDestinatario || "");
      setDocumentoRecebedor("");
      setFotoUri(null);
      setTracos([]);
      tracoAtualRef.current = [];
      setAbaAtiva("foto");
    }
  }, [visivel, parada]);

  // PanResponder para o Canvas de Assinatura Digital na tela
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt: GestureResponderEvent) => {
        const { locationX, locationY } = evt.nativeEvent;
        tracoAtualRef.current = [{ x: locationX, y: locationY }];
      },
      onPanResponderMove: (evt: GestureResponderEvent) => {
        const { locationX, locationY } = evt.nativeEvent;
        tracoAtualRef.current.push({ x: locationX, y: locationY });
        setTracos((anteriores) => [...anteriores.slice(0, -1), { pontos: [...tracoAtualRef.current] }]);
      },
      onPanResponderRelease: () => {
        if (tracoAtualRef.current.length > 0) {
          setTracos((anteriores) => [...anteriores, { pontos: [...tracoAtualRef.current] }]);
          tracoAtualRef.current = [];
        }
      },
    }),
  ).current;

  const limparAssinatura = () => {
    setTracos([]);
    tracoAtualRef.current = [];
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const tirarFoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permissão da Câmera", "É necessário permitir o acesso à câmera para fotografar o comprovante.");
        return;
      }

      const resultado = await ImagePicker.launchCameraAsync({
        quality: 0.6,
        allowsEditing: false,
      });

      if (!resultado.canceled && resultado.assets?.[0]?.uri) {
        setFotoUri(resultado.assets[0].uri);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch {
      Alert.alert("Erro", "Não foi possível abrir a câmera no momento.");
    }
  };

  const escolherDaGaleria = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permissão da Galeria", "É necessário permitir o acesso às fotos para escolher um comprovante.");
        return;
      }

      const resultado = await ImagePicker.launchImageLibraryAsync({
        quality: 0.6,
        allowsEditing: false,
      });

      if (!resultado.canceled && resultado.assets?.[0]?.uri) {
        setFotoUri(resultado.assets[0].uri);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch {
      Alert.alert("Erro", "Não foi possível abrir a galeria no momento.");
    }
  };

  const temAssinatura = tracos.length > 0;
  const temComprovante = !!fotoUri || temAssinatura || !!documentoRecebedor.trim();

  const handleConfirmarComComprovante = async () => {
    const dados: DadosComprovante = {
      status: "entregue",
      recebidoPor: recebidoPor.trim() || parada?.nomeDestinatario || undefined,
      documentoRecebedor: documentoRecebedor.trim() || undefined,
      fotoComprovante: fotoUri || undefined,
      assinaturaDigital: temAssinatura ? `svg_paths:${tracos.length}_strokes` : undefined,
    };

    await onConfirmar(dados);
  };

  const handleConclusaoRapida = async () => {
    await onConfirmar({
      status: "entregue",
      recebidoPor: recebidoPor.trim() || parada?.nomeDestinatario || undefined,
    });
  };

  if (!parada) return null;

  return (
    <Modal visible={visivel} transparent animationType="slide" onRequestClose={onFechar}>
      <View className="flex-1 justify-end bg-black/75">
        <View className="bg-[#152033] rounded-t-3xl border-t border-[#22334f] p-5 max-h-[92%]">
          {/* Cabeçalho */}
          <View className="flex-row items-center justify-between pb-3 border-b border-[#22334f]">
            <View className="flex-1 mr-2">
              <Text className="text-white text-base font-bold">Comprovante de Entrega</Text>
              <Text className="text-emerald-400 text-xs mt-0.5" numberOfLines={1}>
                Parada #{parada.ordem}: {parada.rua}
              </Text>
            </View>
            <TouchableOpacity onPress={onFechar} className="p-1" disabled={carregando}>
              <Ionicons name="close" size={22} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          {/* Abas de Escolha */}
          <View className="flex-row bg-[#0b1320] p-1 rounded-xl my-3 border border-[#22334f]">
            <TouchableOpacity
              onPress={() => setAbaAtiva("foto")}
              className={`flex-1 py-2 rounded-lg flex-row justify-center items-center gap-1.5 ${
                abaAtiva === "foto" ? "bg-emerald-500/20 border border-emerald-500/40" : ""
              }`}
            >
              <Ionicons name="camera-outline" size={16} color={abaAtiva === "foto" ? "#22c55e" : "#94a3b8"} />
              <Text className={`text-xs font-bold ${abaAtiva === "foto" ? "text-emerald-400" : "text-[#94a3b8]"}`}>
                Foto da Encomenda
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setAbaAtiva("assinatura")}
              className={`flex-1 py-2 rounded-lg flex-row justify-center items-center gap-1.5 ${
                abaAtiva === "assinatura" ? "bg-emerald-500/20 border border-emerald-500/40" : ""
              }`}
            >
              <Feather name="edit-3" size={15} color={abaAtiva === "assinatura" ? "#22c55e" : "#94a3b8"} />
              <Text className={`text-xs font-bold ${abaAtiva === "assinatura" ? "text-emerald-400" : "text-[#94a3b8]"}`}>
                Assinatura & Dados
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} className="max-h-80">
            {abaAtiva === "foto" ? (
              <View className="py-2">
                {fotoUri ? (
                  <View className="items-center">
                    <View className="w-full h-52 rounded-2xl overflow-hidden border border-emerald-500/40 bg-black">
                      <Image source={{ uri: fotoUri }} className="w-full h-full" resizeMode="cover" />
                    </View>

                    <View className="flex-row gap-3 mt-3 w-full">
                      <TouchableOpacity
                        onPress={tirarFoto}
                        className="flex-1 bg-[#1e2e48] border border-[#22334f] py-2.5 rounded-xl flex-row items-center justify-center gap-1.5"
                      >
                        <Ionicons name="camera-reverse-outline" size={16} color="#38bdf8" />
                        <Text className="text-sky-400 text-xs font-semibold">Tirar Outra</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => setFotoUri(null)}
                        className="flex-1 bg-red-500/10 border border-red-500/30 py-2.5 rounded-xl flex-row items-center justify-center gap-1.5"
                      >
                        <Ionicons name="trash-outline" size={16} color="#ef4444" />
                        <Text className="text-red-400 text-xs font-semibold">Remover Foto</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <View className="space-y-3 gap-3">
                    <TouchableOpacity
                      onPress={tirarFoto}
                      activeOpacity={0.7}
                      className="bg-[#0b1320] border border-dashed border-emerald-500/40 p-6 rounded-2xl items-center justify-center"
                    >
                      <View className="w-12 h-12 rounded-full bg-emerald-500/10 items-center justify-center mb-2">
                        <Ionicons name="camera" size={24} color="#22c55e" />
                      </View>
                      <Text className="text-white font-bold text-sm">Tirar Foto do Pacote</Text>
                      <Text className="text-[#94a3b8] text-[11px] mt-1 text-center">
                        Fotografe o pacote entregue na porta ou em mãos
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={escolherDaGaleria}
                      activeOpacity={0.7}
                      className="bg-[#152033] border border-[#22334f] p-3.5 rounded-xl flex-row items-center justify-center gap-2"
                    >
                      <Ionicons name="images-outline" size={16} color="#38bdf8" />
                      <Text className="text-sky-400 text-xs font-semibold">Escolher da Galeria</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ) : (
              <View className="py-2">
                <View className="mb-3">
                  <Text className="text-[#94a3b8] text-xs font-medium mb-1">Nome de quem recebeu</Text>
                  <TextInput
                    placeholderTextColor="#64748b"
                    className="bg-[#0b1320] border border-[#22334f] rounded-xl px-3.5 py-2.5 text-xs text-white"
                    placeholder="Nome completo do recebedor"
                    value={recebidoPor}
                    onChangeText={setRecebidoPor}
                  />
                </View>

                <View className="mb-3">
                  <Text className="text-[#94a3b8] text-xs font-medium mb-1">Documento (RG ou CPF) - opcional</Text>
                  <TextInput
                    placeholderTextColor="#64748b"
                    className="bg-[#0b1320] border border-[#22334f] rounded-xl px-3.5 py-2.5 text-xs text-white"
                    placeholder="Ex: 12.345.678-9"
                    value={documentoRecebedor}
                    onChangeText={setDocumentoRecebedor}
                  />
                </View>

                {/* Painel Tátil para Assinatura */}
                <View className="mb-1">
                  <View className="flex-row items-center justify-between mb-1">
                    <Text className="text-[#94a3b8] text-xs font-medium">Assinatura na Tela</Text>
                    {temAssinatura && (
                      <TouchableOpacity onPress={limparAssinatura}>
                        <Text className="text-red-400 text-[11px] font-semibold">Limpar traço</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  <View
                    {...panResponder.panHandlers}
                    className="bg-[#0b1320] h-32 rounded-xl border border-dashed border-[#334155] justify-center items-center relative overflow-hidden"
                  >
                    {!temAssinatura ? (
                      <Text className="text-[#475569] text-xs pointer-events-none">
                        Peça para o cliente assinar com o dedo aqui
                      </Text>
                    ) : (
                      <View className="w-full h-full relative">
                        {tracos.map((traco, tIdx) => (
                          <View key={tIdx}>
                            {traco.pontos.map((p, pIdx) => (
                              <View
                                key={pIdx}
                                style={{
                                  position: "absolute",
                                  left: p.x - 2,
                                  top: p.y - 2,
                                  width: 4,
                                  height: 4,
                                  borderRadius: 2,
                                  backgroundColor: "#22c55e",
                                }}
                              />
                            ))}
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                </View>
              </View>
            )}
          </ScrollView>

          {/* Botões de Ação */}
          <View className="pt-3 border-t border-[#22334f] flex-row gap-2">
            <TouchableOpacity
              onPress={handleConclusaoRapida}
              disabled={carregando}
              className="flex-1 bg-[#1e2e48] border border-[#22334f] py-3.5 rounded-xl items-center justify-center active:bg-[#1e293b]"
            >
              <Text className="text-[#94a3b8] font-bold text-xs">Concluir Rápido</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleConfirmarComComprovante}
              disabled={carregando}
              className={`flex-1 py-3.5 rounded-xl items-center justify-center ${
                temComprovante ? "bg-[#22c55e] active:bg-emerald-600" : "bg-emerald-700"
              }`}
            >
              {carregando ? (
                <View className="flex-row items-center gap-2">
                  <ActivityIndicator size="small" color="#000000" />
                  <Text className="text-black font-bold text-xs">Finalizando...</Text>
                </View>
              ) : (
                <Text className="text-black font-bold text-xs">
                  {temComprovante ? "Salvar com Comprovante" : "Confirmar Entrega"}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};
