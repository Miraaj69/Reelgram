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
    deleteVideo(video.id).then((ok) => {
      if (!ok) Alert.alert('Error', 'Could not delete this video.');
    });
  }, [deleteVideo]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#FF2D55" />
        <Text style={styles.loadingText}>Loading videos...</Text>
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
          <Text style={styles.accentBtnText}>Grant Permission</Text>
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
          <Text style={styles.accentBtnText}>Refresh</Text>
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
        updateCellsBatchingPeriod={50}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
      />

      {/* Header overlay */}
      <SafeAreaView style={styles.header} pointerEvents="none">
        <Text style={styles.logo}>ReelGram</Text>
        <View style={styles.countPill}>
          <Text style={styles.countText}>{videos.length}</Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  center: {
    flex: 1, backgroundColor: '#000',
    justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40,
  },
  header: {
    position: 'absolute', top: 0, left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingHorizontal: 20, paddingTop: 6, zIndex: 20,
  },
  logo: {
    fontSize: 20, fontWeight: '800', letterSpacing: -0.4, color: '#fff',
  },
  countPill: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4,
  },
  countText: { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '600' },
  loadingText: { color: 'rgba(255,255,255,0.45)', fontSize: 14, marginTop: 12 },
  bigEmoji: { fontSize: 56, marginBottom: 18 },
  emptyTitle: { color: '#fff', fontSize: 22, fontWeight: '700', textAlign: 'center', marginBottom: 8 },
  emptySubtitle: { color: 'rgba(255,255,255,0.4)', fontSize: 14, textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  accentBtn: {
    backgroundColor: '#FF2D55', borderRadius: 28,
    paddingHorizontal: 30, paddingVertical: 13,
  },
  accentBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
