import { Tabs } from "expo-router";
import { Text } from "react-native";
import { colors } from "../../src/theme";

function TabIcon({ icon, focused }: { icon: string; focused: boolean }) {
  return (
    <Text style={{ fontSize: 18, opacity: focused ? 1 : 0.55 }}>{icon}</Text>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerTitleStyle: { fontWeight: "800", color: colors.text },
        tabBarActiveTintColor: colors.amberDark,
        tabBarInactiveTintColor: colors.textSoft,
        tabBarStyle: {
          backgroundColor: colors.white,
          borderTopColor: colors.border,
        },
        tabBarLabelStyle: { fontSize: 10, fontWeight: "700" },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Gia phả",
          tabBarIcon: ({ focused }) => <TabIcon icon="🌳" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="events"
        options={{
          title: "Lịch",
          tabBarIcon: ({ focused }) => <TabIcon icon="📅" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: "Thêm",
          tabBarIcon: ({ focused }) => <TabIcon icon="☰" focused={focused} />,
        }}
      />
    </Tabs>
  );
}
