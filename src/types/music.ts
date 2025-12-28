export interface VideoThumbnail {
  url: string;
  width: number;
  height: number;
}

export interface Video {
  type: 'video';
  title: string;
  videoId: string;
  author: string;
  authorId: string;
  authorUrl: string;
  videoThumbnails: VideoThumbnail[];
  description: string;
  viewCount: number;
  published: number;
  publishedText: string;
  lengthSeconds: number;
  liveNow: boolean;
  premium: boolean;
  isUpcoming: boolean;
}

export interface Channel {
  type: 'channel';
  author: string;
  authorId: string;
  authorUrl: string;
  authorVerified: boolean;
  authorThumbnails: VideoThumbnail[];
  subCount: number;
  videoCount: number;
  description: string;
}

export interface Playlist {
  type: 'playlist';
  title: string;
  playlistId: string;
  playlistThumbnail: string;
  author: string;
  authorId: string;
  videoCount: number;
}

export type SearchResult = Video | Channel | Playlist;

export interface PlayerState {
  currentTrack: Video | null;
  isPlaying: boolean;
  volume: number;
  currentTime: number;
  duration: number;
  queue: Video[];
}

export interface LyricsData {
  plainLyrics?: string;
  syncedLyrics?: string;
  source?: string;
}

export interface UserPlaylist {
  id: string;
  name: string;
  description?: string;
  thumbnail?: string;
  tracks: Video[];
  createdAt: number;
  updatedAt: number;
}

export interface ChannelResult {
  type: 'channel';
  author: string;
  authorId: string;
  authorUrl: string;
  authorVerified: boolean;
  authorThumbnails: VideoThumbnail[];
  subCount: number;
  videoCount: number;
  description: string;
}
