import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { Alert } from 'react-native';
import CustomAlertModal, { AlertaBotao, TipoAlerta } from '../components/CustomAlertModal';

export interface AlertaConfig {
  titulo: string;
  mensagem?: string;
  botoes?: AlertaBotao[];
  tipo?: TipoAlerta;
}

interface AlertContextData {
  showAlert: (titulo: string, mensagem?: string, botoes?: AlertaBotao[], tipo?: TipoAlerta) => void;
  hideAlert: () => void;
}

let handlerAlertaGlobal: ((config: AlertaConfig) => void) | null = null;

export function alertaApp(titulo: string, mensagem?: string, botoes?: AlertaBotao[], tipo?: TipoAlerta) {
  if (handlerAlertaGlobal) {
    handlerAlertaGlobal({ titulo, mensagem, botoes, tipo });
  } else {
    if (botoes && botoes.length > 0) {
      Alert.alert(
        titulo,
        mensagem,
        botoes.map((b) => ({ text: b.text, onPress: b.onPress, style: b.style as any })),
      );
    } else {
      Alert.alert(titulo, mensagem);
    }
  }
}

const AlertContext = createContext<AlertContextData>({
  showAlert: () => {},
  hideAlert: () => {},
});

export const AlertProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [alerta, setAlerta] = useState<AlertaConfig | null>(null);

  const showAlert = useCallback((titulo: string, mensagem?: string, botoes?: AlertaBotao[], tipo?: TipoAlerta) => {
    setAlerta({ titulo, mensagem, botoes, tipo });
  }, []);

  const hideAlert = useCallback(() => {
    setAlerta(null);
  }, []);

  useEffect(() => {
    handlerAlertaGlobal = (config: AlertaConfig) => {
      setAlerta(config);
    };
    return () => {
      handlerAlertaGlobal = null;
    };
  }, []);

  return (
    <AlertContext.Provider value={{ showAlert, hideAlert }}>
      {children}
      {alerta && (
        <CustomAlertModal
          visivel={!!alerta}
          titulo={alerta.titulo}
          mensagem={alerta.mensagem}
          botoes={alerta.botoes}
          tipo={alerta.tipo}
          onFechar={hideAlert}
        />
      )}
    </AlertContext.Provider>
  );
};

export function useAlert() {
  return useContext(AlertContext);
}
