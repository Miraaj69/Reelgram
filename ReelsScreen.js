import React, { useRef, useState, useCallback } from 'react';
import {
  View, FlatList, Dimensions, StyleSheet,
  Text, ActivityIndicator, TouchableOpacity, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useMediaLibrary } from './useMediaLibrary';
import VideoItem from './VideoItem';

const { height: H } = Dimensions.get('window');

export default function ReelsScreen() {
  const { videos, loading, permissionGranted, deleteVideo, reload, loadMore } = useMediaLibrary();
  const [activeIndex, setActiveIndex] = useState(0);
  const flatRef = useRef(null);

  const onViewableItemsChanged = useCallback(({ viewableItems }) => {
    if (viewableItems.length > 0) setActiveIndex(viewableItems[0].index ?? 0);
  }, []);

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 60 }).current;

  const handleDelete = useCallback((video) => {
    // Delete confirmation is now handled inside VideoItem (DeleteModal)
    // This function just executes the delete after confirmation
    deleteVideo(video.id).then((ok) => {
      if (!ok) Alert.alert('Error', 'Could not delete this video.');
    });
  }, [deleteVideo]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#6C5CE7" />
        <Text style={styles.loadingText}>Loading your videos...</Text>
      </View>
    );
  }

  if (!permissionGranted) {
    return (
      <View style={styles.center}>
        <Text style={styles.bigEmoji}>🔒</Text>
        <Text style={styles.emptyTitle}>Permission Required</Text>
        <Text style={styles.emptySubtitle}>Allow access to your media library</Text>
        <TouchableOpacity style={styles.accentBtn} onPress={reload}>
          <LinearGradient colors={['#6C5CE7', '#00C6FF']} style={styles.accentBtnGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
            <Text style={styles.accentBtnText}>Grant Permission</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    );
  }

  if (videos.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.bigEmoji}>🎬</Text>
        <Text style={styles.emptyTitle}>No Videos Found</Text>
        <Text style={styles.emptySubtitle}>Record some videos to get started</Text>
        <TouchableOpacity style={styles.accentBtn} onPress={reload}>
          <LinearGradient colors={['#6C5CE7', '#00C6FF']} style={styles.accentBtnGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
            <Text style={styles.accentBtnText}>Refresh</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatRef}
        data={videos}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <VideoItem
            video={item}
            isActive={index === activeIndex}
            onDelete={() => handleDelete(item)}
          />
        )}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        snapToInterval={H}
        snapToAlignment="start"
        decelerationRate="fast"
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        getItemLayout={(_, i) => ({ length: H, offset: H * i, index: i })}
        removeClippedSubviews
        windowSize={3}
        initialNumToRender={2}
        maxToRenderPerBatch={2}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
      />

      {/* ── Top header overlay ── */}
      <SafeAreaView style={styles.header} pointerEvents="none">
        <Text style={styles.logo}>ReelGram</Text>
        <BlurView intensity={35} tint="dark" style={styles.countPill}>
          <Text style={styles.countText}>{videos.length} videos</Text>
        </BlurView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0F' },
  center: {
    flex: 1, backgroundColor: '#0A0A0F',
    justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40,
  },
  header: {
    position: 'absolute', top: 0, left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingHorizontal: 20, paddingTop: 6, zIndex: 20,
  },
  logo: {
    fontSize: 22, fontWeight: '800', letterSpacing: -0.5, color: '#fff',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4,
  },
  countPill: {
    borderRadius: 14, overflow: 'hidden',
    paddingHorizontal: 12, paddingVertical: 5,
    borderWidth: 1, borderColor: 'rgba(108,92,231,0.3)',
  },
  countText: { color: '#A29BFE', fontSize: 12, fontWeight: '700' },
  loadingText: { color: 'rgba(255,255,255,0.5)', fontSize: 15, marginTop: 14 },
  bigEmoji: { fontSize: 64, marginBottom: 20 },
  emptyTitle: { color: '#fff', fontSize: 24, fontWeight: '700', textAlign: 'center', marginBottom: 10 },
  emptySubtitle: { color: 'rgba(255,255,255,0.42)', fontSize: 15, textAlign: 'center', lineHeight: 22, marginBottom: 28 },
  accentBtn: { borderRadius: 30, overflow: 'hidden' },
  accentBtnGrad: { paddingHorizontal: 32, paddingVertical: 13 },
  accentBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
