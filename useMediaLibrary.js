import { useState, useEffect, useCallback } from 'react';
import * as MediaLibrary from 'expo-media-library';

export function useMediaLibrary() {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [permissionStatus, setPermissionStatus] = useState(null);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [endCursor, setEndCursor] = useState(null);

  useEffect(() => {
    requestPermissionAndLoad();
  }, []);

  const requestPermissionAndLoad = async () => {
    try {
      setLoading(true);
      const { status } = await MediaLibrary.requestPermissionsAsync();
      setPermissionStatus(status);

      if (status === 'granted') {
        await fetchVideos();
      }
    } catch (e) {
      console.log('Permission error:', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchVideos = async (cursor = null) => {
    try {
      const options = {
        mediaType: MediaLibrary.MediaType.video,
        first: 50,
        sortBy: [MediaLibrary.SortBy.creationTime],
      };

      if (cursor) {
        options.after = cursor;
      }

      const result = await MediaLibrary.getAssetsAsync(options);

      if (cursor) {
        setVideos((prev) => [...prev, ...result.assets]);
      } else {
        setVideos(result.assets);
      }

      setHasNextPage(result.hasNextPage);
      setEndCursor(result.endCursor);
    } catch (e) {
      console.log('Error fetching videos:', e);
    }
  };

  const loadMore = useCallback(() => {
    if (hasNextPage && endCursor) {
      fetchVideos(endCursor);
    }
  }, [hasNextPage, endCursor]);

  const deleteVideo = useCallback(async (id) => {
    try {
      const result = await MediaLibrary.deleteAssetsAsync([id]);
      if (result) {
        setVideos((prev) => prev.filter((v) => v.id !== id));
        return true;
      }
      return false;
    } catch (e) {
      console.log('Delete error:', e);
      return false;
    }
  }, []);

  const reload = useCallback(async () => {
    setVideos([]);
    setEndCursor(null);
    setHasNextPage(false);
    await fetchVideos();
  }, []);

  return {
    videos,
    loading,
    permissionGranted: permissionStatus === 'granted',
    permissionStatus,
    hasNextPage,
    loadMore,
    deleteVideo,
    reload,
  };
}
