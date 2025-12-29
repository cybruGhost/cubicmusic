import { useState, useEffect } from 'react';
import { Heart, Clock, BarChart3, Trash2, Play, Music2, Download } from 'lucide-react';
import { motion } from 'framer-motion';
import { UserPlaylist, Video } from '@/types/music';
import { PlaylistCard } from './playlists/PlaylistCard';
import { CreatePlaylistDialog } from './playlists/CreatePlaylistDialog';
import { MusicCard } from './MusicCard';
import { getFavorites, getHistory, getStats, clearHistory, getDownloads } from '@/lib/storage';
import { getPlaylists } from '@/lib/playlists';
import { usePlayerContext } from '@/context/PlayerContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';

export function LibraryView() {
  const [activeTab, setActiveTab] = useState('playlists');
  const [playlists, setPlaylists] = useState<UserPlaylist[]>([]);
  const { playAll } = usePlayerContext();

  const favorites = getFavorites();
  const history = getHistory();
  const stats = getStats();
  const downloads = getDownloads();

  useEffect(() => {
    setPlaylists(getPlaylists());
  }, []);

  const handleClearHistory = () => {
    clearHistory();
    toast.success('History cleared');
  };

  const handlePlayFavorites = () => {
    if (favorites.length > 0) {
      playAll(favorites);
    }
  };

  const refreshPlaylists = () => {
    setPlaylists(getPlaylists());
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Your Library</h1>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-secondary/50">
          <TabsTrigger value="playlists" className="gap-2">
            <Music2 className="w-4 h-4" />
            Playlists
          </TabsTrigger>
          <TabsTrigger value="favorites" className="gap-2">
            <Heart className="w-4 h-4" />
            Favorites ({favorites.length})
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <Clock className="w-4 h-4" />
            History
          </TabsTrigger>
          <TabsTrigger value="downloads" className="gap-2">
            <Download className="w-4 h-4" />
            Downloads ({downloads.length})
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
                />
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
                <MusicCard key={video.videoId} video={video} />
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
                <MusicCard key={video.videoId} video={video} variant="compact" />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Downloads Tab */}
        <TabsContent value="downloads" className="mt-6">
          {downloads.length === 0 ? (
            <div className="text-center py-16">
              <Download className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
              <p className="text-muted-foreground">No downloads yet</p>
              <p className="text-sm text-muted-foreground mt-2">Download songs to listen offline</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {downloads.map((track) => (
                <motion.div
                  key={track.videoId}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="glass rounded-xl p-3 cursor-pointer hover:bg-accent transition-colors"
                >
                  <div className="aspect-square rounded-lg overflow-hidden mb-3">
                    <img 
                      src={track.thumbnail} 
                      alt={track.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <h3 className="font-medium text-sm truncate">{track.title}</h3>
                  <p className="text-xs text-muted-foreground truncate">{track.author}</p>
                </motion.div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Stats Tab */}
        <TabsContent value="stats" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Total Plays */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass rounded-xl p-6 text-center"
            >
              <BarChart3 className="w-10 h-10 mx-auto mb-3 text-primary" />
              <p className="text-3xl font-bold text-foreground">{stats.totalPlays}</p>
              <p className="text-sm text-muted-foreground">Total Plays</p>
            </motion.div>

            {/* Top Tracks */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="glass rounded-xl p-4"
            >
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

            {/* Top Artists */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="glass rounded-xl p-4"
            >
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
