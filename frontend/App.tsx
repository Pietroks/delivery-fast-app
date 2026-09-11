import React, { useEffect, useState } from "react";
import "./global.css";
import SplashScreen from "./src/components/SplashScreen";
import Skeleton from "./src/components/Skeleton";
import { NavigationContainer } from "@react-navigation/native";
import RootNavigator from "./src/navigation/RootNavigator";
import { AuthProvider } from "./src/contexts/AuthContext";

export default function App() {
  const [carregandoSplash, setCarregandoSplash] = useState(true);
  const [carregandoDados, setCarregandoDados] = useState(true);

  useEffect(() => {
    const timerSplash = setTimeout(() => {
      setCarregandoSplash(false);

      setTimeout(() => {
        setCarregandoDados(false);
      }, 1500);
    }, 2000);

    return () => clearTimeout(timerSplash);
  }, []);

  if (carregandoSplash) return <SplashScreen />;
  if (carregandoDados) return <Skeleton />;

  return (
    <AuthProvider>
      <NavigationContainer>
        <RootNavigator />
      </NavigationContainer>
    </AuthProvider>
  );
}
