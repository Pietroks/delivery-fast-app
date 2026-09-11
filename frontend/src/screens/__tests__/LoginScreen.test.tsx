import React from "react";
import { render, fireEvent, waitFor, act } from "@testing-library/react-native";
import { Alert } from "react-native";
import LoginScreen from "../LoginScreen";
import { supabase } from "../../services/supabase";

const mockNavigate = jest.fn();

// --- MOCKS DE NAVEGAÇÃO E SERVIÇOS ---
jest.mock("@react-navigation/native", () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

jest.mock("../../services/supabase", () => ({
  supabase: {
    auth: {
      signInWithPassword: jest.fn(),
    },
  },
}));

// --- MOCKS VISUAIS (Resolve o erro 'got: undefined') ---
jest.mock("@expo/vector-icons", () => {
  const { Text } = require("react-native");
  return {
    Feather: () => <Text>Icon</Text>,
    Ionicons: () => <Text>Icon</Text>,
  };
});

jest.mock("react-native-safe-area-context", () => {
  const { View } = require("react-native");
  return {
    SafeAreaView: ({ children }: any) => <View>{children}</View>,
  };
});

// --- SUÍTE DE TESTES ---
describe("Tela: LoginScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("Deve renderizar os campos de e-mail e senha", () => {
    const { getByPlaceholderText, getByText } = render(<LoginScreen />);

    expect(getByPlaceholderText("motoboy@exemplo.com")).toBeTruthy();
    expect(getByPlaceholderText("••••••••")).toBeTruthy();
    expect(getByText("Acessar Plataforma")).toBeTruthy();
  });

  test("Deve exibir alerta se e-mail ou senha estiverem vazios", async () => {
    const spyAlert = jest.spyOn(Alert, "alert");
    const { getByText } = render(<LoginScreen />);

    fireEvent.press(getByText("Acessar Plataforma"));

    // CORRIGIDO PARA BATER EXATAMENTE COM A TELA:
    expect(spyAlert).toHaveBeenCalledWith("Atenção", "Preencha o e-mail e senha para acessar.");
    expect(supabase.auth.signInWithPassword).not.toHaveBeenCalled();
  });

  test("Deve chamar a API do Supabase e fazer login com sucesso", async () => {
    (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({
      error: null,
      data: { session: { access_token: "token123" } },
    });

    const { getByPlaceholderText, getByText } = render(<LoginScreen />);

    fireEvent.changeText(getByPlaceholderText("motoboy@exemplo.com"), "teste@email.com");
    fireEvent.changeText(getByPlaceholderText("••••••••"), "senha123");

    await act(async () => {
      fireEvent.press(getByText("Acessar Plataforma"));
    });

    expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: "teste@email.com",
      password: "senha123",
    });
  });

  test("Deve exibir erro se as credenciais forem inválidas", async () => {
    const spyAlert = jest.spyOn(Alert, "alert");
    (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({
      error: { message: "Invalid credentials" },
      data: { session: null },
    });

    const { getByPlaceholderText, getByText } = render(<LoginScreen />);

    fireEvent.changeText(getByPlaceholderText("motoboy@exemplo.com"), "errado@email.com");
    fireEvent.changeText(getByPlaceholderText("••••••••"), "senhaerrada");

    await act(async () => {
      fireEvent.press(getByText("Acessar Plataforma"));
    });

    expect(spyAlert).toHaveBeenCalledWith("Erro no login", "E-mail ou senha incorretos.");
  });

  test("Deve navegar para a tela de Cadastro ao clicar no link", () => {
    const { getByText } = render(<LoginScreen />);

    fireEvent.press(getByText("Crie sua conta"));

    expect(mockNavigate).toHaveBeenCalledWith("Cadastro");
  });
});
