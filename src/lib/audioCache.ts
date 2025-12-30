import { Video } from '@/types/music';

const DB_NAME = 'c-music-cache';
const DB_VERSION = 1;
const STORE_NAME = 'audio-cache';
const META_STORE = 'audio-meta';

interface CachedAudio {
  videoId: string;
  audioBlob: Blob;
  cachedAt: number;
}

interface CachedMeta {
  videoId: string;
  title: string;
  author: string;
  thumbnail: string;
  duration: number;
  cachedAt: number;
}

let db: IDBDatabase | null = null;

async function openDB(): Promise<IDBDatabase> {
  if (db) return db;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);

    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;
      
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: 'videoId' });
      }
      
      if (!database.objectStoreNames.contains(META_STORE)) {
        database.createObjectStore(META_STORE, { keyPath: 'videoId' });
      }
    };
  });
}

export async function cacheAudio(video: Video, audioUrl: string): Promise<boolean> {
  try {
    const database = await openDB();
    
    // Fetch audio as blob
    const response = await fetch(audioUrl);
    if (!response.ok) throw new Error('Failed to fetch audio');
    
    const audioBlob = await response.blob();
    
    // Store audio blob
    const transaction = database.transaction([STORE_NAME, META_STORE], 'readwrite');
    
    const audioStore = transaction.objectStore(STORE_NAME);
    const metaStore = transaction.objectStore(META_STORE);
    
    const audioData: CachedAudio = {
      videoId: video.videoId,
      audioBlob,
      cachedAt: Date.now(),
    };
    
    const metaData: CachedMeta = {
      videoId: video.videoId,
      title: video.title,
      author: video.author,
      thumbnail: video.videoThumbnails?.[0]?.url || `https://i.ytimg.com/vi/${video.videoId}/mqdefault.jpg`,
      duration: video.lengthSeconds,
      cachedAt: Date.now(),
    };
    
    audioStore.put(audioData);
    metaStore.put(metaData);
    
    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve(true);
      transaction.onerror = () => reject(transaction.error);
    });
  } catch (error) {
    console.error('Failed to cache audio:', error);
    return false;
  }
}

export async function getCachedAudio(videoId: string): Promise<string | null> {
  try {
    const database = await openDB();
    
    return new Promise((resolve, reject) => {
      const transaction = database.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(videoId);
      
      request.onsuccess = () => {
        const data = request.result as CachedAudio | undefined;
        if (data?.audioBlob) {
          resolve(URL.createObjectURL(data.audioBlob));
        } else {
          resolve(null);
        }
      };
      
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Failed to get cached audio:', error);
    return null;
  }
}

export async function isCached(videoId: string): Promise<boolean> {
  try {
    const database = await openDB();
    
    return new Promise((resolve) => {
      const transaction = database.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.count(IDBKeyRange.only(videoId));
      
      request.onsuccess = () => resolve(request.result > 0);
      request.onerror = () => resolve(false);
    });
  } catch {
    return false;
  }
}

export async function getCachedTracks(): Promise<Video[]> {
  try {
    const database = await openDB();
    
    return new Promise((resolve, reject) => {
      const transaction = database.transaction([META_STORE], 'readonly');
      const store = transaction.objectStore(META_STORE);
      const request = store.getAll();
      
      request.onsuccess = () => {
        const metas = request.result as CachedMeta[];
        const videos: Video[] = metas.map(meta => ({
          type: 'video' as const,
          videoId: meta.videoId,
          title: meta.title,
          author: meta.author,
          authorId: '',
          authorUrl: '',
          videoThumbnails: [{ url: meta.thumbnail, width: 320, height: 180 }],
          description: '',
          viewCount: 0,
          published: 0,
          publishedText: '',
          lengthSeconds: meta.duration,
          liveNow: false,
          premium: false,
          isUpcoming: false,
        }));
        resolve(videos);
      };
      
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Failed to get cached tracks:', error);
    return [];
  }
}

export async function removeCachedAudio(videoId: string): Promise<boolean> {
  try {
    const database = await openDB();
    
    const transaction = database.transaction([STORE_NAME, META_STORE], 'readwrite');
    
    transaction.objectStore(STORE_NAME).delete(videoId);
    transaction.objectStore(META_STORE).delete(videoId);
    
    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve(true);
      transaction.onerror = () => reject(transaction.error);
    });
  } catch (error) {
    console.error('Failed to remove cached audio:', error);
    return false;
  }
}

export async function getCacheSize(): Promise<number> {
  try {
    const database = await openDB();
    
    return new Promise((resolve) => {
      const transaction = database.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();
      
      request.onsuccess = () => {
        const items = request.result as CachedAudio[];
        const totalSize = items.reduce((sum, item) => sum + (item.audioBlob?.size || 0), 0);
        resolve(totalSize);
      };
      
      request.onerror = () => resolve(0);
    });
  } catch {
    return 0;
  }
}

export async function clearCache(): Promise<boolean> {
  try {
    const database = await openDB();
    
    const transaction = database.transaction([STORE_NAME, META_STORE], 'readwrite');
    
    transaction.objectStore(STORE_NAME).clear();
    transaction.objectStore(META_STORE).clear();
    
    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve(true);
      transaction.onerror = () => reject(transaction.error);
    });
  } catch (error) {
    console.error('Failed to clear cache:', error);
    return false;
  }
}
