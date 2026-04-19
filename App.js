import 'react-native-gesture-handler';
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Text, StyleSheet, Platform, View } from 'react-native';
import { BlurView } from 'expo-blur';

import ReelsScreen from './ReelsScreen';
import FavoritesScreen from './FavoritesScreen';
import { VideoProvider } from './VideoContext';

const Tab = createBottomTabNavigator();

const TabIcon = ({ name, focused }) => (
  <View style={[styles.tabIconWrap, focused && styles.tabIconActive]}>
    <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.45 }}>
      {name === 'Reels' ? '▶' : '♥'}
    </Text>
  </View>
);

function GlassTabBar({ state, descriptors, navigation }) {
  return (
    <View style={styles.tabBarOuter}>
      <BlurView intensity={40} tint="dark" style={styles.tabBarBlur}>
        <View style={styles.tabBarInner}>
          {state.routes.map((route, index) => {
            const isFocused = state.index === index;
            const onPress = () => {
              const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (!isFocused && !event.defaultPrevented) navigation.navigate(route.name);
            };
            return (
              <View key={route.key} style={styles.tabItem}>
                <Text
                  onPress={onPress}
                  style={[styles.tabLabel, isFocused && styles.tabLabelActive]}
                >
                  {route.name === 'Reels' ? '▶  Reels' : '♥  Favorites'}
                </Text>
                {isFocused && <View style={styles.tabIndicator} />}
              </View>
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
    bottom: 0,
    left: 0,
    right: 0,
    height: Platform.OS === 'ios' ? 85 : 68,
  },
  tabBarBlur: {
    flex: 1,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  tabBarInner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: Platform.OS === 'ios' ? 20 : 4,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    position: 'relative',
  },
  tabLabel: {
    color: 'rgba(255,255,255,0.38)',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.4,
  },
  tabLabelActive: {
    color: '#A29BFE',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: -2,
    width: 32,
    height: 2.5,
    borderRadius: 2,
    backgroundColor: '#6C5CE7',
  },
  tabIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabIconActive: {
    backgroundColor: 'rgba(108,92,231,0.18)',
  },
});
