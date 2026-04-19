import React, { useState } from 'react';
import {
  View, FlatList, StyleSheet, Text, Dimensions,
  TouchableOpacity, Modal, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Video, ResizeMode } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, withSequence,
} from 'react-native-reanimated';
import { useVideoContext } from './VideoContext';

const { width: W, height: H } = Dimensions.get('window');
const CARD = (W - 48) / 2;

function formatDuration(s) {
  if (!s) return '0:00';
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
}

function formatDate(ts) {
  if (!ts) return '';
  return new Date(ts * 1000).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

function shortenName(name = '') {
  const base = name.replace(/\.[^/.]+$/, '');
  return base.length > 20 ? base.slice(0, 18) + '…' : base;
}

function VideoCard({ item, onPress, onRemove }) {
  const scale = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View style={[styles.card, anim]}>
      <TouchableOpacity
        onPress={() => {
          scale.value = withSequence(withSpring(0.93, { damping: 10 }), withSpring(1, { damping: 12 }));
          onPress();
        }}
        activeOpacity={1}
      >
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
            colors={['transparent', 'rgba(0,0,0,0.75)']}
            style={styles.cardGrad}
          />
          <View style={styles.durationBadge}>
            <Text style={styles.durationText}>{formatDuration(item.duration)}</Text>
          </View>
          <TouchableOpacity style={styles.removeBtn} onPress={onRemove}>
            <Text style={styles.removeBtnText}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.heartBadge}>♥</Text>
        </View>
        <View style={styles.cardMeta}>
          <Text style={styles.cardName} numberOfLines={1}>{shortenName(item.filename)}</Text>
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
    Alert.alert('Remove?', `"${video.filename}"`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => toggleFavorite(video) },
    ]);
  };

  if (favorites.length === 0) {
    return (
      <View style={styles.container}>
        <SafeAreaView>
          <Text style={styles.header}>Favorites</Text>
        </SafeAreaView>
        <View style={styles.emptyWrap}>
          <Text style={styles.bigEmoji}>🎞</Text>
          <Text style={styles.emptyTitle}>Nothing saved yet</Text>
          <Text style={styles.emptySubtitle}>Swipe right or double-tap a video to save it</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SafeAreaView>
        <View style={styles.headerRow}>
          <Text style={styles.header}>Favorites</Text>
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{favorites.length}</Text>
          </View>
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
              colors={['rgba(0,0,0,0.9)', 'transparent']}
              style={styles.modalTop}
            >
              <SafeAreaView>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle} numberOfLines={1}>{selected.filename}</Text>
                  <TouchableOpacity style={styles.closeBtn} onPress={() => setSelected(null)}>
                    <Text style={styles.closeBtnText}>✕</Text>
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
  container: { flex: 1, backgroundColor: '#000' },
  headerRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 8, paddingBottom: 14, gap: 10,
  },
  header: { color: '#fff', fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
  countBadge: {
    backgroundColor: 'rgba(255,45,85,0.15)',
    borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1, borderColor: 'rgba(255,45,85,0.3)',
  },
  countText: { color: '#FF2D55', fontSize: 13, fontWeight: '700' },
  listContent: { paddingHorizontal: 12, paddingBottom: 100, gap: 10 },
  row: { gap: 10 },
  card: {
    width: CARD, borderRadius: 16, overflow: 'hidden',
    backgroundColor: '#111',
  },
  thumbWrap: { width: CARD, height: CARD * 1.5, position: 'relative' },
  thumb: { width: '100%', height: '100%' },
  cardGrad: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 80 },
  durationBadge: {
    position: 'absolute', bottom: 8, left: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2,
  },
  durationText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  removeBtn: {
    position: 'absolute', top: 8, right: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    width: 26, height: 26, borderRadius: 13,
    justifyContent: 'center', alignItems: 'center',
  },
  removeBtnText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  heartBadge: { position: 'absolute', bottom: 10, right: 10, color: '#FF2D55', fontSize: 13 },
  cardMeta: { padding: 9 },
  cardName: { color: '#fff', fontSize: 12, fontWeight: '600', marginBottom: 2 },
  cardDate: { color: 'rgba(255,255,255,0.3)', fontSize: 11 },
  emptyWrap: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 40, marginTop: -40,
  },
  bigEmoji: { fontSize: 60, marginBottom: 18 },
  emptyTitle: { color: '#fff', fontSize: 22, fontWeight: '700', textAlign: 'center', marginBottom: 8 },
  emptySubtitle: { color: 'rgba(255,255,255,0.35)', fontSize: 14, textAlign: 'center', lineHeight: 21 },
  modalBg: { flex: 1, backgroundColor: '#000', justifyContent: 'center' },
  modalVideo: { width: W, height: H * 0.72 },
  modalTop: { position: 'absolute', top: 0, left: 0, right: 0, height: 110 },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 4,
  },
  modalTitle: { color: '#fff', fontSize: 14, fontWeight: '600', flex: 1, marginRight: 12 },
  closeBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center', alignItems: 'center',
  },
  closeBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
});
