import { useState } from "react";
import { ActivityIndicator, Alert, SafeAreaView, StatusBar, Text, TextInput, TouchableOpacity, View } from "react-native";
import { supabase } from "../services/supabase";
import { Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { AuthStackParamList } from "../navigation/RootNavigator";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [carregando, setCarregando] = useState(false);

  const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList>>();

  const handleLogin = async () => {
    if (!email || !senha) {
      Alert.alert("Atenção", "Preencha o e-mail e senha para acessar.");
      return;
    }

    setCarregando(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: senha,
    });

    if (error) {
      Alert.alert("Erro no login", "E-mail ou senha incorretos.");
      setCarregando(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#0b1320] justify-center px-6">
      <StatusBar barStyle="light-content" />

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
              secureTextEntry
              value={senha}
              onChangeText={setSenha}
              editable={!carregando}
            />
          </View>
        </View>

        <TouchableOpacity
          className={`h-14 rounded-xl items-center justify-center mt-4 ${
            carregando ? "bg-emerald-800" : "bg-[#22c55e] active:bg-emerald-600"
          }`}
          onPress={handleLogin}
          disabled={carregando}
        >
          {carregando ? <ActivityIndicator color="#000000" /> : <Text className="text-black font-bold text-base">Acessar Plataforma</Text>}
        </TouchableOpacity>
        <TouchableOpacity
          className="mt-6 items-center flex-row justify-center"
          onPress={() => navigation.navigate("Cadastro")}
          disabled={carregando}
        >
          <Text className="text-[#94a3b8] text-sm">Novo por aqui? </Text>
          <Text className="text-[#38BDF8] text-sm font-bold">Crie sua conta</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
