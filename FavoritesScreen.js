import React, { useState } from 'react';
import {
  View, FlatList, StyleSheet, Text, Dimensions,
  TouchableOpacity, Modal, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Video, ResizeMode } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, withSequence,
} from 'react-native-reanimated';
import { useVideoContext } from './VideoContext';

const { width: W, height: H } = Dimensions.get('window');
const CARD = (W - 52) / 2;

function formatDuration(s) {
  if (!s) return '0:00';
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
}

function formatDate(ts) {
  if (!ts) return '';
  return new Date(ts * 1000).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

function VideoCard({ item, onPress, onRemove }) {
  const scale = useSharedValue(1);
  const cardAnim = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const handlePress = () => {
    scale.value = withSequence(withSpring(0.92, { damping: 10 }), withSpring(1, { damping: 12 }));
    onPress();
  };

  return (
    <Animated.View style={[styles.card, cardAnim]}>
      <TouchableOpacity onPress={handlePress} activeOpacity={1}>
        <View style={styles.thumbWrap}>
          <Video
            source={{ uri: item.uri }}
            style={styles.thumb}
            resizeMode={ResizeMode.COVER}
            shouldPlay={false}
            isMuted
            positionMillis={800}
          />
          <LinearGradient
            colors={['transparent', 'rgba(10,10,15,0.85)']}
            style={styles.cardGrad}
          />
          <BlurView intensity={28} tint="dark" style={styles.durationBadge}>
            <Text style={styles.durationText}>{formatDuration(item.duration)}</Text>
          </BlurView>
          <TouchableOpacity style={styles.removeBtn} onPress={onRemove}>
            <BlurView intensity={30} tint="dark" style={styles.removeBtnBlur}>
              <Text style={styles.removeBtnText}>✕</Text>
            </BlurView>
          </TouchableOpacity>
          <Text style={styles.heartBadge}>♥</Text>
        </View>
        <View style={styles.cardMeta}>
          <Text style={styles.cardName} numberOfLines={1}>{item.filename}</Text>
          <Text style={styles.cardDate}>{formatDate(item.creationTime)}</Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function FavoritesScreen() {
  const { favorites, toggleFavorite } = useVideoContext();
  const [selected, setSelected] = useState(null);

  const handleRemove = (video) => {
    Alert.alert('Remove Favorite?', `"${video.filename}"`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => toggleFavorite(video) },
    ]);
  };

  if (favorites.length === 0) {
    return (
      <View style={styles.container}>
        <SafeAreaView>
          <View style={styles.headerRow}>
            <Text style={styles.header}>Favorites</Text>
          </View>
        </SafeAreaView>
        <View style={styles.emptyWrap}>
          <Text style={styles.bigEmoji}>🎞</Text>
          <Text style={styles.emptyTitle}>Nothing saved yet</Text>
          <Text style={styles.emptySubtitle}>Swipe right or tap ♥ on a video to save it here</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SafeAreaView>
        <View style={styles.headerRow}>
          <Text style={styles.header}>Favorites</Text>
          <BlurView intensity={35} tint="dark" style={styles.countBadge}>
            <Text style={styles.countText}>{favorites.length}</Text>
          </BlurView>
        </View>
      </SafeAreaView>

      <FlatList
        data={favorites}
        numColumns={2}
        keyExtractor={(item) => item.id}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <VideoCard
            item={item}
            onPress={() => setSelected(item)}
            onRemove={() => handleRemove(item)}
          />
        )}
      />

      {/* Full-screen preview modal */}
      {selected && (
        <Modal visible animationType="fade" transparent onRequestClose={() => setSelected(null)}>
          <View style={styles.modalBg}>
            <Video
              source={{ uri: selected.uri }}
              style={styles.modalVideo}
              resizeMode={ResizeMode.CONTAIN}
              shouldPlay isLooping useNativeControls
            />
            <LinearGradient
              colors={['rgba(10,10,15,0.92)', 'transparent']}
              style={styles.modalTop}
            >
              <SafeAreaView>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle} numberOfLines={1}>{selected.filename}</Text>
                  <TouchableOpacity onPress={() => setSelected(null)}>
                    <BlurView intensity={35} tint="dark" style={styles.closeBtn}>
                      <Text style={styles.closeBtnText}>✕</Text>
                    </BlurView>
                  </TouchableOpacity>
                </View>
              </SafeAreaView>
            </LinearGradient>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0F' },
  headerRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 8, paddingBottom: 14, gap: 12,
  },
  header: { color: '#fff', fontSize: 28, fontWeight: '800', letterSpacing: -0.6 },
  countBadge: {
    borderRadius: 13, overflow: 'hidden',
    paddingHorizontal: 12, paddingVertical: 5,
    borderWidth: 1, borderColor: 'rgba(108,92,231,0.35)',
  },
  countText: { color: '#A29BFE', fontSize: 13, fontWeight: '700' },
  listContent: { paddingHorizontal: 16, paddingBottom: 120, gap: 12 },
  row: { gap: 12, justifyContent: 'space-between' },
  card: {
    width: CARD, borderRadius: 20, overflow: 'hidden',
    backgroundColor: '#161820',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
  },
  thumbWrap: { width: CARD, height: CARD * 1.45, position: 'relative' },
  thumb: { width: '100%', height: '100%' },
  cardGrad: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 80 },
  durationBadge: {
    position: 'absolute', bottom: 8, left: 8,
    borderRadius: 9, overflow: 'hidden',
    paddingHorizontal: 8, paddingVertical: 3,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  durationText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  removeBtn: { position: 'absolute', top: 8, right: 8 },
  removeBtnBlur: {
    width: 28, height: 28, borderRadius: 14, overflow: 'hidden',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
  },
  removeBtnText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  heartBadge: { position: 'absolute', bottom: 10, right: 10, color: '#FF4D4D', fontSize: 14 },
  cardMeta: { padding: 10 },
  cardName: { color: '#fff', fontSize: 12, fontWeight: '600', marginBottom: 3 },
  cardDate: { color: 'rgba(255,255,255,0.32)', fontSize: 11 },
  emptyWrap: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 40, marginTop: -40,
  },
  bigEmoji: { fontSize: 64, marginBottom: 20 },
  emptyTitle: { color: '#fff', fontSize: 24, fontWeight: '700', textAlign: 'center', marginBottom: 10 },
  emptySubtitle: { color: 'rgba(255,255,255,0.38)', fontSize: 15, textAlign: 'center', lineHeight: 22 },
  modalBg: { flex: 1, backgroundColor: 'rgba(10,10,15,0.97)', justifyContent: 'center' },
  modalVideo: { width: W, height: H * 0.72 },
  modalTop: { position: 'absolute', top: 0, left: 0, right: 0, height: 120 },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 4,
  },
  modalTitle: { color: '#fff', fontSize: 15, fontWeight: '600', flex: 1, marginRight: 12 },
  closeBtn: {
    width: 36, height: 36, borderRadius: 18, overflow: 'hidden',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  closeBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
