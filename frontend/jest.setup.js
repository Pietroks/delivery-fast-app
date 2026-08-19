import "@testing-library/jest-native/extend-expect";

// Mock do NativeWind
jest.mock("nativewind", () => ({
  styled: (component) => component,
  useColorScheme: () => ({ colorScheme: "dark", toggleColorScheme: jest.fn() }),
}));

// Mock dos Ícones do Expo
jest.mock("@expo/vector-icons", () => ({
  Ionicons: "Ionicons",
  AntDesign: "AntDesign",
  MaterialIcons: "MaterialIcons",
}));

// Mock do AsyncStorage
jest.mock("@react-native-async-storage/async-storage", () => require("@react-native-async-storage/async-storage/jest/async-storage-mock"));

// Mock do Expo Location (GPS)
jest.mock("expo-location", () => ({
  requestForegroundPermissionsAsync: jest.fn(() => Promise.resolve({ status: "granted" })),
  getCurrentPositionAsync: jest.fn(() =>
    Promise.resolve({
      coords: {
        latitude: -28.298,
        longitude: -54.263,
        altitude: 0,
        accuracy: 5,
        altitudeAccuracy: 5,
        heading: 0,
        speed: 0,
      },
      timestamp: Date.now(),
    }),
  ),
  hasServicesEnabledAsync: jest.fn(() => Promise.resolve(true)),
  reverseGeocodeAsync: jest.fn(() => Promise.resolve([{ city: "Santo Ângelo" }])),
}));

// Mock do Expo Haptics (Vibração)
jest.mock("expo-haptics", () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: "light" },
  NotificationFeedbackType: { Success: "success", Warning: "warning", Error: "error" },
}));

// Mock do React Navigation (Com suporte a useFocusEffect via useEffect para evitar re-renders infinitos)
jest.mock("@react-navigation/native", () => {
  const actualNav = jest.requireActual("@react-navigation/native");
  const React = require("react");

  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: jest.fn(),
      goBack: jest.fn(),
      canGoBack: jest.fn(() => true),
    }),
    useFocusEffect: (callback) => {
      React.useEffect(() => {
        const cleanup = callback();
        return () => {
          if (typeof cleanup === "function") cleanup();
        };
      }, []);
    },
  };
});
