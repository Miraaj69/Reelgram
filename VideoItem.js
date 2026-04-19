import React, { useRef, useState, useCallback } from 'react';
import {
  View, StyleSheet, Dimensions, Text,
  TouchableOpacity, Pressable, Platform,
} from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedGestureHandler,
  withSpring,
  withTiming,
  withSequence,
  runOnJS,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';
import { PanGestureHandler, TapGestureHandler } from 'react-native-gesture-handler';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useVideoContext } from './VideoContext';

const { width: W, height: H } = Dimensions.get('window');
const SWIPE_THRESHOLD = 72;

function formatDuration(s) {
  if (!s) return '0:00';
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
}

// ── Glass pill button ──
function GlassBtn({ icon, label, onPress, tint }) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const handlePress = () => {
    scale.value = withSequence(
      withSpring(0.88, { damping: 12 }),
      withSpring(1, { damping: 10 })
    );
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  return (
    <Animated.View style={animStyle}>
      <TouchableOpacity onPress={handlePress} activeOpacity={1}>
        <BlurView intensity={30} tint="dark" style={[styles.glassBtn, tint && { borderColor: tint }]}>
          <Text style={[styles.glassBtnIcon, tint && { color: tint }]}>{icon}</Text>
          <Text style={styles.glassBtnLabel}>{label}</Text>
        </BlurView>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function VideoItem({ video, isActive, onDelete }) {
  const videoRef = useRef(null);
  const { toggleFavorite, isFavorite } = useVideoContext();
  const liked = isFavorite(video.id);

  const [paused, setPaused] = useState(false);
  const [showHeart, setShowHeart] = useState(false);
  const [swipeDir, setSwipeDir] = useState(null);

  // Shared values
  const translateX = useSharedValue(0);
  const heartScale = useSharedValue(0);
  const heartOpacity = useSharedValue(0);
  const overlayOpacity = useSharedValue(0);
  const pauseOpacity = useSharedValue(0);

  // Double tap
  const lastTap = useRef(0);

  // ── Swipe complete callback ──
  const onSwipeComplete = useCallback((dir) => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (dir === 'right') {
      toggleFavorite(video);
      setSwipeDir('like');
      setTimeout(() => setSwipeDir(null), 900);
    } else {
      onDelete();
    }
  }, [video, toggleFavorite, onDelete]);

  // ── Pan gesture ──
  const gestureHandler = useAnimatedGestureHandler({
    onActive: ({ translationX }) => {
      translateX.value = translationX * 0.55;
    },
    onEnd: ({ translationX }) => {
      if (translationX > SWIPE_THRESHOLD) runOnJS(onSwipeComplete)('right');
      else if (translationX < -SWIPE_THRESHOLD) runOnJS(onSwipeComplete)('left');
      translateX.value = withSpring(0, { damping: 22, stiffness: 220 });
    },
  });

  // ── Single/double tap ──
  const handleTap = useCallback(() => {
    const now = Date.now();
    if (now - lastTap.current < 280) {
      // Double tap → like
      if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      toggleFavorite(video);
      setShowHeart(true);
      heartScale.value = withSequence(
        withSpring(1.3, { damping: 8 }),
        withTiming(1.1, { duration: 120 }),
        withTiming(0, { duration: 350 })
      );
      heartOpacity.value = withSequence(
        withTiming(1, { duration: 80 }),
        withTiming(1, { duration: 400 }),
        withTiming(0, { duration: 250 })
      );
      setTimeout(() => setShowHeart(false), 900);
    } else {
      // Single tap → pause
      setPaused((p) => {
        pauseOpacity.value = withSequence(
          withTiming(1, { duration: 80 }),
          withTiming(0, { duration: 600 })
        );
        return !p;
      });
    }
    lastTap.current = now;
  }, [video, toggleFavorite]);

  // Long press → pause
  const handleLongPress = useCallback(() => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setPaused(true);
  }, []);

  const handlePressOut = useCallback(() => {
    setPaused(false);
  }, []);

  // ── Animated styles ──
  const containerAnim = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const swipeOverlay = useAnimatedStyle(() => {
    const tx = translateX.value;
    const greenAlpha = interpolate(tx, [0, 120], [0, 0.42], Extrapolate.CLAMP);
    const redAlpha = interpolate(-tx, [0, 120], [0, 0.42], Extrapolate.CLAMP);
    if (tx > 0) return { backgroundColor: `rgba(0,255,148,${greenAlpha})` };
    if (tx < 0) return { backgroundColor: `rgba(255,77,77,${redAlpha})` };
    return { backgroundColor: 'transparent' };
  });

  const heartAnim = useAnimatedStyle(() => ({
    transform: [{ scale: heartScale.value }],
    opacity: heartOpacity.value,
  }));

  const pauseAnim = useAnimatedStyle(() => ({
    opacity: pauseOpacity.value,
  }));

  return (
    <View style={styles.container}>
      <PanGestureHandler
        onGestureEvent={gestureHandler}
        activeOffsetX={[-14, 14]}
        failOffsetY={[-8, 8]}
      >
        <Animated.View style={[styles.inner, containerAnim]}>

          {/* Video */}
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={handleTap}
            onLongPress={handleLongPress}
            onPressOut={handlePressOut}
            delayLongPress={350}
          >
            <Video
              ref={videoRef}
              source={{ uri: video.uri }}
              style={StyleSheet.absoluteFill}
              resizeMode={ResizeMode.COVER}
              shouldPlay={isActive && !paused}
              isLooping
              isMuted={false}
            />
          </Pressable>

          {/* Swipe color overlay */}
          <Animated.View style={[StyleSheet.absoluteFill, swipeOverlay]} pointerEvents="none" />

          {/* Bottom gradient */}
          <LinearGradient
            colors={['transparent', 'rgba(15,17,21,0.55)', 'rgba(15,17,21,0.88)']}
            style={styles.bottomGradient}
            pointerEvents="none"
          />

          {/* Top gradient */}
          <LinearGradient
            colors={['rgba(15,17,21,0.5)', 'transparent']}
            style={styles.topGradient}
            pointerEvents="none"
          />

          {/* Pause flash */}
          <Animated.View style={[styles.pauseFlash, pauseAnim]} pointerEvents="none">
            <BlurView intensity={20} tint="dark" style={styles.pauseCircle}>
              <Text style={styles.pauseIcon}>⏸</Text>
            </BlurView>
          </Animated.View>

          {/* Double tap heart */}
          {showHeart && (
            <Animated.Text style={[styles.bigHeart, heartAnim]} pointerEvents="none">
              ♥
            </Animated.Text>
          )}

          {/* Swipe feedback label */}
          {swipeDir === 'like' && (
            <View style={styles.swipeFeedback}>
              <Text style={styles.swipeFeedbackText}>
                {liked ? '♥ Liked!' : '♡ Removed'}
              </Text>
            </View>
          )}

          {/* Swipe edge hints */}
          <View style={[styles.edgeHint, styles.edgeLeft]} pointerEvents="none">
            <Text style={styles.edgeHintText}>♥</Text>
          </View>
          <View style={[styles.edgeHint, styles.edgeRight]} pointerEvents="none">
            <Text style={styles.edgeHintText}>🗑</Text>
          </View>

          {/* Right glass controls */}
          <View style={styles.rightControls}>
            <GlassBtn
              icon={liked ? '♥' : '♡'}
              label={liked ? 'Liked' : 'Like'}
              tint={liked ? '#FF4D4D' : undefined}
              onPress={() => toggleFavorite(video)}
            />
            <GlassBtn
              icon="🗑"
              label="Delete"
              tint="#FF4D4D"
              onPress={onDelete}
            />
          </View>

          {/* Bottom meta */}
          <View style={styles.bottomMeta}>
            <Text style={styles.filename} numberOfLines={1}>{video.filename}</Text>
            <View style={styles.metaRow}>
              <BlurView intensity={28} tint="dark" style={styles.durationPill}>
                <Text style={styles.durationText}>{formatDuration(video.duration)}</Text>
              </BlurView>
              <Text style={styles.swipeTip}>← swipe to delete  •  → like</Text>
            </View>
          </View>

        </Animated.View>
      </PanGestureHandler>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: W, height: H, backgroundColor: '#0F1115' },
  inner: { flex: 1 },
  bottomGradient: {
    position: 'absolute', left: 0, right: 0, bottom: 0, height: 260,
    zIndex: 2,
  },
  topGradient: {
    position: 'absolute', left: 0, right: 0, top: 0, height: 120,
    zIndex: 2,
  },
  pauseFlash: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center', alignItems: 'center', zIndex: 8,
  },
  pauseCircle: {
    width: 72, height: 72, borderRadius: 36,
    justifyContent: 'center', alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
  },
  pauseIcon: { fontSize: 28 },
  bigHeart: {
    position: 'absolute', alignSelf: 'center', top: '36%',
    fontSize: 96, color: '#FF4D4D', zIndex: 10,
    textShadowColor: 'rgba(255,77,77,0.6)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 28,
  },
  swipeFeedback: {
    position: 'absolute', alignSelf: 'center', top: '44%',
    zIndex: 20, backgroundColor: 'rgba(15,17,21,0.78)',
    paddingHorizontal: 22, paddingVertical: 11, borderRadius: 30,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  swipeFeedbackText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  edgeHint: {
    position: 'absolute', top: '47%', zIndex: 3,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 14, paddingHorizontal: 12, paddingVertical: 8,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  edgeLeft: { left: 14 },
  edgeRight: { right: 14 },
  edgeHintText: { fontSize: 20 },
  rightControls: {
    position: 'absolute', right: 14, bottom: 140,
    alignItems: 'center', gap: 14, zIndex: 10,
  },
  glassBtn: {
    alignItems: 'center', paddingVertical: 12, paddingHorizontal: 14,
    borderRadius: 20, overflow: 'hidden',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    minWidth: 58,
  },
  glassBtnIcon: { fontSize: 24, color: '#fff' },
  glassBtnLabel: {
    color: 'rgba(255,255,255,0.7)', fontSize: 10,
    fontWeight: '600', marginTop: 5, letterSpacing: 0.3,
  },
  bottomMeta: {
    position: 'absolute', bottom: 82, left: 16, right: 86, zIndex: 10,
  },
  filename: {
    color: '#fff', fontSize: 14, fontWeight: '700', marginBottom: 8,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4,
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  durationPill: {
    borderRadius: 10, overflow: 'hidden',
    paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  durationText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  swipeTip: { color: 'rgba(255,255,255,0.32)', fontSize: 11 },
});
