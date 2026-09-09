import React, { useState, useCallback, useRef, useEffect } from "react";
import { ActivityIndicator, Alert, ScrollView, StatusBar, Switch, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { api } from "../services/api";
import * as Location from "expo-location";

interface NovaEntregaScreenProps {
  onVoltar?: () => void;
  onEntregaSalva?: () => void;
}

// ============================================================================
// Máscaras e validações
// ============================================================================

/** Formata número bruto (só dígitos) para (XX) XXXXX-XXXX */
function formatarTelefone(texto: string): string {
  const digitos = texto.replace(/\D/g, "").slice(0, 11);
  if (digitos.length <= 2) return digitos;
  if (digitos.length <= 7) return `(${digitos.slice(0, 2)}) ${digitos.slice(2)}`;
  if (digitos.length <= 10) return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 6)}-${digitos.slice(6)}`;
  return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 7)}-${digitos.slice(7)}`;
}

/** Valida número de celular brasileiro. Retorna string de erro ou "" */
function validarCelular(texto: string): string {
  const puro = texto.replace(/\D/g, "");
  if (puro.length === 0) return "";
  if (puro.length < 10 || puro.length > 11) return "Celular deve ter 10 ou 11 dígitos.";
  const ddd = parseInt(puro.slice(0, 2), 10);
  if (ddd < 11 || ddd > 99) return "DDD inválido.";
  if (puro.length === 11 && puro[2] !== "9") return "Celular deve começar com 9 após o DDD.";
  return "";
}

/** Formata o CEP para o padrão XXXXX-XXX */
function formatarCep(texto: string): string {
  const digitos = texto.replace(/\D/g, "").slice(0, 8);
  if (digitos.length <= 5) return digitos;
  return `${digitos.slice(0, 5)}-${digitos.slice(5)}`;
}

/** Valida o CEP. Retorna string de erro ou "" */
function validarCep(texto: string): string {
  const puro = texto.replace(/\D/g, "");
  if (puro.length === 0) return "";
  if (puro.length !== 8) return "CEP deve ter 8 dígitos.";
  return "";
}

// ============================================================================
// Subcomponentes
// ============================================================================

interface FormInputProps {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (text: string) => void;
  keyboardType?: "default" | "phone-pad" | "numeric";
  error?: string;
  classNameCustom?: string;
  onBlur?: () => void;
}

const FormInput: React.FC<FormInputProps> = React.memo(
  ({ label, placeholder, value, onChangeText, keyboardType = "default", error, classNameCustom = "mb-4", onBlur }) => (
    <View className={classNameCustom}>
      <Text className="text-[#94a3b8] text-xs font-medium mb-1.5">{label}</Text>
      <TextInput
        placeholderTextColor="#64748b"
        className={`bg-[#152033] border rounded-xl px-3.5 py-3 text-sm text-white ${error ? "border-red-500" : "border-[#22334F]"}`}
        placeholder={placeholder}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        accessibilityLabel={label}
        onBlur={onBlur}
      />
      {error ? <Text className="text-red-400 text-[10px] mt-1 ml-1">{error}</Text> : null}
    </View>
  ),
);
FormInput.displayName = "FormInput";

