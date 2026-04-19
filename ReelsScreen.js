import React, { useRef, useState, useCallback } from 'react';
import {
  View, FlatList, Dimensions, StyleSheet,
  Text, ActivityIndicator, TouchableOpacity, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
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
    Alert.alert(
      'Delete Video',
      `"${video.filename}" will be permanently deleted.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: async () => {
            const ok = await deleteVideo(video.id);
            if (!ok) Alert.alert('Error', 'Could not delete this video.');
          },
        },
      ]
    );
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

      {/* Logo header */}
      <SafeAreaView style={styles.header} pointerEvents="none">
        <Text style={styles.logo}>ReelGram</Text>
        <View style={styles.countPill}>
          <Text style={styles.countText}>{videos.length} videos</Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F1115' },
  center: {
    flex: 1, backgroundColor: '#0F1115',
    justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40,
  },
  header: {
    position: 'absolute', top: 0, left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingHorizontal: 20, paddingTop: 6,
    zIndex: 20,
  },
  logo: {
    fontSize: 22, fontWeight: '800', letterSpacing: -0.5,
    color: '#fff',
  },
  countPill: {
    backgroundColor: 'rgba(108,92,231,0.22)',
    borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1, borderColor: 'rgba(108,92,231,0.35)',
  },
  countText: { color: '#A29BFE', fontSize: 12, fontWeight: '600' },
  loadingText: { color: 'rgba(255,255,255,0.55)', fontSize: 15, marginTop: 14 },
  bigEmoji: { fontSize: 64, marginBottom: 20 },
  emptyTitle: { color: '#fff', fontSize: 24, fontWeight: '700', textAlign: 'center', marginBottom: 10 },
  emptySubtitle: { color: 'rgba(255,255,255,0.45)', fontSize: 15, textAlign: 'center', lineHeight: 22, marginBottom: 28 },
  accentBtn: { borderRadius: 30, overflow: 'hidden' },
  accentBtnGrad: { paddingHorizontal: 32, paddingVertical: 13 },
  accentBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
