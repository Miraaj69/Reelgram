import React, { useRef, useState, useCallback, useEffect } from 'react';
import {
  View, StyleSheet, Dimensions, Text,
  Platform, Modal, TouchableOpacity,
} from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue, useAnimatedStyle,
  withSpring, withTiming, withSequence,
  runOnJS, interpolate, Extrapolate,
} from 'react-native-reanimated';
import {
  Gesture, GestureDetector,
} from 'react-native-gesture-handler';
import { LinearGradient } from 'expo-linear-gradient';
import { useVideoContext } from './VideoContext';

const { width: W, height: H } = Dimensions.get('window');
const SWIPE_THRESHOLD = 100;

function shortenName(name = '') {
  // Remove extension, shorten
  const base = name.replace(/\.[^/.]+$/, '');
  return base.length > 26 ? base.slice(0, 24) + '…' : base;
}

function formatDuration(s) {
  if (!s) return '0:00';
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
}

// ── Clean action button (no blur, solid opacity) ──
function ActionBtn({ icon, onPress, onPressIn, onPressOut, active, danger, size = 22 }) {
  const scale = useSharedValue(1);

  const anim = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const triggerPress = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(
        danger ? Haptics.ImpactFeedbackStyle.Heavy : Haptics.ImpactFeedbackStyle.Light
      );
    }
    onPress?.();
  };

  const handlePressIn = () => {
    scale.value = withTiming(0.85, { duration: 80 });
    onPressIn?.();
  };
  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 12 });
    onPressOut?.();
  };

  return (
    <Animated.View style={anim}>
      <TouchableOpacity
        onPress={triggerPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
        style={[
          styles.actionBtn,
          active && styles.actionBtnActive,
          danger && styles.actionBtnDanger,
        ]}
      >
        <Text style={[styles.actionBtnIcon, { fontSize: size }]}>{icon}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ── Delete Confirm Modal ──
function DeleteModal({ visible, filename, onCancel, onConfirm }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.modalOverlay}>
        <View style={styles.deleteCard}>
          <View style={styles.deleteIconCircle}>
            <Text style={{ fontSize: 28 }}>🗑</Text>
          </View>
          <Text style={styles.deleteTitle}>Delete Video?</Text>
          <Text style={styles.deleteSub} numberOfLines={2}>{shortenName(filename)}</Text>
          <Text style={styles.deleteWarn}>This cannot be undone.</Text>
          <View style={styles.deleteBtns}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.confirmBtn} onPress={onConfirm}>
              <Text style={styles.confirmText}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default function VideoItem({ video, isActive, onDelete }) {
  const videoRef = useRef(null);
  const { toggleFavorite, isFavorite } = useVideoContext();
  const liked = isFavorite(video.id);

  const [paused, setPaused] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showHeart, setShowHeart] = useState(false);

  // Shared values
  const translateX = useSharedValue(0);
  const overlayOpacity = useSharedValue(0);      // red/green flash
  const overlayColor = useSharedValue(0);         // 0=green 1=red
  const heartScale = useSharedValue(0);
  const heartOpacity = useSharedValue(0);
  const pauseOpacity = useSharedValue(0);
  const progressWidth = useSharedValue(0);        // thin top progress bar

  // ── Cleanup ──
  useEffect(() => {
    return () => {
      videoRef.current?.stopAsync?.();
    };
  }, []);

  // ── Haptic helpers (JS thread) ──
  const hapticLight = useCallback(() => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);
  const hapticMedium = useCallback(() => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, []);
  const hapticHeavy = useCallback(() => {
    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  }, []);

  // ── Like action ──
  const doLike = useCallback(() => {
    hapticMedium();
    toggleFavorite(video);
  }, [video, toggleFavorite, hapticMedium]);

  // ── Show delete modal ──
  const doAskDelete = useCallback(() => {
    hapticHeavy();
    setShowDeleteModal(true);
  }, [hapticHeavy]);

  // ── Double tap heart burst ──
  const triggerHeart = useCallback(() => {
    hapticMedium();
    toggleFavorite(video);
    setShowHeart(true);
    heartScale.value = withSequence(
      withSpring(1.3, { damping: 6 }),
      withTiming(1.1, { duration: 100 }),
      withTiming(0, { duration: 400 })
    );
    heartOpacity.value = withSequence(
      withTiming(1, { duration: 50 }),
      withTiming(1, { duration: 420 }),
      withTiming(0, { duration: 220 })
    );
    setTimeout(() => setShowHeart(false), 900);
  }, [video, toggleFavorite, hapticMedium]);

  // ── Pause toggle ──
  const togglePause = useCallback(() => {
    setPaused((p) => {
      pauseOpacity.value = withSequence(
        withTiming(1, { duration: 60 }),
        withTiming(0, { duration: 700 })
      );
      return !p;
    });
  }, []);

  const pauseVideo = useCallback(() => setPaused(true), []);
  const resumeVideo = useCallback(() => setPaused(false), []);

  // ── GESTURES (new Gesture API — conflict-free) ──

  // Pan swipe
  const pan = Gesture.Pan()
    .activeOffsetX([-16, 16])
    .failOffsetY([-12, 12])
    .onUpdate((e) => {
      translateX.value = e.translationX * 0.42;
      const absX = Math.abs(e.translationX);
      overlayOpacity.value = Math.min(absX / 160, 0.42);
      overlayColor.value = e.translationX > 0 ? 0 : 1;
    })
    .onEnd((e) => {
      if (e.translationX > SWIPE_THRESHOLD) {
        runOnJS(doLike)();
      } else if (e.translationX < -SWIPE_THRESHOLD) {
        runOnJS(doAskDelete)();
      }
      translateX.value = withSpring(0, { damping: 22, stiffness: 220 });
      overlayOpacity.value = withTiming(0, { duration: 300 });
    });

  // Double tap
  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .maxDelay(250)
    .onStart(() => {
      runOnJS(triggerHeart)();
    });

  // Single tap
  const singleTap = Gesture.Tap()
    .numberOfTaps(1)
    .requireExternalGestureToFail(doubleTap)
    .onStart(() => {
      runOnJS(togglePause)();
    });

  // Long press pause
  const longPress = Gesture.LongPress()
    .minDuration(300)
    .onStart(() => {
      runOnJS(pauseVideo)();
      runOnJS(hapticLight)();
    })
    .onEnd(() => {
      runOnJS(resumeVideo)();
    });

  const composed = Gesture.Simultaneous(
    pan,
    Gesture.Exclusive(doubleTap, singleTap),
    longPress
  );

  // ── Animated styles ──
  const containerAnim = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const overlayAnim = useAnimatedStyle(() => {
    const r = overlayColor.value === 1 ? 255 : 0;
    const g = overlayColor.value === 1 ? 55 : 220;
    const b = overlayColor.value === 1 ? 48 : 100;
    return {
      backgroundColor: `rgba(${r},${g},${b},${overlayOpacity.value})`,
    };
  });

  const heartAnim = useAnimatedStyle(() => ({
    transform: [{ scale: heartScale.value }],
    opacity: heartOpacity.value,
  }));

  const pauseAnim = useAnimatedStyle(() => ({
    opacity: pauseOpacity.value,
  }));

  const swipeHintLeftAnim = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [0, 50], [0, 1], Extrapolate.CLAMP),
    transform: [{ scale: interpolate(translateX.value, [0, 80], [0.6, 1.05], Extrapolate.CLAMP) }],
  }));

  const swipeHintRightAnim = useAnimatedStyle(() => ({
    opacity: interpolate(-translateX.value, [0, 50], [0, 1], Extrapolate.CLAMP),
    transform: [{ scale: interpolate(-translateX.value, [0, 80], [0.6, 1.05], Extrapolate.CLAMP) }],
  }));

  return (
    <View style={styles.container}>
      <GestureDetector gesture={composed}>
        <Animated.View style={[styles.inner, containerAnim]}>

          {/* ── Video ── */}
          <Video
            ref={videoRef}
            source={{ uri: video.uri }}
            style={StyleSheet.absoluteFill}
            resizeMode={ResizeMode.COVER}
            shouldPlay={isActive && !paused}
            isLooping
            isMuted={false}
            onPlaybackStatusUpdate={(status) => {
              if (status.durationMillis && status.positionMillis) {
                progressWidth.value = status.positionMillis / status.durationMillis;
              }
            }}
          />

          {/* ── Swipe color flash ── */}
          <Animated.View style={[StyleSheet.absoluteFill, overlayAnim]} pointerEvents="none" />

          {/* ── Swipe hint icons ── */}
          <Animated.View style={[styles.swipeHint, styles.swipeHintLeft, swipeHintLeftAnim]} pointerEvents="none">
            <Text style={styles.swipeHintIcon}>♥</Text>
          </Animated.View>
          <Animated.View style={[styles.swipeHint, styles.swipeHintRight, swipeHintRightAnim]} pointerEvents="none">
            <Text style={styles.swipeHintIcon}>🗑</Text>
          </Animated.View>

          {/* ── Top gradient ── */}
          <LinearGradient
            colors={['rgba(0,0,0,0.65)', 'rgba(0,0,0,0.2)', 'transparent']}
            style={styles.topGradient}
            pointerEvents="none"
          />

          {/* ── Bottom gradient ── */}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.45)', 'rgba(0,0,0,0.82)']}
            style={styles.bottomGradient}
            pointerEvents="none"
          />

          {/* ── Pause indicator ── */}
          <Animated.View style={[styles.pauseIndicator, pauseAnim]} pointerEvents="none">
            <Text style={styles.pauseIcon}>{paused ? '▶' : '⏸'}</Text>
          </Animated.View>

          {/* ── Double-tap heart burst ── */}
          {showHeart && (
            <Animated.Text style={[styles.bigHeart, heartAnim]} pointerEvents="none">♥</Animated.Text>
          )}

          {/* ── RIGHT SIDE ACTIONS ── */}
          <View style={styles.rightActions}>
            <ActionBtn
              icon={liked ? '♥' : '♡'}
              active={liked}
              onPress={doLike}
            />
            <ActionBtn
              icon="🗑"
              danger
              onPress={doAskDelete}
            />
          </View>

          {/* ── BOTTOM META ── */}
          <View style={styles.bottomMeta}>
            <Text style={styles.videoName} numberOfLines={1}>{shortenName(video.filename)}</Text>
            <Text style={styles.videoDuration}>{formatDuration(video.duration)}</Text>
          </View>

          {/* ── Thin progress bar ── */}
          <ProgressBar progressWidth={progressWidth} />

        </Animated.View>
      </GestureDetector>

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

