import React from "react";
import { render, fireEvent, waitFor, act } from "@testing-library/react-native";
import { Alert } from "react-native";
import CadastroScreen from "../CadastroScreen";
import { supabase } from "../../services/supabase";

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

// --- MOCKS DE NAVEGAÇÃO E SERVIÇOS ---
jest.mock("@react-navigation/native", () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
  }),
}));

jest.mock("../../services/supabase", () => ({
  supabase: {
    auth: {
      signUp: jest.fn(),
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
describe("Tela: CadastroScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("Deve renderizar todos os campos de cadastro", () => {
    const { getByPlaceholderText, getByText } = render(<CadastroScreen />);

    expect(getByPlaceholderText("Ex: João da Silva")).toBeTruthy();
    expect(getByPlaceholderText("motoboy@exemplo.com")).toBeTruthy();
    expect(getByPlaceholderText("Mínimo de 6 caracteres")).toBeTruthy();
    expect(getByPlaceholderText("Repita a senha")).toBeTruthy();
    expect(getByText("Cadastrar")).toBeTruthy();
  });

  test("Deve validar se todos os campos foram preenchidos", () => {
    const spyAlert = jest.spyOn(Alert, "alert");
    const { getByText } = render(<CadastroScreen />);

    fireEvent.press(getByText("Cadastrar"));

    expect(spyAlert).toHaveBeenCalledWith("Atenção", "Preencha todos os campos para se cadastrar.");
  });

  test("Deve validar se as senhas coincidem", () => {
    const spyAlert = jest.spyOn(Alert, "alert");
    const { getByPlaceholderText, getByText } = render(<CadastroScreen />);

    fireEvent.changeText(getByPlaceholderText("Ex: João da Silva"), "João");
    fireEvent.changeText(getByPlaceholderText("motoboy@exemplo.com"), "joao@email.com");
    fireEvent.changeText(getByPlaceholderText("Mínimo de 6 caracteres"), "senha123");
    fireEvent.changeText(getByPlaceholderText("Repita a senha"), "senha456");

    fireEvent.press(getByText("Cadastrar"));

    expect(spyAlert).toHaveBeenCalledWith("Atenção", "As senhas não coincidem.");
  });

  test("Deve validar se a senha tem no mínimo 6 caracteres", () => {
    const spyAlert = jest.spyOn(Alert, "alert");
    const { getByPlaceholderText, getByText } = render(<CadastroScreen />);

    fireEvent.changeText(getByPlaceholderText("Ex: João da Silva"), "João");
    fireEvent.changeText(getByPlaceholderText("motoboy@exemplo.com"), "joao@email.com");
    fireEvent.changeText(getByPlaceholderText("Mínimo de 6 caracteres"), "12345");
    fireEvent.changeText(getByPlaceholderText("Repita a senha"), "12345");

    fireEvent.press(getByText("Cadastrar"));

    expect(spyAlert).toHaveBeenCalledWith("Atenção", "A senha deve ter pelo menos 6 caracteres.");
  });

  test("Deve enviar os dados corretos para o Supabase no cadastro com sucesso", async () => {
    const spyAlert = jest.spyOn(Alert, "alert");
    (supabase.auth.signUp as jest.Mock).mockResolvedValue({
      error: null,
      data: { session: null },
    });

    const { getByPlaceholderText, getByText } = render(<CadastroScreen />);

    fireEvent.changeText(getByPlaceholderText("Ex: João da Silva"), "João Teste");
    fireEvent.changeText(getByPlaceholderText("motoboy@exemplo.com"), "joao@email.com");
    fireEvent.changeText(getByPlaceholderText("Mínimo de 6 caracteres"), "senha123");
    fireEvent.changeText(getByPlaceholderText("Repita a senha"), "senha123");

    await act(async () => {
      fireEvent.press(getByText("Cadastrar"));
    });

    expect(supabase.auth.signUp).toHaveBeenCalledWith({
      email: "joao@email.com",
      password: "senha123",
      options: { data: { nome_completo: "João Teste" } },
    });

    expect(spyAlert).toHaveBeenCalledWith(
      "Cadastro Realizado",
      "Sua conta foi criada com sucesso! Você já pode fazer login.",
      expect.any(Array),
    );
  });
});
