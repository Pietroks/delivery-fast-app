import { useState } from "react";
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, StatusBar, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../services/supabase";
import { Feather, Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { AuthStackParamList } from "../navigation/RootNavigator";
import { alertaApp } from "../contexts/AlertContext";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [carregando, setCarregando] = useState(false);

  const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList>>();

  const handleLogin = async () => {
    if (!email || !senha) {
      alertaApp("Atenção", "Preencha o e-mail e senha para acessar.");
      return;
    }

    setCarregando(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: senha,
    });

    if (error) {
      alertaApp("Erro no login", "E-mail ou senha incorretos.");
      setCarregando(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#0b1320]">
      <StatusBar barStyle="light-content" />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: "center", paddingHorizontal: 24, paddingVertical: 20 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View className="items-center mb-10">
            <View className="bg-emerald-500/10 p-4 rounded-full border border-emerald-500/20 mb-4">
              <Feather name="package" size={48} color="#22c55e" />
            </View>
            <Text className="text-white text-3xl font-bold tracking-tight">
              Delivery<Text className="text-[#22c55e]">Fast</Text>
            </Text>
            <Text className="text-[#94a3b8] text-sm mt-2 text-center px-4">Entre para acessar suas rotas e otimizar suas entregas.</Text>
          </View>

          <View className="space-y-4 gap-4">
            <View>
              <Text className="text-[#94a3b8] text-xs font-bold mb-1.5 ml-1">E-mail</Text>
              <View className="flex-row items-center bg-[#152033] border border-[#22334f] rounded-xl px-4 h-14 focus:border-emerald-500/50">
                <Feather name="mail" size={20} color="#64748b" />
                <TextInput
                  className="flex-1 text-white ml-3"
                  placeholder="motoboy@exemplo.com"
                  placeholderTextColor="#475569"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={email}
                  onChangeText={setEmail}
                  editable={!carregando}
                />
              </View>
            </View>

            <View>
              <Text className="text-[#94a3b8] text-xs font-bold mb-1.5 ml-1">Senha</Text>
              <View className="flex-row items-center bg-[#152033] border border-[#22334f] rounded-xl px-4 h-14 focus:border-emerald-500/50">
                <Feather name="lock" size={20} color="#64748b" />
                <TextInput
                  className="flex-1 text-white ml-3"
                  placeholder="••••••••"
                  placeholderTextColor="#475569"
                  secureTextEntry={!mostrarSenha}
                  value={senha}
                  onChangeText={setSenha}
                  editable={!carregando}
                />
                <TouchableOpacity
                  onPress={() => setMostrarSenha(!mostrarSenha)}
                  className="p-2 -mr-2"
                  accessibilityRole="button"
                  accessibilityLabel={mostrarSenha ? "Ocultar senha" : "Ver senha"}
                >
                  <Ionicons name={mostrarSenha ? "eye-off-outline" : "eye-outline"} size={20} color="#94a3b8" />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              className={`h-14 rounded-xl items-center justify-center mt-4 ${
                carregando ? "bg-emerald-800" : "bg-[#22c55e] active:bg-[#16a34a]"
              }`}
              onPress={handleLogin}
              disabled={carregando}
              accessibilityRole="button"
              accessibilityLabel="Acessar Plataforma"
            >
              {carregando ? <ActivityIndicator color="#000000" /> : <Text className="text-black font-bold text-base">Acessar Plataforma</Text>}
            </TouchableOpacity>

            <TouchableOpacity
              className="mt-6 items-center flex-row justify-center py-2"
              onPress={() => navigation.navigate("Cadastro")}
              disabled={carregando}
              accessibilityRole="button"
              accessibilityLabel="Criar sua conta"
            >
              <Text className="text-[#94a3b8] text-sm">Novo por aqui? </Text>
              <Text className="text-[#38bdf8] text-sm font-bold">Crie sua conta</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
