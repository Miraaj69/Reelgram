import 'react-native-gesture-handler';
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Text, StyleSheet, Platform, View, TouchableOpacity } from 'react-native';
import { BlurView } from 'expo-blur';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring,
} from 'react-native-reanimated';

import ReelsScreen from './ReelsScreen';
import FavoritesScreen from './FavoritesScreen';
import { VideoProvider } from './VideoContext';

const Tab = createBottomTabNavigator();

// ── Animated tab pill button ──
function TabPill({ label, icon, focused, onPress }) {
  const scale = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const handlePress = () => {
    scale.value = withSpring(0.88, { damping: 10 }, () => {
      scale.value = withSpring(1, { damping: 12 });
    });
    onPress();
  };

  return (
    <Animated.View style={anim}>
      <TouchableOpacity onPress={handlePress} activeOpacity={1} style={styles.tabPillTouch}>
        {focused ? (
          <BlurView intensity={50} tint="dark" style={[styles.tabPill, styles.tabPillActive]}>
            <Text style={styles.tabPillIcon}>{icon}</Text>
            <Text style={styles.tabPillLabelActive}>{label}</Text>
          </BlurView>
        ) : (
          <View style={styles.tabPillInactive}>
            <Text style={[styles.tabPillIcon, { opacity: 0.4 }]}>{icon}</Text>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

function GlassTabBar({ state, navigation }) {
  return (
    <View style={styles.tabBarOuter}>
      <BlurView intensity={55} tint="dark" style={styles.tabBarBlur}>
        <View style={styles.tabBarInner}>
          {state.routes.map((route, index) => {
            const focused = state.index === index;
            const icon = route.name === 'Reels' ? '▶' : '♥';
            return (
              <TabPill
                key={route.key}
                label={route.name}
                icon={icon}
                focused={focused}
                onPress={() => {
                  const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                  if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
                }}
              />
            );
          })}
        </View>
      </BlurView>
    </View>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <VideoProvider>
          <StatusBar style="light" />
          <NavigationContainer>
            <Tab.Navigator
              tabBar={(props) => <GlassTabBar {...props} />}
              screenOptions={{ headerShown: false }}
            >
              <Tab.Screen name="Reels" component={ReelsScreen} />
              <Tab.Screen name="Favorites" component={FavoritesScreen} />
            </Tab.Navigator>
          </NavigationContainer>
        </VideoProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  tabBarOuter: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 24 : 16,
    left: 32,
    right: 32,
    borderRadius: 30,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 20,
    elevation: 12,
  },
  tabBarBlur: {
    borderRadius: 30,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
  },
  tabBarInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 8,
  },
  tabPillTouch: {},
  tabPill: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 10,
    borderRadius: 22, gap: 7, overflow: 'hidden',
    borderWidth: 1, borderColor: 'rgba(108,92,231,0.4)',
  },
  tabPillActive: {
    backgroundColor: 'rgba(108,92,231,0.18)',
    shadowColor: '#6C5CE7',
    shadowOpacity: 0.4,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
  },
  tabPillInactive: {
    paddingHorizontal: 20, paddingVertical: 10, borderRadius: 22,
  },
  tabPillIcon: { fontSize: 16, color: '#fff' },
  tabPillLabelActive: {
    color: '#A29BFE', fontSize: 14, fontWeight: '700', letterSpacing: 0.3,
  },
});