// Separate component to avoid re-render
function ProgressBar({ progressWidth }) {
  const barAnim = useAnimatedStyle(() => ({
    width: `${progressWidth.value * 100}%`,
  }));
  return (
    <View style={styles.progressTrack} pointerEvents="none">
      <Animated.View style={[styles.progressFill, barAnim]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: W, height: H, backgroundColor: '#000' },
  inner: { flex: 1 },

  topGradient: { position: 'absolute', left: 0, right: 0, top: 0, height: 120, zIndex: 2 },
  bottomGradient: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 300, zIndex: 2 },

  pauseIndicator: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center', alignItems: 'center', zIndex: 8,
  },
  pauseIcon: {
    fontSize: 48, color: 'rgba(255,255,255,0.88)',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 8,
  },

  bigHeart: {
    position: 'absolute', alignSelf: 'center', top: '34%',
    fontSize: 110, color: '#FF2D55', zIndex: 10,
    textShadowColor: 'rgba(255,45,85,0.6)',
    textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 30,
  },

  swipeHint: {
    position: 'absolute', top: '45%', zIndex: 5,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 50, padding: 14,
  },
  swipeHintLeft: { left: 20 },
  swipeHintRight: { right: 20 },
  swipeHintIcon: { fontSize: 24 },

  // Right actions
  rightActions: {
    position: 'absolute', right: 16, bottom: 120,
    alignItems: 'center', gap: 14, zIndex: 10,
  },
  actionBtn: {
    backgroundColor: 'rgba(0,0,0,0.42)',
    borderRadius: 50,
    padding: 13,
    alignItems: 'center', justifyContent: 'center',
  },
  actionBtnActive: {
    backgroundColor: 'rgba(255,45,85,0.18)',
  },
  actionBtnDanger: {
    backgroundColor: 'rgba(255,59,48,0.15)',
  },
  actionBtnIcon: { color: '#fff' },

  // Bottom meta
  bottomMeta: {
    position: 'absolute', bottom: 88, left: 18, right: 80, zIndex: 10, gap: 4,
  },
  videoName: {
    color: '#fff', fontSize: 14, fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.9)',
    textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 6,
  },
  videoDuration: {
    color: 'rgba(255,255,255,0.55)', fontSize: 12, fontWeight: '500',
  },

  // Progress bar
  progressTrack: {
    position: 'absolute', top: 0, left: 0, right: 0,
    height: 2, backgroundColor: 'rgba(255,255,255,0.12)', zIndex: 20,
  },
  progressFill: {
    height: 2, backgroundColor: '#FF2D55',
  },

  // Delete modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.78)',
    justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32,
  },
  deleteCard: {
    width: '100%', backgroundColor: '#1C1C1E',
    borderRadius: 24, padding: 28, alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,59,48,0.25)',
  },
  deleteIconCircle: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: 'rgba(255,59,48,0.12)',
    justifyContent: 'center', alignItems: 'center', marginBottom: 16,
    borderWidth: 1, borderColor: 'rgba(255,59,48,0.2)',
  },
  deleteTitle: { color: '#fff', fontSize: 20, fontWeight: '800', marginBottom: 8 },
  deleteSub: {
    color: 'rgba(255,255,255,0.45)', fontSize: 13,
    textAlign: 'center', marginBottom: 6,
  },
  deleteWarn: {
    color: 'rgba(255,59,48,0.7)', fontSize: 12,
    fontWeight: '600', marginBottom: 24,
  },
  deleteBtns: { flexDirection: 'row', gap: 12, width: '100%' },
  cancelBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
  },
  cancelText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  confirmBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 14,
    backgroundColor: '#FF3B30', alignItems: 'center',
  },
  confirmText: { color: '#fff', fontSize: 15, fontWeight: '800' },
});
