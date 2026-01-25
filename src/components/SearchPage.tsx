import { useState, useEffect, useCallback, useMemo } from 'react';
import { ArrowLeft, Search, Music, User, Film, X, Clock, Disc, ListMusic, PlayCircle, Shuffle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Video, Channel, SearchResult, Playlist } from '@/types/music';
import { MusicCard } from '@/components/MusicCard';
import { usePlayerContext } from '@/context/PlayerContext';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const API_BASE = 'https://yt.omada.cafe/api/v1';

interface SearchPageProps {
  onClose: () => void;
  onOpenChannel?: (artistName: string) => void;
}

// Store recent searches
const RECENT_SEARCHES_KEY = 'c-music-recent-searches';
const getRecentSearches = (): string[] => {
  try {
    return JSON.parse(localStorage.getItem(RECENT_SEARCHES_KEY) || '[]');
  } catch {
    return [];
  }
};

const addRecentSearch = (query: string) => {
  const recent = getRecentSearches().filter(s => s !== query);
  recent.unshift(query);
  localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(recent.slice(0, 10)));
};

const clearRecentSearches = () => {
  localStorage.removeItem(RECENT_SEARCHES_KEY);
};

type CategoryType = 'top' | 'songs' | 'videos' | 'artists' | 'playlists' | 'albums';

