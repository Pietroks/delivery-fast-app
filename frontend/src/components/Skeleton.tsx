import { useEffect, useRef } from "react";
import { Animated, StatusBar, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Skeleton() {
  const opacityAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacityAnim, {
          toValue: 0.8,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, [opacityAnim]);

  return (
    <SafeAreaView className="flex-1 bg-[#0b1320] px-4 pt-2">
      <StatusBar barStyle={"light-content"} />

      <View className="flex-row items-center justify-between my-3">
        <View>
          <Animated.View style={{ opacity: opacityAnim }} className="w-32 h-6 bg-[#152033] rounded-md mb-2" />
          <Animated.View style={{ opacity: opacityAnim }} className="w-48 h-4 bg-[#152033] rounded-md" />
        </View>
        <Animated.View style={{ opacity: opacityAnim }} className="w-10 h-10 bg-[#152033] rounded-full" />
      </View>

      <Animated.View style={{ opacity: opacityAnim }} className="bg-[#152033] p-4 rounded-2xl border border-[#22334F] mb-4 h-28" />

      <Animated.View style={{ opacity: opacityAnim }} className="w-36 h-5 bg-[#152033] rounded-md mb-3" />

      {[1, 2, 3, 4].map((item) => (
        <Animated.View key={item} style={{ opacity: opacityAnim }} className="bg-[#152033] h-16 mb-2.5 border border-[#22334f]" />
      ))}
    </SafeAreaView>
  );
}
