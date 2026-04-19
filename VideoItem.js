import React, { useRef, useState, useCallback } from 'react';
import {
  View, StyleSheet, Dimensions, Text,
  TouchableOpacity, Pressable, Platform, Modal,
} from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue, useAnimatedStyle, useAnimatedGestureHandler,
  withSpring, withTiming, withSequence, runOnJS, interpolate, Extrapolate,
} from 'react-native-reanimated';
import { PanGestureHandler } from 'react-native-gesture-handler';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useVideoContext } from './VideoContext';

const { width: W, height: H } = Dimensions.get('window');
const SWIPE_LIKE_THRESHOLD = 80;
const SWIPE_DELETE_THRESHOLD = -80;

function formatDuration(s) {
  if (!s) return '0:00';
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
}

function shortenName(name = '') {
  return name.length > 28 ? name.slice(0, 25) + '...' : name;
}

// ── Premium Glass Action Button (Right sidebar) ──
function SideBtn({ icon, label, onPress, active, danger }) {
  const scale = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const handlePress = () => {
    scale.value = withSequence(withSpring(0.82, { damping: 10 }), withSpring(1, { damping: 12 }));
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPress();
  };

  const borderColor = active
    ? 'rgba(255,77,77,0.55)'
    : danger
    ? 'rgba(255,77,77,0.3)'
    : 'rgba(255,255,255,0.13)';

  const glowColor = active ? 'rgba(255,77,77,0.18)' : 'transparent';

  return (
    <Animated.View style={[anim, { shadowColor: active ? '#FF4D4D' : '#000', shadowOpacity: active ? 0.5 : 0, shadowRadius: 12, elevation: active ? 6 : 0 }]}>
      <TouchableOpacity onPress={handlePress} activeOpacity={1}>
        <BlurView intensity={55} tint="dark" style={[
          styles.sideBtn,
          { borderColor, backgroundColor: glowColor },
        ]}>
          <Text style={[styles.sideBtnIcon, (active || danger) && { color: '#FF4D4D' }]}>{icon}</Text>
          <Text style={[styles.sideBtnLabel, (active || danger) && { color: 'rgba(255,120,120,0.85)' }]}>{label}</Text>
        </BlurView>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ── Delete Confirm Modal ──
function DeleteModal({ visible, filename, onCancel, onConfirm }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.deleteModalBg}>
        <BlurView intensity={60} tint="dark" style={styles.deleteModalCard}>
          <View style={styles.deleteIconWrap}>
            <Text style={styles.deleteModalEmoji}>🗑</Text>
          </View>
          <Text style={styles.deleteModalTitle}>Delete Video?</Text>
          <Text style={styles.deleteModalSub} numberOfLines={2}>{shortenName(filename)}</Text>
          <Text style={styles.deleteModalWarn}>This action cannot be undone.</Text>
          <View style={styles.deleteModalBtns}>
            <TouchableOpacity style={styles.deleteCancelBtn} onPress={onCancel}>
              <Text style={styles.deleteCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.deleteConfirmBtn} onPress={onConfirm}>
              <LinearGradient colors={['#FF4D4D', '#C0392B']} style={styles.deleteConfirmGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                <Text style={styles.deleteConfirmText}>Delete</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </BlurView>
      </View>
    </Modal>
  );
}

export default function VideoItem({ video, isActive, onDelete }) {
  const videoRef = useRef(null);
  const { toggleFavorite, isFavorite } = useVideoContext();
  const liked = isFavorite(video.id);

  const [paused, setPaused] = useState(false);
  const [showHeart, setShowHeart] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [swipeFeedback, setSwipeFeedback] = useState(null); // 'like' | 'unlike' | null

  const lastTap = useRef(0);

  // Shared values
  const translateX = useSharedValue(0);
  const heartScale = useSharedValue(0);
  const heartOpacity = useSharedValue(0);
  const pauseOpacity = useSharedValue(0);

  // ── Cleanup on unmount ──
  React.useEffect(() => {
    return () => {
      videoRef.current?.stopAsync?.();
    };
  }, []);

  // ── Swipe handlers ──
  const onSwipeLike = useCallback(() => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    toggleFavorite(video);
    setSwipeFeedback(isFavorite(video.id) ? 'unlike' : 'like');
    setTimeout(() => setSwipeFeedback(null), 1000);
  }, [video, toggleFavorite, isFavorite]);

  const onSwipeDelete = useCallback(() => {
    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    setShowDeleteModal(true);
  }, []);

  const gestureHandler = useAnimatedGestureHandler({
    onActive: ({ translationX }) => {
      translateX.value = translationX * 0.45;
    },
    onEnd: ({ translationX }) => {
      if (translationX > SWIPE_LIKE_THRESHOLD) runOnJS(onSwipeLike)();
      else if (translationX < SWIPE_DELETE_THRESHOLD) runOnJS(onSwipeDelete)();
      translateX.value = withSpring(0, { damping: 24, stiffness: 240 });
    },
  });

  // ── Tap handler (single = pause, double = like) ──
  const handleTap = useCallback(() => {
    const now = Date.now();
    if (now - lastTap.current < 280) {
      // Double tap → like
      if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      toggleFavorite(video);
      setShowHeart(true);
      heartScale.value = withSequence(
        withSpring(1.4, { damping: 7 }),
        withTiming(1.1, { duration: 100 }),
        withTiming(0, { duration: 380 })
      );
      heartOpacity.value = withSequence(
        withTiming(1, { duration: 60 }),
        withTiming(1, { duration: 450 }),
        withTiming(0, { duration: 250 })
      );
      setTimeout(() => setShowHeart(false), 850);
    } else {
      // Single tap → pause/play
      setPaused((p) => {
        pauseOpacity.value = withSequence(
          withTiming(1, { duration: 70 }),
          withTiming(0, { duration: 650 })
        );
        return !p;
      });
    }
    lastTap.current = now;
  }, [video, toggleFavorite]);

  const handleLongPress = useCallback(() => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setPaused(true);
  }, []);

  const handlePressOut = useCallback(() => setPaused(false), []);

  // ── Animated styles ──
  const containerAnim = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const swipeOverlay = useAnimatedStyle(() => {
    const tx = translateX.value;
    const greenA = interpolate(tx, [0, 120], [0, 0.38], Extrapolate.CLAMP);
    const redA = interpolate(-tx, [0, 120], [0, 0.38], Extrapolate.CLAMP);
    if (tx > 0) return { backgroundColor: `rgba(0,255,148,${greenA})` };
    if (tx < 0) return { backgroundColor: `rgba(255,77,77,${redA})` };
    return { backgroundColor: 'transparent' };
  });

  const heartAnim = useAnimatedStyle(() => ({
    transform: [{ scale: heartScale.value }],
    opacity: heartOpacity.value,
  }));

  const pauseAnim = useAnimatedStyle(() => ({ opacity: pauseOpacity.value }));

  // ── Swipe icon hints ──
  const leftHintAnim = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [0, 60], [0, 1], Extrapolate.CLAMP),
    transform: [{ scale: interpolate(translateX.value, [0, 80], [0.7, 1.1], Extrapolate.CLAMP) }],
  }));
  const rightHintAnim = useAnimatedStyle(() => ({
    opacity: interpolate(-translateX.value, [0, 60], [0, 1], Extrapolate.CLAMP),
    transform: [{ scale: interpolate(-translateX.value, [0, 80], [0.7, 1.1], Extrapolate.CLAMP) }],
  }));

  return (
    <View style={styles.container}>
      <PanGestureHandler
        onGestureEvent={gestureHandler}
        activeOffsetX={[-14, 14]}
        failOffsetY={[-10, 10]}
      >
        <Animated.View style={[styles.inner, containerAnim]}>

          {/* ── Video ── */}
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={handleTap}
            onLongPress={handleLongPress}
            onPressOut={handlePressOut}
            delayLongPress={320}
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

          {/* ── Swipe color flash ── */}
          <Animated.View style={[StyleSheet.absoluteFill, swipeOverlay]} pointerEvents="none" />

          {/* ── Swipe hint icons ── */}
          <Animated.View style={[styles.swipeHint, styles.swipeHintLeft, leftHintAnim]} pointerEvents="none">
            <Text style={styles.swipeHintText}>♥</Text>
          </Animated.View>
          <Animated.View style={[styles.swipeHint, styles.swipeHintRight, rightHintAnim]} pointerEvents="none">
            <Text style={styles.swipeHintText}>🗑</Text>
          </Animated.View>

          {/* ── Top gradient ── */}
          <LinearGradient
            colors={['rgba(10,10,15,0.72)', 'transparent']}
            style={styles.topGradient}
            pointerEvents="none"
          />

          {/* ── Bottom gradient ── */}
          <LinearGradient
            colors={['transparent', 'rgba(10,10,15,0.6)', 'rgba(10,10,15,0.92)']}
            style={styles.bottomGradient}
            pointerEvents="none"
          />

          {/* ── Pause flash ── */}
          <Animated.View style={[styles.pauseFlash, pauseAnim]} pointerEvents="none">
            <BlurView intensity={28} tint="dark" style={styles.pauseCircle}>
              <Text style={styles.pauseIcon}>{paused ? '▶' : '⏸'}</Text>
            </BlurView>
          </Animated.View>

          {/* ── Double-tap heart burst ── */}
          {showHeart && (
            <Animated.Text style={[styles.bigHeart, heartAnim]} pointerEvents="none">♥</Animated.Text>
          )}

          {/* ── Swipe feedback pill ── */}
          {swipeFeedback && (
            <View style={styles.swipeFeedbackPill}>
              <Text style={styles.swipeFeedbackText}>
                {swipeFeedback === 'like' ? '♥ Added to Favorites' : '♡ Removed'}
              </Text>
            </View>
          )}

          {/* ── RIGHT SIDE CONTROLS (thumb-friendly) ── */}
          <View style={styles.rightControls}>
            <SideBtn
              icon={liked ? '♥' : '♡'}
              label={liked ? 'Liked' : 'Like'}
              active={liked}
              onPress={() => {
                toggleFavorite(video);
                if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
            />
            <SideBtn
              icon="🗑"
              label="Delete"
              danger
              onPress={() => setShowDeleteModal(true)}
            />
          </View>

          {/* ── BOTTOM META ── */}
          <View style={styles.bottomMeta}>
            <Text style={styles.filename} numberOfLines={1}>{shortenName(video.filename)}</Text>
            <BlurView intensity={30} tint="dark" style={styles.durationPill}>
              <Text style={styles.durationText}>{formatDuration(video.duration)}</Text>
            </BlurView>
          </View>

        </Animated.View>
      </PanGestureHandler>

      {/* ── Delete Confirm Modal ── */}
      <DeleteModal
        visible={showDeleteModal}
        filename={video.filename}
        onCancel={() => setShowDeleteModal(false)}
        onConfirm={() => {
          setShowDeleteModal(false);
          onDelete();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: W, height: H, backgroundColor: '#0A0A0F' },
  inner: { flex: 1 },

  topGradient: { position: 'absolute', left: 0, right: 0, top: 0, height: 130, zIndex: 2 },
  bottomGradient: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 280, zIndex: 2 },

  pauseFlash: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', zIndex: 8 },
  pauseCircle: {
    width: 68, height: 68, borderRadius: 34,
    justifyContent: 'center', alignItems: 'center', overflow: 'hidden',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
  },
  pauseIcon: { fontSize: 26, color: '#fff' },

  bigHeart: {
    position: 'absolute', alignSelf: 'center', top: '34%',
    fontSize: 100, color: '#FF4D4D', zIndex: 10,
    textShadowColor: 'rgba(255,77,77,0.7)',
    textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 32,
  },

  swipeFeedbackPill: {
    position: 'absolute', alignSelf: 'center', top: '46%', zIndex: 20,
    backgroundColor: 'rgba(10,10,15,0.82)',
    paddingHorizontal: 20, paddingVertical: 10, borderRadius: 28,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
  },
  swipeFeedbackText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  swipeHint: {
    position: 'absolute', top: '46%', zIndex: 5,
    backgroundColor: 'rgba(255,255,255,0.09)',
    borderRadius: 16, padding: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
  },
  swipeHintLeft: { left: 16 },
  swipeHintRight: { right: 16 },
  swipeHintText: { fontSize: 22 },

  // Right sidebar
  rightControls: {
    position: 'absolute', right: 14, bottom: 130,
    alignItems: 'center', gap: 12, zIndex: 10,
  },
  sideBtn: {
    alignItems: 'center', paddingVertical: 13, paddingHorizontal: 13,
    borderRadius: 22, overflow: 'hidden',
    borderWidth: 1,
    minWidth: 60,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35, shadowRadius: 8, elevation: 5,
  },
  sideBtnIcon: { fontSize: 23, color: '#fff' },
  sideBtnLabel: {
    color: 'rgba(255,255,255,0.65)', fontSize: 10,
    fontWeight: '700', marginTop: 5, letterSpacing: 0.4,
  },

  // Bottom meta
  bottomMeta: {
    position: 'absolute', bottom: 86, left: 18, right: 90, zIndex: 10,
    gap: 8,
  },
  filename: {
    color: '#fff', fontSize: 13, fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.9)',
    textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 6,
  },
  durationPill: {
    alignSelf: 'flex-start', borderRadius: 10, overflow: 'hidden',
    paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  durationText: { color: '#fff', fontSize: 11, fontWeight: '600' },

  // Delete modal
  deleteModalBg: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center', alignItems: 'center', paddingHorizontal: 28,
  },
  deleteModalCard: {
    width: '100%', borderRadius: 28, overflow: 'hidden',
    padding: 28, alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,77,77,0.2)',
  },
  deleteIconWrap: {
    width: 68, height: 68, borderRadius: 34,
    backgroundColor: 'rgba(255,77,77,0.12)',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 16, borderWidth: 1, borderColor: 'rgba(255,77,77,0.25)',
  },
  deleteModalEmoji: { fontSize: 30 },
  deleteModalTitle: { color: '#fff', fontSize: 20, fontWeight: '800', marginBottom: 8 },
  deleteModalSub: { color: 'rgba(255,255,255,0.5)', fontSize: 13, textAlign: 'center', marginBottom: 6 },
  deleteModalWarn: { color: 'rgba(255,77,77,0.75)', fontSize: 12, marginBottom: 24, fontWeight: '600' },
  deleteModalBtns: { flexDirection: 'row', gap: 12, width: '100%' },
  deleteCancelBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
  },
  deleteCancelText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  deleteConfirmBtn: { flex: 1, borderRadius: 16, overflow: 'hidden' },
  deleteConfirmGrad: { paddingVertical: 14, alignItems: 'center' },
  deleteConfirmText: { color: '#fff', fontSize: 15, fontWeight: '800' },
});
