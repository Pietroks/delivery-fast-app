import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import TabNavigator from "./TabNavigator";
import NovaEntregaScreen from "../screens/NovaEntregaScreen";
import LoginScreen from "../screens/LoginScreen";
import CadastroScreen from "../screens/CadastroScreen";
import { useAuth } from "../contexts/AuthContext";
import { View, ActivityIndicator } from "react-native";

export type RootStackParamList = {
  MainTabs: undefined;
  NovaEntrega: undefined;
};

// Nova tipagem exclusiva para a área de Autenticação
export type AuthStackParamList = {
  Login: undefined;
  Cadastro: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const AuthStack = createNativeStackNavigator<AuthStackParamList>();

function AuthNavigator() {
  return (
    <AuthStack.Navigator
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
        contentStyle: { backgroundColor: "#0b1320" },
      }}
    >
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Cadastro" component={CadastroScreen} />
    </AuthStack.Navigator>
  );
}

export default function RootNavigator() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <View className="flex-1 bg-[#0b1320] justify-center items-center">
        <ActivityIndicator size="large" color="#22c55e" />
      </View>
    );
  }

  return session ? (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
        contentStyle: { backgroundColor: "#0b1320" },
      }}
    >
      <Stack.Screen name="MainTabs" component={TabNavigator} />
      <Stack.Screen name="NovaEntrega" component={NovaEntregaScreen} />
    </Stack.Navigator>
  ) : (
    <AuthNavigator />
  );
}
