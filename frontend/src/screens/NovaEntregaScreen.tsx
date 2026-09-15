import React, { useState, useCallback, useRef, useEffect } from "react";
import { ActivityIndicator, Alert, ScrollView, StatusBar, Switch, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { api } from "../services/api";
import * as Location from "expo-location";
import { obterLocalizacaoECidadeRapida, setCidadeEmCache, getCidadeEmCache } from "../services/location";
import { alertaApp } from "../contexts/AlertContext";

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
  const [cidade, setCidade] = useState("");
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

  const coordsGpsRef = useRef<{ lat?: number; lon?: number }>({});
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

  // Executa toda vez que a tela ganha foco (seja via aba ou via botão + da Stack)
  useFocusEffect(
    useCallback(() => {
      let cancelado = false;

      // Se já temos uma cidade em cache global, preenche de imediato
      const cidadeCache = getCidadeEmCache();
      if (cidadeCache && !cidade) {
        setCidade(cidadeCache);
        setCidadeDetectadaViaGPS(true);
      }

      (async () => {
        try {
          const resultado = await obterLocalizacaoECidadeRapida();
          if (cancelado) return;

          if (resultado.lat && resultado.lon) {
            coordsGpsRef.current = { lat: resultado.lat, lon: resultado.lon };
          }

          if (resultado.cidade && (!cidade || !cidadeDetectadaViaGPS)) {
            setCidade(resultado.cidade);
            setCidadeDetectadaViaGPS(true);
            setCidadeEmCache(resultado.cidade);
          }
        } catch {}
      })();

      return () => {
        cancelado = true;
      };
    }, [cidade, cidadeDetectadaViaGPS]),
  );

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
    // 1. Trava síncrona imediata contra cliques múltiplos no botão
    if (carregando) return;

    if (!rua.trim()) {
      alertaApp("Atenção", "Informe a rua / logradouro.");
      return;
    }
    if (!nomeDestinatario.trim()) {
      alertaApp("Atenção", "Informe o nome do destinatário.");
      return;
    }

    setCarregando(true);

    try {
      let latUsuario = coordsGpsRef.current.lat;
      let lonUsuario = coordsGpsRef.current.lon;

      if (!latUsuario || !lonUsuario) {
        const rapida = await obterLocalizacaoECidadeRapida();
        latUsuario = rapida.lat;
        lonUsuario = rapida.lon;
      }

      if (cidade.trim()) {
        setCidadeEmCache(cidade.trim());
      }

      const ruaTexto = rua.trim();
      const numTexto = numero.trim();
      const enderecoFormatadoExato = `${ruaTexto}${numTexto ? `, ${numTexto}` : ""}${bairro.trim() ? ` - ${bairro.trim()}` : ""}${cidade.trim() ? `, ${cidade.trim()}` : ""}${cep.trim() ? ` - CEP: ${cep.trim()}` : ""}`;

      await api.post("/entregas", {
        endereco: enderecoFormatadoExato,
        rua: ruaTexto,
        numero: numTexto || undefined,
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
      alertaApp("Sucesso", "Entrega cadastrada com sucesso!");
      onEntregaSalva?.();
      handleVoltarAction();
    } catch (error: unknown) {
      let mensagem = "Não foi possível salvar a entrega.";
      if (error instanceof Error) {
        const axiosError = error as { response?: { data?: { erro?: string } } };
        mensagem = axiosError.response?.data?.erro || error.message;
      }
      alertaApp("Erro", mensagem);
    } finally {
      if (mountedRef.current) {
        setCarregando(false);
      }
    }
  }, [
    carregando,
    rua,
    numero,
    nomeDestinatario,
    bairro,
    cidade,
    cep,
    referencia,
    telefone,
    adicionarARotaAtual,
    limparFormulario,
    onEntregaSalva,
    handleVoltarAction,
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
        <FormInput label="Logradouro / Rua / Plus Code *" placeholder="Ex: Rua XV de Novembro" value={rua} onChangeText={setRua} />

        <View className="flex-row gap-3">
          <FormInput
            label="Número (opcional)"
            placeholder="Ex: 1500"
            value={numero}
            onChangeText={setNumero}
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
              placeholder="Ex: Sua Cidade"
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
