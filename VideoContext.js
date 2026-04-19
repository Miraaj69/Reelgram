import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const VideoContext = createContext();

export function VideoProvider({ children }) {
  const [favorites, setFavorites] = useState([]);
  const [watchHistory, setWatchHistory] = useState([]);

  // Load favorites from storage on startup
  useEffect(() => {
    loadFavorites();
  }, []);

  const loadFavorites = async () => {
    try {
      const stored = await AsyncStorage.getItem('@reelgram_favorites');
      if (stored) {
        setFavorites(JSON.parse(stored));
      }
    } catch (e) {
      console.log('Error loading favorites:', e);
    }
  };

  const saveFavorites = async (list) => {
    try {
      await AsyncStorage.setItem('@reelgram_favorites', JSON.stringify(list));
    } catch (e) {
      console.log('Error saving favorites:', e);
    }
  };

  const toggleFavorite = (video) => {
    setFavorites((prev) => {
      const alreadyLiked = prev.some((v) => v.id === video.id);
      let updated;
      if (alreadyLiked) {
        updated = prev.filter((v) => v.id !== video.id);
      } else {
        updated = [video, ...prev];
      }
      saveFavorites(updated);
      return updated;
    });
  };

  const isFavorite = (id) => favorites.some((v) => v.id === id);

  const addToHistory = (videoId) => {
    setWatchHistory((prev) => {
      const filtered = prev.filter((id) => id !== videoId);
      return [videoId, ...filtered].slice(0, 50); // keep last 50
    });
  };

  return (
    <VideoContext.Provider
      value={{
        favorites,
        toggleFavorite,
        isFavorite,
        watchHistory,
        addToHistory,
      }}
    >
      {children}
    </VideoContext.Provider>
  );
}

export const useVideoContext = () => {
  const ctx = useContext(VideoContext);
  if (!ctx) throw new Error('useVideoContext must be inside VideoProvider');
  return ctx;
};