function formatPlays(count: number): string {
  if (count >= 1000000000) return `${(count / 1000000000).toFixed(1)}bn plays`;
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}m plays`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}k plays`;
  return `${count} plays`;
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function SearchPage({ onClose, onOpenChannel }: SearchPageProps) {
  const { playTrack, playAll } = usePlayerContext();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [category, setCategory] = useState<CategoryType>('top');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [artistInfo, setArtistInfo] = useState<Channel | null>(null);

  // Load recent searches on mount
  useEffect(() => {
    setRecentSearches(getRecentSearches());
  }, []);

  // Debounced suggestion fetch
  useEffect(() => {
    if (!query.trim()) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`${API_BASE}/search/suggestions?q=${encodeURIComponent(query)}`);
        if (res.ok) {
          const data = await res.json();
          setSuggestions(data.suggestions || []);
        }
      } catch {
        setSuggestions([
          `${query} songs`,
          `${query} music`,
          `${query} official`,
        ]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) return;
    
    setLoading(true);
    setShowSuggestions(false);
    addRecentSearch(searchQuery);
    setRecentSearches(getRecentSearches());
    
    try {
      const res = await fetch(`${API_BASE}/search?q=${encodeURIComponent(searchQuery)}`);
      if (!res.ok) throw new Error('Search failed');
      const data = await res.json();
      setResults(data);
      
      // Check if this is an artist search - look for a channel result
      const channelResult = data.find((r: SearchResult) => r.type === 'channel');
      if (channelResult) {
        setArtistInfo(channelResult as Channel);
      } else {
        setArtistInfo(null);
      }
    } catch (error) {
      toast.error('Search failed');
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    performSearch(query);
  };

  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion);
    performSearch(suggestion);
  };

  const handleClearRecent = () => {
    clearRecentSearches();
    setRecentSearches([]);
    toast.success('Recent searches cleared');
  };

  // Filter results by category
  const filteredResults = useMemo(() => {
    switch (category) {
      case 'songs':
        return results.filter((r): r is Video => {
          if (r.type !== 'video') return false;
          const isMusicLike = r.lengthSeconds < 600;
          const hasMusicKeywords = /official|audio|lyric|music|song|album|track/i.test(r.title);
          return isMusicLike || hasMusicKeywords;
        });
      case 'videos':
        return results.filter((r): r is Video => r.type === 'video' && r.lengthSeconds >= 600);
      case 'artists':
        return results.filter((r): r is Channel => r.type === 'channel');
      case 'playlists':
        return results.filter((r): r is Playlist => r.type === 'playlist');
      case 'albums':
        // Albums are typically playlists with fewer videos or specific keywords
        return results.filter((r): r is Playlist => 
          r.type === 'playlist' && /album|ep|deluxe|edition/i.test(r.title)
        );
      default:
        return results;
    }
  }, [results, category]);

  const songs = results.filter((r): r is Video => r.type === 'video' && r.lengthSeconds < 600);
  const videos = results.filter((r): r is Video => r.type === 'video');
  const channels = results.filter((r): r is Channel => r.type === 'channel');
  const playlists = results.filter((r): r is Playlist => r.type === 'playlist');

  const handlePlayAllSongs = () => {
    if (songs.length > 0) {
      playAll(songs);
    }
  };

  const handleShuffleSongs = () => {
    if (songs.length > 0) {
      const shuffled = [...songs].sort(() => Math.random() - 0.5);
      playAll(shuffled);
    }
  };

  const categories = [
    { id: 'top' as const, label: 'Top results' },
    { id: 'songs' as const, icon: Music, label: 'Songs' },
    { id: 'videos' as const, icon: Film, label: 'Videos' },
    { id: 'artists' as const, icon: User, label: 'Artists' },
    { id: 'playlists' as const, icon: ListMusic, label: 'Playlists' },
    { id: 'albums' as const, icon: Disc, label: 'Albums' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="fixed inset-0 z-40 flex flex-col bg-background"
    >
      {/* Header */}
      <header className="p-4 border-b border-border/30 bg-background/95 backdrop-blur-xl sticky top-0 z-10">
        <form onSubmit={handleSubmit} className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-accent rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          
          <div className="flex-1 relative">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => setShowSuggestions(true)}
                placeholder="Search songs, artists, albums..."
                className="w-full pl-12 pr-10 py-3.5 bg-secondary/80 rounded-2xl border border-border/50 outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all text-foreground placeholder:text-muted-foreground"
                autoFocus
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 hover:bg-accent rounded-full"
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              )}
            </div>
            
            {/* Suggestions Dropdown */}
            <AnimatePresence>
              {showSuggestions && (query ? suggestions.length > 0 : recentSearches.length > 0) && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute top-full left-0 right-0 mt-2 bg-card rounded-2xl shadow-2xl border border-border/50 overflow-hidden z-20"
                >
                  {query ? (
                    <div className="py-2">
                      {suggestions.map((suggestion, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => handleSuggestionClick(suggestion)}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-accent transition-colors text-left"
                        >
                          <Search className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm text-foreground">{suggestion}</span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="py-2">
                      <div className="flex items-center justify-between px-4 py-2">
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Recent</span>
                        <button
                          type="button"
                          onClick={handleClearRecent}
                          className="text-xs text-primary hover:underline"
                        >
                          Clear
                        </button>
                      </div>
                      {recentSearches.map((search, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => handleSuggestionClick(search)}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-accent transition-colors text-left"
                        >
                          <Clock className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm text-foreground">{search}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </form>
        
        {/* Category Tabs */}
        {results.length > 0 && (
          <div className="flex gap-2 mt-4 overflow-x-auto pb-2 scrollbar-thin">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setCategory(cat.id)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap border",
                  category === cat.id
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-secondary/50 text-muted-foreground hover:text-foreground border-transparent hover:border-border/50"
                )}
              >
                {cat.icon && <cat.icon className="w-4 h-4" />}
                {cat.label}
              </button>
            ))}
          </div>
        )}
      </header>

      {/* Results */}
      <div 
        className="flex-1 overflow-y-auto p-6 pb-28 scrollbar-thin" 
        onClick={() => setShowSuggestions(false)}
      >
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : results.length === 0 && query ? (
          <div className="text-center py-16">
            <Search className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-30" />
            <p className="text-lg text-muted-foreground">No results found for "{query}"</p>
            <p className="text-sm text-muted-foreground/70 mt-2">Try different keywords</p>
          </div>
        ) : results.length === 0 ? (
          <div className="text-center py-16">
            <Search className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-30" />
            <p className="text-lg text-muted-foreground">Search for your favorite music</p>
            <p className="text-sm text-muted-foreground/70 mt-2">Find songs, artists, albums, and more</p>
          </div>
        ) : category === 'top' ? (
          /* Top Results - Mixed view like YouTube Music */
          <div className="space-y-8">
            {/* Artist Card (if found) */}
            {artistInfo && (
              <section>
                <button
                  onClick={() => onOpenChannel?.(artistInfo.author)}
                  className="w-full max-w-md p-6 rounded-2xl bg-gradient-to-br from-primary/20 to-secondary border border-border/30 hover:border-primary/50 transition-all text-left group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-20 h-20 rounded-full overflow-hidden bg-secondary ring-2 ring-border/50 group-hover:ring-primary/50 transition-all">
                      <img
                        src={artistInfo.authorThumbnails?.[artistInfo.authorThumbnails.length - 1]?.url || '/placeholder.svg'}
                        alt={artistInfo.author}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1">
                      <p className="text-lg font-bold text-foreground">{artistInfo.author}</p>
                      <p className="text-sm text-muted-foreground">
                        Artist • {artistInfo.subCount ? `${(artistInfo.subCount / 1000000).toFixed(1)}m monthly audience` : 'Artist'}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleShuffleSongs();
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-secondary hover:bg-secondary/80 rounded-full text-sm font-medium transition-colors"
                    >
                      <Shuffle className="w-4 h-4" />
                      Shuffle
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePlayAllSongs();
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-full text-sm font-medium transition-colors"
                    >
                      <PlayCircle className="w-4 h-4" />
                      Mix
                    </button>
                  </div>
                </button>
              </section>
            )}

            {/* Top Songs */}
            {songs.length > 0 && (
              <section>
                <h2 className="text-lg font-bold text-foreground mb-4">Songs</h2>
                <div className="space-y-1">
                  {songs.slice(0, 6).map((song) => (
                    <button
                      key={song.videoId}
                      onClick={() => playTrack(song)}
                      className="w-full flex items-center gap-4 p-3 rounded-xl hover:bg-secondary/50 transition-colors text-left group"
                    >
                      <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-secondary flex-shrink-0">
                        <img
                          src={song.videoThumbnails?.[0]?.url || `https://i.ytimg.com/vi/${song.videoId}/mqdefault.jpg`}
                          alt={song.title}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <PlayCircle className="w-6 h-6 text-white" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground truncate">{song.title}</p>
                        <p className="text-sm text-muted-foreground truncate">
                          Song • {song.author} • {formatDuration(song.lengthSeconds)}
                        </p>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {formatPlays(song.viewCount)}
                      </span>
                    </button>
                  ))}
                </div>
              </section>
            )}

            {/* Albums (Playlists with album-like titles) */}
            {playlists.filter(p => /album|ep|deluxe/i.test(p.title)).length > 0 && (
              <section>
                <h2 className="text-lg font-bold text-foreground mb-4">Albums</h2>
                <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-thin">
                  {playlists
                    .filter(p => /album|ep|deluxe/i.test(p.title))
                    .slice(0, 6)
                    .map((album) => (
                      <div key={album.playlistId} className="flex-shrink-0 w-36 group">
                        <div className="relative aspect-square rounded-xl overflow-hidden bg-secondary">
                          <img
                            src={album.playlistThumbnail || '/placeholder.svg'}
                            alt={album.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                        </div>
                        <p className="font-medium text-foreground text-sm mt-2 truncate">{album.title}</p>
                        <p className="text-xs text-muted-foreground truncate">Album • {album.author}</p>
                      </div>
                    ))}
                </div>
              </section>
            )}

            {/* Playlists */}
            {playlists.filter(p => !/album|ep|deluxe/i.test(p.title)).length > 0 && (
              <section>
                <h2 className="text-lg font-bold text-foreground mb-4">Community playlists</h2>
                <div className="space-y-1">
                  {playlists
                    .filter(p => !/album|ep|deluxe/i.test(p.title))
                    .slice(0, 4)
                    .map((playlist) => (
                      <div
                        key={playlist.playlistId}
                        className="flex items-center gap-4 p-3 rounded-xl hover:bg-secondary/50 transition-colors"
                      >
                        <div className="w-12 h-12 rounded-lg overflow-hidden bg-secondary flex-shrink-0">
                          <img
                            src={playlist.playlistThumbnail || '/placeholder.svg'}
                            alt={playlist.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground truncate">{playlist.title}</p>
                          <p className="text-sm text-muted-foreground truncate">
                            Playlist • {playlist.author}
                          </p>
                        </div>
                      </div>
                    ))}
                </div>
              </section>
            )}

            {/* Videos */}
            {videos.filter(v => v.lengthSeconds >= 600).length > 0 && (
              <section>
                <h2 className="text-lg font-bold text-foreground mb-4">Videos</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {videos
                    .filter(v => v.lengthSeconds >= 600)
                    .slice(0, 4)
                    .map((video) => (
                      <MusicCard key={video.videoId} video={video} onOpenChannel={onOpenChannel} />
                    ))}
                </div>
              </section>
            )}
          </div>
        ) : (
          /* Filtered view */
          <>
            {/* Songs Grid */}
            {category === 'songs' && songs.length > 0 && (
              <div className="space-y-1">
                {songs.map((song) => (
                  <button
                    key={song.videoId}
                    onClick={() => playTrack(song)}
                    className="w-full flex items-center gap-4 p-3 rounded-xl hover:bg-secondary/50 transition-colors text-left group"
                  >
                    <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-secondary flex-shrink-0">
                      <img
                        src={song.videoThumbnails?.[0]?.url || `https://i.ytimg.com/vi/${song.videoId}/mqdefault.jpg`}
                        alt={song.title}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <PlayCircle className="w-6 h-6 text-white" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">{song.title}</p>
                      <p className="text-sm text-muted-foreground truncate">
                        {song.author} • {formatDuration(song.lengthSeconds)}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatPlays(song.viewCount)}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* Videos Grid */}
            {category === 'videos' && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {videos.map((video) => (
                  <MusicCard key={video.videoId} video={video} onOpenChannel={onOpenChannel} />
                ))}
              </div>
            )}
            
            {/* Artists */}
            {category === 'artists' && channels.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {channels.map((channel) => (
                  <button
                    key={channel.authorId}
                    onClick={() => onOpenChannel?.(channel.author)}
                    className="p-5 rounded-2xl bg-card border border-border/30 hover:bg-accent hover:border-primary/30 transition-all text-center group"
                  >
                    <div className="w-24 h-24 mx-auto rounded-full overflow-hidden bg-secondary mb-4 ring-2 ring-border/50 group-hover:ring-primary/50 transition-all">
                      <img
                        src={channel.authorThumbnails?.[channel.authorThumbnails.length - 1]?.url || '/placeholder.svg'}
                        alt={channel.author}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                      />
                    </div>
                    <p className="font-semibold text-foreground truncate">{channel.author}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {channel.subCount ? `${(channel.subCount / 1000000).toFixed(1)}m subscribers` : 'Artist'}
                    </p>
                  </button>
                ))}
              </div>
            )}

            {/* Playlists */}
            {category === 'playlists' && playlists.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {playlists.map((playlist) => (
                  <div key={playlist.playlistId} className="group">
                    <div className="relative aspect-square rounded-xl overflow-hidden bg-secondary">
                      <img
                        src={playlist.playlistThumbnail || '/placeholder.svg'}
                        alt={playlist.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                      <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors" />
                      <div className="absolute bottom-2 right-2 p-2 bg-primary rounded-full opacity-0 group-hover:opacity-100 transition-all shadow-lg">
                        <PlayCircle className="w-5 h-5 text-primary-foreground" />
                      </div>
                    </div>
                    <p className="font-medium text-foreground text-sm mt-2 truncate">{playlist.title}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {playlist.author} • {playlist.videoCount} videos
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* Albums */}
            {category === 'albums' && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {playlists
                  .filter(p => /album|ep|deluxe|edition/i.test(p.title))
                  .map((album) => (
                    <div key={album.playlistId} className="group">
                      <div className="relative aspect-square rounded-xl overflow-hidden bg-secondary">
                        <img
                          src={album.playlistThumbnail || '/placeholder.svg'}
                          alt={album.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                        <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors" />
                        <div className="absolute bottom-2 right-2 p-2 bg-primary rounded-full opacity-0 group-hover:opacity-100 transition-all shadow-lg">
                          <PlayCircle className="w-5 h-5 text-primary-foreground" />
                        </div>
                      </div>
                      <p className="font-medium text-foreground text-sm mt-2 truncate">{album.title}</p>
                      <p className="text-xs text-muted-foreground truncate">Album • {album.author}</p>
                    </div>
                  ))}
              </div>
            )}
          </>
        )}
      </div>
    </motion.div>
  );
}