// ============================================================================
// Componente principal
// ============================================================================
export default function NovaEntregaScreen({ onVoltar, onEntregaSalva }: NovaEntregaScreenProps) {
  const navigation = useNavigation();

  // Campos de endereço
  const [rua, setRua] = useState("");
  const [numero, setNumero] = useState("");
  const [bairro, setBairro] = useState("");
  const [cidade, setCidade] = useState("Santo Ângelo");
  const [cep, setCep] = useState("");
  const [cepErro, setCepErro] = useState("");

  // Outros dados
  const [referencia, setReferencia] = useState("");
  const [nomeDestinatario, setNomeDestinatario] = useState("");
  const [telefone, setTelefone] = useState("");
  const [telefoneErro, setTelefoneErro] = useState("");
  const [telefoneTouched, setTelefoneTouched] = useState(false);
  const [cepTouched, setCepTouched] = useState(false);

  const [adicionarARotaAtual, setAdicionarARotaAtual] = useState(true);
  const [carregando, setCarregando] = useState(false);
  const [cidadeDetectadaViaGPS, setCidadeDetectadaViaGPS] = useState(false);

  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const limparFormulario = useCallback(() => {
    setRua("");
    setNumero("");
    setBairro("");
    setCep("");
    setCepErro("");
    setCepTouched(false);
    setReferencia("");
    setNomeDestinatario("");
    setTelefone("");
    setTelefoneErro("");
    setTelefoneTouched(false);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === "granted") {
          const location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });

          const [endereco] = await Location.reverseGeocodeAsync({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          });

          if (endereco?.city || endereco?.subregion) {
            const nomeCidade = endereco.city || endereco.subregion || "";
            setCidade(nomeCidade);
            setCidadeDetectadaViaGPS(true);
          }
        }
      } catch {}
    })();
  }, []);

  const handleVoltarAction = useCallback(() => {
    if (onVoltar) onVoltar();
    else if (navigation.canGoBack()) navigation.goBack();
  }, [onVoltar, navigation]);

  const handleTelefoneChange = useCallback(
    (texto: string) => {
      const formatado = formatarTelefone(texto);
      setTelefone(formatado);
      if (telefoneTouched) {
        setTelefoneErro(validarCelular(formatado));
      }
    },
    [telefoneTouched],
  );

  const handleTelefoneBlur = useCallback(() => {
    setTelefoneTouched(true);
    setTelefoneErro(validarCelular(telefone));
  }, [telefone]);

  const handleCepChange = useCallback(
    (texto: string) => {
      const formatado = formatarCep(texto);
      setCep(formatado);
      if (cepTouched) {
        setCepErro(validarCep(formatado));
      }
    },
    [cepTouched],
  );

  const handleCepBlur = useCallback(() => {
    setCepTouched(true);
    setCepErro(validarCep(cep));
  }, [cep]);

  const handleSalvarEntrega = useCallback(async () => {
    if (!rua.trim()) {
      Alert.alert("Atenção", "Informe a rua / logradouro.");
      return;
    }
    if (!numero.trim()) {
      Alert.alert("Atenção", "Informe o número da residência.");
      return;
    }
    if (!nomeDestinatario.trim()) {
      Alert.alert("Atenção", "Informe o nome do destinatário.");
      return;
    }

    let latUsuario: number | undefined;
    let lonUsuario: number | undefined;

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === "granted") {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        latUsuario = loc.coords.latitude;
        lonUsuario = loc.coords.longitude;
      }
    } catch {}

    const enderecoFormatadoExato = `${rua.trim()}, ${numero.trim()}${bairro.trim() ? ` - ${bairro.trim()}` : ""}${cidade.trim() ? `, ${cidade.trim()}` : ""}${cep.trim() ? ` - CEP: ${cep.trim()}` : ""}`;

    setCarregando(true);
    try {
      await api.post("/entregas", {
        endereco: enderecoFormatadoExato,
        rua: rua.trim(),
        numero: numero.trim(),
        bairro: bairro.trim(),
        cidade: cidade.trim(),
        cep: cep.replace(/\D/g, ""),
        referencia: referencia.trim(),
        nomeDestinatario: nomeDestinatario.trim(),
        telefone: telefone.replace(/\D/g, ""),
        adicionarARotaAtual,
        latUsuario,
        lonUsuario,
      });

      limparFormulario();
      Alert.alert("Sucesso", "Entrega cadastrada com sucesso!");
      onEntregaSalva?.();
      handleVoltarAction();
    } catch (error: unknown) {
      let mensagem = "Não foi possível salvar a entrega.";
      if (error instanceof Error) {
        const axiosError = error as { response?: { data?: { erro?: string } } };
        mensagem = axiosError.response?.data?.erro || error.message;
      }
      Alert.alert("Erro", mensagem);
    } finally {
      setCarregando(false);
    }
  }, [
    rua,
    numero,
    bairro,
    cidade,
    cep,
    referencia,
    nomeDestinatario,
    telefone,
    adicionarARotaAtual,
    onEntregaSalva,
    handleVoltarAction,
    limparFormulario,
  ]);

  return (
    <SafeAreaView className="flex-1 bg-[#0b1320] px-4 pt-2">
      <StatusBar barStyle="light-content" />

      {/* Cabeçalho */}
      <View className="flex-row items-center my-3">
        <TouchableOpacity onPress={handleVoltarAction} className="p-1 mr-3">
          <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <Text className="text-white text-base font-bold flex-1 text-center mr-6">Nova entrega</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
        <FormInput label="Logradouro / Rua *" placeholder="Ex: Rua XV de Novembro" value={rua} onChangeText={setRua} />

        <View className="flex-row gap-3">
          <FormInput
            label="Número *"
            placeholder="Ex: 1500"
            value={numero}
            onChangeText={setNumero}
            keyboardType="numeric"
            classNameCustom="flex-1 mb-4"
          />
          <FormInput label="Bairro" placeholder="Ex: Centro" value={bairro} onChangeText={setBairro} classNameCustom="flex-1 mb-4" />
        </View>

        <View className="flex-row gap-3">
          <View className="flex-1 mb-4">
            <View className="flex-row items-center justify-between mb-1.5">
              <Text className="text-[#94a3b8] text-xs font-medium">Cidade *</Text>

              {cidadeDetectadaViaGPS && (
                <View className="flex-row items-center bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                  <Ionicons name="location-sharp" size={12} color="#22c55e" style={{ marginRight: 4 }} />
                  <Text className="text-emerald-400 text-[10px] font-semibold">Detectado via GPS</Text>
                </View>
              )}
            </View>

            <TextInput
              placeholderTextColor="#64748b"
              className="bg-[#152033] border border-[#22334F] rounded-xl px-3.5 py-3 text-sm text-white"
              placeholder="Ex: Santo Ângelo"
              value={cidade}
              onChangeText={(texto) => {
                setCidade(texto);
                setCidadeDetectadaViaGPS(false);
              }}
            />
          </View>
          <FormInput
            label="CEP (opcional)"
            placeholder="98800-000"
            value={cep}
            onChangeText={handleCepChange}
            keyboardType="numeric"
            classNameCustom="flex-1 mb-4"
            error={cepTouched ? cepErro : ""}
            onBlur={handleCepBlur}
          />
        </View>

        <FormInput
          label="Referência (opcional)"
          placeholder="Ex: Casa azul, ao lado do mercado"
          value={referencia}
          onChangeText={setReferencia}
        />
        <FormInput label="Nome do destinatário *" placeholder="Digite o nome" value={nomeDestinatario} onChangeText={setNomeDestinatario} />
        <FormInput
          label="Telefone"
          placeholder="(55) 99999-9999"
          value={telefone}
          onChangeText={handleTelefoneChange}
          keyboardType="phone-pad"
          error={telefoneTouched ? telefoneErro : ""}
          onBlur={handleTelefoneBlur}
        />

        {/* Switch rota atual */}
        <View className="flex-row items-center justify-between my-2">
          <Text className="text-white text-xs font-medium">Adicionar à rota atual</Text>
          <Switch
            value={adicionarARotaAtual}
            onValueChange={setAdicionarARotaAtual}
            trackColor={{ false: "#152033", true: "#16a34a" }}
            thumbColor={adicionarARotaAtual ? "#22c55e" : "#94a3b8"}
          />
        </View>

        {/* Botão de salvar */}
        <TouchableOpacity
          className="bg-[#22c55e] py-3.5 rounded-xl items-center mt-4 mb-8 active:bg-emerald-600"
          onPress={handleSalvarEntrega}
          disabled={carregando}
        >
          {carregando ? (
            <View className="flex-row items-center gap-2">
              <ActivityIndicator color="#000" />
              <Text className="text-black font-bold text-sm">Salvando...</Text>
            </View>
          ) : (
            <Text className="text-black font-bold text-sm">Salvar entrega</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
