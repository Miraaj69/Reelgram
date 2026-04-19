import 'react-native-gesture-handler';
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Text, StyleSheet, Platform, View, TouchableOpacity } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, withTiming,
} from 'react-native-reanimated';

import ReelsScreen from './ReelsScreen';
import FavoritesScreen from './FavoritesScreen';
import { VideoProvider } from './VideoContext';

const Tab = createBottomTabNavigator();

function TabBtn({ label, icon, focused, onPress }) {
  const scale = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const handlePress = () => {
    scale.value = withSpring(0.88, { damping: 10 }, () => {
      scale.value = withSpring(1, { damping: 12 });
    });
    onPress();
  };

  return (
    <Animated.View style={[styles.tabBtn, anim]}>
      <TouchableOpacity onPress={handlePress} activeOpacity={1} style={styles.tabBtnTouch}>
        <Text style={[styles.tabIcon, focused && styles.tabIconActive]}>{icon}</Text>
        <Text style={[styles.tabLabel, focused && styles.tabLabelActive]}>{label}</Text>
        {focused && <View style={styles.tabUnderline} />}
      </TouchableOpacity>
    </Animated.View>
  );
}

function MinimalTabBar({ state, navigation }) {
  return (
    <View style={styles.tabBar}>
      <View style={styles.tabBarInner}>
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const icon = route.name === 'Reels' ? '▶' : '♥';
          return (
            <TabBtn
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
              tabBar={(props) => <MinimalTabBar {...props} />}
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
  tabBar: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(0,0,0,0.88)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.07)',
    paddingBottom: Platform.OS === 'ios' ? 24 : 8,
  },
  tabBarInner: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingTop: 10,
  },
  tabBtn: { alignItems: 'center' },
  tabBtnTouch: { alignItems: 'center', paddingHorizontal: 32, paddingBottom: 4, position: 'relative' },
  tabIcon: { fontSize: 18, color: 'rgba(255,255,255,0.3)', marginBottom: 3 },
  tabIconActive: { color: '#FF2D55' },
  tabLabel: { fontSize: 11, color: 'rgba(255,255,255,0.28)', fontWeight: '600', letterSpacing: 0.5 },
  tabLabelActive: { color: '#fff' },
  tabUnderline: {
    position: 'absolute', bottom: -4, width: 20, height: 2,
    backgroundColor: '#FF2D55', borderRadius: 2,
  },
});
