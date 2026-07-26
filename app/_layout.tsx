import "react-native-gesture-handler";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { FamilyDataProvider } from "../src/context/FamilyDataContext";
import { colors } from "../src/theme";

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <FamilyDataProvider>
          <StatusBar style="dark" />
          <Stack
            screenOptions={{
              headerStyle: { backgroundColor: colors.bg },
              headerTintColor: colors.amberDark,
              headerTitleStyle: { fontWeight: "800", color: colors.text },
              contentStyle: { backgroundColor: colors.bg },
            }}
          >
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen
              name="member/[id]"
              options={{ title: "Thành viên" }}
            />
            <Stack.Screen name="member/new" options={{ title: "Thêm thành viên" }} />
            <Stack.Screen
              name="member/edit/[id]"
              options={{ title: "Sửa thành viên" }}
            />
            <Stack.Screen name="kinship" options={{ title: "Tra cứu danh xưng" }} />
            <Stack.Screen name="stats" options={{ title: "Thống kê gia phả" }} />
            <Stack.Screen name="lineage" options={{ title: "Thứ tự gia phả" }} />
            <Stack.Screen name="data" options={{ title: "Sao lưu & Phục hồi" }} />
            <Stack.Screen name="about" options={{ title: "Giới thiệu" }} />
            <Stack.Screen name="settings" options={{ title: "Cài đặt" }} />
          </Stack>
        </FamilyDataProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
