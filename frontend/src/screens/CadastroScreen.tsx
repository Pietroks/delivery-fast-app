import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert, StatusBar, ScrollView, SafeAreaView } from "react-native";
import { Feather, Ionicons } from "@expo/vector-icons";
import { supabase } from "../services/supabase";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { AuthStackParamList } from "../navigation/RootNavigator";

export default function CadastroScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList>>();

  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmaSenha, setConfirmaSenha] = useState("");
  const [carregando, setCarregando] = useState(false);

  const handleCadastro = async () => {
    if (!nome.trim() || !email.trim() || !senha || !confirmaSenha) {
      Alert.alert("Atenção", "Preencha todos os campos para se cadastrar.");
      return;
    }

    if (senha !== confirmaSenha) {
      Alert.alert("Atenção", "As senhas não coincidem.");
      return;
    }

    if (senha.length < 6) {
      Alert.alert("Atenção", "A senha deve ter pelo menos 6 caracteres.");
      return;
    }

    setCarregando(true);

    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password: senha,
      options: {
        data: {
          nome_completo: nome.trim(),
        },
      },
    });

    setCarregando(false);

    if (error) {
      Alert.alert("Erro no cadastro", error.message);
      return;
    }

    if (data.session) {
      return;
    } else {
      Alert.alert("Cadastro Realizado", "Sua conta foi criada com sucesso! Você já pode fazer login.", [
        { text: "OK", onPress: () => navigation.navigate("Login") },
      ]);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#0b1320]">
      <StatusBar barStyle="light-content" />

      {/* Botão de Voltar */}
      <View className="px-4 pt-2 pb-4">
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          className="w-10 h-10 rounded-full bg-[#152033] border border-[#22334f] items-center justify-center active:bg-[#1e2e48]"
        >
          <Ionicons name="arrow-back" size={20} color="#94a3b8" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <View className="mb-8">
          <Text className="text-white text-3xl font-bold tracking-tight">Criar Conta</Text>
          <Text className="text-[#94a3b8] text-sm mt-2">Junte-se ao DeliveryFast e comece a otimizar suas rotas agora mesmo.</Text>
        </View>

        <View className="space-y-4 gap-4">
          <View>
            <Text className="text-[#94a3b8] text-xs font-bold mb-1.5 ml-1">Nome Completo</Text>
            <View className="flex-row items-center bg-[#152033] border border-[#22334f] rounded-xl px-4 h-14">
              <Feather name="user" size={20} color="#64748b" />
              <TextInput
                className="flex-1 text-white ml-3"
                placeholder="Ex: João da Silva"
                placeholderTextColor="#475569"
                autoCapitalize="words"
                value={nome}
                onChangeText={setNome}
                editable={!carregando}
              />
            </View>
          </View>

          <View>
            <Text className="text-[#94a3b8] text-xs font-bold mb-1.5 ml-1">E-mail</Text>
            <View className="flex-row items-center bg-[#152033] border border-[#22334f] rounded-xl px-4 h-14">
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
            <View className="flex-row items-center bg-[#152033] border border-[#22334f] rounded-xl px-4 h-14">
              <Feather name="lock" size={20} color="#64748b" />
              <TextInput
                className="flex-1 text-white ml-3"
                placeholder="Mínimo de 6 caracteres"
                placeholderTextColor="#475569"
                secureTextEntry
                value={senha}
                onChangeText={setSenha}
                editable={!carregando}
              />
            </View>
          </View>

          <View>
            <Text className="text-[#94a3b8] text-xs font-bold mb-1.5 ml-1">Confirmar Senha</Text>
            <View className="flex-row items-center bg-[#152033] border border-[#22334f] rounded-xl px-4 h-14">
              <Feather name="check-circle" size={20} color="#64748b" />
              <TextInput
                className="flex-1 text-white ml-3"
                placeholder="Repita a senha"
                placeholderTextColor="#475569"
                secureTextEntry
                value={confirmaSenha}
                onChangeText={setConfirmaSenha}
                editable={!carregando}
              />
            </View>
          </View>

          <TouchableOpacity
            className={`h-14 rounded-xl items-center justify-center mt-6 ${
              carregando ? "bg-emerald-800" : "bg-[#22c55e] active:bg-emerald-600"
            }`}
            onPress={handleCadastro}
            disabled={carregando}
          >
            {carregando ? <ActivityIndicator color="#000000" /> : <Text className="text-black font-bold text-base">Cadastrar</Text>}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
