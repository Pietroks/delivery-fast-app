import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import TabNavigator from "./TabNavigator";
import NovaEntregaScreen from "../screens/NovaEntregaScreen";

export type RootStackParamList = {
  MainTabs: undefined;
  NovaEntrega: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  return (
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
  );
}
