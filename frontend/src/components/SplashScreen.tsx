import { ActivityIndicator, Image, StatusBar, View } from "react-native";

export default function SplashScreen() {
  return (
    <View className="flex-1 bg-[#0b1320] justify-center items-center px-6">
      <StatusBar barStyle="light-content" backgroundColor="#0b1320" />

      <Image source={require("../../assets/icon.png")} className="w-48 h-48 rounded-3xl" resizeMode="contain" />

      <ActivityIndicator size={"large"} color="#22c55e" style={{ marginTop: 32 }} />
    </View>
  );
}
