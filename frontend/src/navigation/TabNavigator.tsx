import React from "react";
import { Alert, Platform } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, Feather, MaterialCommunityIcons } from "@expo/vector-icons";

import HomeScreen from "../screens/HomeScreen";
import NovaEntregaScreen from "../screens/NovaEntregaScreen";
import HistoricoScreen from "../screens/HistoricoScreen";
import { useAuth } from "../contexts/AuthContext";

export type TabParamList = {
  Inicio: undefined;
  Entregas: undefined;
  Rota: undefined;
  Historico: undefined;
  Mais: undefined;
};

interface TabConfig {
  name: keyof TabParamList;
  label: string;
  component: React.ComponentType<any>;
  icon: (props: { color: string; focused: boolean }) => React.ReactNode;
}

const TABS: TabConfig[] = [
  {
    name: "Inicio",
    label: "Início",
    component: HomeScreen,
    icon: ({ color, focused }) => <Ionicons name={focused ? "home" : "home-outline"} size={20} color={color} />,
  },
  {
    name: "Entregas",
    label: "Entregas",
    component: NovaEntregaScreen,
    icon: ({ color }) => <Feather name="box" size={20} color={color} />,
  },
  {
    name: "Rota",
    label: "Rota",
    component: HomeScreen,
    icon: ({ color, focused }) => <MaterialCommunityIcons name={focused ? "map-marker-path" : "routes"} size={20} color={color} />,
  },
  {
    name: "Historico",
    label: "Histórico",
    component: HistoricoScreen,
    icon: ({ color, focused }) => <Ionicons name={focused ? "time" : "time-outline"} size={20} color={color} />,
  },
];

const Tab = createBottomTabNavigator<TabParamList>();

export default function TabNavigator() {
  const insets = useSafeAreaInsets();
  const { signOut } = useAuth();

  const paddingBottomCalculado = Platform.OS === "android" ? Math.max(insets.bottom, 8) : insets.bottom + 4;
  const alturaCalculada = 60 + insets.bottom;

  const handleLogout = () => {
    Alert.alert("Sair da conta", "Tem certeza que deseja sair?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Sair", style: "destructive", onPress: async () => await signOut() },
    ]);
  };

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: true,
        sceneStyle: { backgroundColor: "#0b1320" },
        animation: "fade",
        tabBarStyle: {
          backgroundColor: "#152033",
          borderTopColor: "#22334F",
          height: alturaCalculada,
          paddingBottom: paddingBottomCalculado,
          paddingTop: 8,
        },
        tabBarActiveTintColor: "#22c55e",
        tabBarInactiveTintColor: "#94A3B8",
        tabBarLabelStyle: { fontSize: 10, fontWeight: "500" },
      }}
    >
      {TABS.map((tab) => (
        <Tab.Screen key={tab.name} name={tab.name} component={tab.component} options={{ tabBarLabel: tab.label, tabBarIcon: tab.icon }} />
      ))}

      {/* Adiciona a Aba 'Mais' como um atalho de botão que intercepta o clique e dispara o Logout */}
      <Tab.Screen
        name="Mais"
        component={HomeScreen} // Componente fantasma
        options={{
          tabBarLabel: "Sair",
          tabBarIcon: ({ color }) => <Feather name="log-out" size={20} color="#ef4444" />,
          tabBarLabelStyle: { color: "#ef4444", fontSize: 10, fontWeight: "500" },
        }}
        listeners={{
          tabPress: (e) => {
            e.preventDefault(); // Impede a navegação normal
            handleLogout(); // Dispara o popup de Logout
          },
        }}
      />
    </Tab.Navigator>
  );
}
