import { useState, useEffect } from 'react';
import { Heart, Clock, BarChart3, Trash2, Play, Music2, HardDrive, FileDown, UserCheck, Disc3 } from 'lucide-react';
import { motion } from 'framer-motion';
import { UserPlaylist, Video } from '@/types/music';
import { PlaylistCard } from './playlists/PlaylistCard';
import { PlaylistView } from './playlists/PlaylistView';
import { CreatePlaylistDialog } from './playlists/CreatePlaylistDialog';
import { MusicCard } from './MusicCard';
import { getFavorites, getHistory, getStats, clearHistory, getDownloads } from '@/lib/storage';
import { getPlaylists } from '@/lib/playlists';
import { getCachedTracks, removeCachedAudio, getCacheSize } from '@/lib/audioCache';
import { getFollowedArtists, unfollowArtist, getSavedAlbums, removeAlbum, FollowedArtist, SavedAlbum } from '@/lib/followedArtists';
import { searchVideos } from '@/lib/api';
import { usePlayerContext } from '@/context/PlayerContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';

interface LibraryViewProps {
  onOpenChannel?: (artistName: string) => void;
}

const API_BASE = 'https://yt.omada.cafe/api/v1';

export function LibraryView({ onOpenChannel }: LibraryViewProps) {
  const [activeTab, setActiveTab] = useState('playlists');
  const [playlists, setPlaylists] = useState<UserPlaylist[]>([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState<UserPlaylist | null>(null);
  const [cachedTracks, setCachedTracks] = useState<Video[]>([]);
  const [cacheSize, setCacheSize] = useState(0);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [followedArtists, setFollowedArtists] = useState<FollowedArtist[]>([]);
  const [savedAlbums, setSavedAlbums] = useState<SavedAlbum[]>([]);
  const { playAll, playTrack } = usePlayerContext();

  const favorites = getFavorites();
  const history = getHistory();
  const stats = getStats();

  useEffect(() => {
    setPlaylists(getPlaylists());
    loadCachedTracks();
    setFollowedArtists(getFollowedArtists());
    setSavedAlbums(getSavedAlbums());
  }, [activeTab]);

  const loadCachedTracks = async () => {
    const tracks = await getCachedTracks();
    setCachedTracks(tracks);
    const size = await getCacheSize();
    setCacheSize(size);
  };

  const handleClearHistory = () => {
    clearHistory();
    toast.success('History cleared');
  };

  const handlePlayFavorites = () => {
    if (favorites.length > 0) playAll(favorites);
  };

  const refreshPlaylists = () => setPlaylists(getPlaylists());

  const handleSelectPlaylist = (playlist: UserPlaylist) => setSelectedPlaylist(playlist);

  const handleRemoveCached = async (videoId: string) => {
    await removeCachedAudio(videoId);
    loadCachedTracks();
    toast.success('Removed from cache');
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const handleDownloadMP3 = async (track: Video) => {
    if (downloadingId) return;
    setDownloadingId(track.videoId);
    toast.info(`Preparing ${track.title}...`);
    try {
      const response = await fetch(`${API_BASE}/videos/${track.videoId}`);
      const data = await response.json();
      const audioFormat = data.adaptiveFormats?.find((f: any) =>
        f.type?.startsWith('audio/') && (f.encoding === 'opus' || f.encoding === 'aac' || f.type?.includes('mp4'))
      ) || data.adaptiveFormats?.find((f: any) => f.type?.startsWith('audio/'));
      if (!audioFormat?.url) throw new Error('No audio format found');
      const link = document.createElement('a');
      link.href = audioFormat.url;
      link.download = `${track.title.replace(/[^\w\s-]/gi, '')}.mp3`;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Download started!');
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Download failed');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleUnfollow = (name: string) => {
    unfollowArtist(name);
    setFollowedArtists(getFollowedArtists());
    toast.success(`Unfollowed ${name}`);
  };

  const handleRemoveAlbum = (id: string) => {
    removeAlbum(id);
    setSavedAlbums(getSavedAlbums());
    toast.success('Album removed');
  };

  const handlePlayArtist = async (artistName: string) => {
    toast.info(`Loading ${artistName}'s music...`);
    try {
      const results = await searchVideos(artistName);
      const filtered = results.filter(v => v.author?.toLowerCase().includes(artistName.toLowerCase()));
      if (filtered.length > 0) {
        playAll(filtered);
      } else if (results.length > 0) {
        playAll(results.slice(0, 10));
      }
    } catch {
      toast.error('Failed to load artist tracks');
    }
  };

  if (selectedPlaylist) {
    return (
      <PlaylistView
        playlist={selectedPlaylist}
        onBack={() => setSelectedPlaylist(null)}
        onUpdate={() => {
          refreshPlaylists();
          const updated = getPlaylists().find(p => p.id === selectedPlaylist.id);
          if (updated) setSelectedPlaylist(updated);
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Your Library</h1>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-secondary/50 flex-wrap">
          <TabsTrigger value="playlists" className="gap-2">
            <Music2 className="w-4 h-4" />
            Playlists
          </TabsTrigger>
          <TabsTrigger value="artists" className="gap-2">
            <UserCheck className="w-4 h-4" />
            Artists ({followedArtists.length})
          </TabsTrigger>
          <TabsTrigger value="albums" className="gap-2">
            <Disc3 className="w-4 h-4" />
            Albums ({savedAlbums.length})
          </TabsTrigger>
          <TabsTrigger value="favorites" className="gap-2">
            <Heart className="w-4 h-4" />
            Favorites ({favorites.length})
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <Clock className="w-4 h-4" />
            History
          </TabsTrigger>
          <TabsTrigger value="cached" className="gap-2">
            <HardDrive className="w-4 h-4" />
            Cached ({cachedTracks.length})
          </TabsTrigger>
          <TabsTrigger value="stats" className="gap-2">
            <BarChart3 className="w-4 h-4" />
            Stats
          </TabsTrigger>
        </TabsList>

        {/* Playlists Tab */}
        <TabsContent value="playlists" className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-muted-foreground">{playlists.length} playlists</p>
            <CreatePlaylistDialog onPlaylistCreated={refreshPlaylists}>
              <Button size="sm" className="gap-2">
                <Music2 className="w-4 h-4" />
                New Playlist
              </Button>
            </CreatePlaylistDialog>
          </div>
          {playlists.length === 0 ? (
            <div className="text-center py-16">
              <Music2 className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
              <p className="text-muted-foreground mb-4">No playlists yet</p>
              <CreatePlaylistDialog onPlaylistCreated={refreshPlaylists}>
                <Button>Create Your First Playlist</Button>
              </CreatePlaylistDialog>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {playlists.map((playlist, index) => (
                <PlaylistCard
                  key={playlist.id}
                  playlist={playlist}
                  index={index}
                  onDelete={refreshPlaylists}
                  onSelect={() => handleSelectPlaylist(playlist)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Artists Tab */}
        <TabsContent value="artists" className="mt-6">
          {followedArtists.length === 0 ? (
            <div className="text-center py-16">
              <UserCheck className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
              <p className="text-muted-foreground">No followed artists yet</p>
              <p className="text-sm text-muted-foreground mt-2">Search for an artist and tap Follow</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {followedArtists.map((artist) => (
                <motion.div
                  key={artist.name}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="group relative flex flex-col items-center p-4 rounded-2xl bg-card border border-border/30 hover:bg-accent transition-colors cursor-pointer"
                  onClick={() => onOpenChannel?.(artist.name)}
                >
                  <div className="w-24 h-24 rounded-full overflow-hidden mb-3 bg-secondary">
                    {artist.thumbnail ? (
                      <img src={artist.thumbnail} alt={artist.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-muted-foreground">
                        {artist.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <h3 className="font-medium text-sm text-center text-foreground truncate w-full">{artist.name}</h3>
                  <p className="text-xs text-muted-foreground mt-1">Artist</p>
                  
                  <div className="flex items-center gap-1 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      onClick={(e) => { e.stopPropagation(); handlePlayArtist(artist.name); }}
                      title="Play"
                    >
                      <Play className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={(e) => { e.stopPropagation(); handleUnfollow(artist.name); }}
                      title="Unfollow"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Albums Tab */}
        <TabsContent value="albums" className="mt-6">
          {savedAlbums.length === 0 ? (
            <div className="text-center py-16">
              <Disc3 className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
              <p className="text-muted-foreground">No saved albums yet</p>
              <p className="text-sm text-muted-foreground mt-2">Save albums from search results or artist pages</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {savedAlbums.map((album) => (
                <motion.div
                  key={album.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="group relative rounded-xl overflow-hidden bg-card border border-border/30 hover:bg-accent transition-colors"
                >
                  <div className="aspect-square overflow-hidden">
                    <img
                      src={album.thumbnail}
                      alt={album.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <div className="p-3">
                    <h3 className="font-medium text-sm truncate text-foreground">{album.title}</h3>
                    <p className="text-xs text-muted-foreground truncate">{album.artist}</p>
                    <p className="text-xs text-muted-foreground mt-1">{album.videoIds.length} tracks</p>
                  </div>
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      size="icon"
                      variant="secondary"
                      className="h-8 w-8"
                      onClick={() => handleRemoveAlbum(album.id)}
                      title="Remove"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Favorites Tab */}
        <TabsContent value="favorites" className="mt-6">
          {favorites.length > 0 && (
            <div className="flex items-center justify-between mb-4">
              <p className="text-muted-foreground">{favorites.length} favorites</p>
              <Button size="sm" onClick={handlePlayFavorites} className="gap-2">
                <Play className="w-4 h-4" />
                Play All
              </Button>
            </div>
          )}
          {favorites.length === 0 ? (
            <div className="text-center py-16">
              <Heart className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
              <p className="text-muted-foreground">No favorites yet</p>
              <p className="text-sm text-muted-foreground mt-2">Heart songs to add them here</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {favorites.map((video) => (
                <MusicCard key={video.videoId} video={video} onOpenChannel={onOpenChannel} />
              ))}
            </div>
          )}
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="mt-6">
          {history.length > 0 && (
            <div className="flex items-center justify-between mb-4">
              <p className="text-muted-foreground">{history.length} recently played</p>
              <Button size="sm" variant="ghost" onClick={handleClearHistory} className="gap-2 text-destructive">
                <Trash2 className="w-4 h-4" />
                Clear History
              </Button>
            </div>
          )}
          {history.length === 0 ? (
            <div className="text-center py-16">
              <Clock className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
              <p className="text-muted-foreground">No listening history yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {history.map((video) => (
                <MusicCard key={video.videoId} video={video} variant="compact" onOpenChannel={onOpenChannel} />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Cached Tab */}
        <TabsContent value="cached" className="mt-6">
          {cachedTracks.length > 0 && (
            <div className="flex items-center justify-between mb-4">
              <p className="text-muted-foreground">
                {cachedTracks.length} songs • {formatBytes(cacheSize)} used
              </p>
              <Button size="sm" onClick={() => playAll(cachedTracks)} className="gap-2">
                <Play className="w-4 h-4" />
                Play All Offline
              </Button>
            </div>
          )}
          {cachedTracks.length === 0 ? (
            <div className="text-center py-16">
              <HardDrive className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
              <p className="text-muted-foreground">No cached songs yet</p>
              <p className="text-sm text-muted-foreground mt-2">Use "Save Offline" on any song to cache it</p>
            </div>
          ) : (
            <div className="space-y-2">
              {cachedTracks.map((track) => (
                <motion.div
                  key={track.videoId}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border/30 hover:bg-accent transition-colors group"
                >
                  <div
                    className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 cursor-pointer"
                    onClick={() => playTrack(track)}
                  >
                    <img
                      src={track.videoThumbnails?.[0]?.url || `https://i.ytimg.com/vi/${track.videoId}/mqdefault.jpg`}
                      alt={track.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Play className="w-5 h-5 text-white fill-current" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0 cursor-pointer" onClick={() => playTrack(track)}>
                    <h3 className="font-medium text-sm truncate text-foreground">{track.title}</h3>
                    <p className="text-xs text-muted-foreground truncate">{track.author}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      onClick={() => handleDownloadMP3(track)}
                      disabled={downloadingId === track.videoId}
                      title="Download as MP3"
                    >
                      <FileDown className={`w-4 h-4 ${downloadingId === track.videoId ? 'animate-pulse' : ''}`} />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => handleRemoveCached(track.videoId)}
                      title="Remove from cache"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Stats Tab */}
        <TabsContent value="stats" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-xl p-6 text-center">
              <BarChart3 className="w-10 h-10 mx-auto mb-3 text-primary" />
              <p className="text-3xl font-bold text-foreground">{stats.totalPlays}</p>
              <p className="text-sm text-muted-foreground">Total Plays</p>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass rounded-xl p-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Music2 className="w-4 h-4 text-primary" />
                Top Tracks
              </h3>
              <ScrollArea className="h-48">
                {stats.topTracks.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No data yet</p>
                ) : (
                  <div className="space-y-2">
                    {stats.topTracks.slice(0, 5).map((track, i) => (
                      <div key={track.videoId} className="flex items-center gap-3">
                        <span className="text-lg font-bold text-primary w-6">{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{track.title}</p>
                          <p className="text-xs text-muted-foreground truncate">{track.author}</p>
                        </div>
                        <span className="text-xs text-muted-foreground">{track.plays} plays</span>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass rounded-xl p-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Heart className="w-4 h-4 text-primary" />
                Top Artists
              </h3>
              <ScrollArea className="h-48">
                {stats.topArtists.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No data yet</p>
                ) : (
                  <div className="space-y-2">
                    {stats.topArtists.slice(0, 5).map((artist, i) => (
                      <div key={artist.name} className="flex items-center gap-3">
                        <span className="text-lg font-bold text-primary w-6">{i + 1}</span>
                        <p className="flex-1 text-sm font-medium truncate">{artist.name}</p>
                        <span className="text-xs text-muted-foreground">{artist.plays} plays</span>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </motion.div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
