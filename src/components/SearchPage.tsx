import { useState, useEffect, useCallback, useMemo } from 'react';
import { ArrowLeft, Search, Music, User, Film, X, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Video, Channel, Playlist, SearchResult } from '@/types/music';
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

type CategoryType = 'all' | 'songs' | 'videos' | 'channels';

export function SearchPage({ onClose, onOpenChannel }: SearchPageProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [category, setCategory] = useState<CategoryType>('songs');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const { playTrack, addToQueue } = usePlayerContext();

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
        // Use search API for suggestions
        const res = await fetch(`${API_BASE}/search/suggestions?q=${encodeURIComponent(query)}`);
        if (res.ok) {
          const data = await res.json();
          setSuggestions(data.suggestions || []);
        }
      } catch {
        // Fallback: generate basic suggestions from query
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
        // Prioritize music-related videos (shorter, music keywords)
        return results.filter((r): r is Video => {
          if (r.type !== 'video') return false;
          const isMusicLike = r.lengthSeconds < 600; // Less than 10 min
          const hasMusicKeywords = /official|audio|lyric|music|song|album|track/i.test(r.title);
          return isMusicLike || hasMusicKeywords;
        });
      case 'videos':
        return results.filter((r): r is Video => r.type === 'video' && r.lengthSeconds >= 600);
      case 'channels':
        return results.filter((r): r is Channel => r.type === 'channel');
      default:
        return results;
    }
  }, [results, category]);

  const videos = filteredResults.filter((r): r is Video => r.type === 'video');
  const channels = filteredResults.filter((r): r is Channel => r.type === 'channel');

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-background flex flex-col"
    >
      {/* Header */}
      <header className="p-4 border-b border-border/30">
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
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => setShowSuggestions(true)}
                placeholder="Search songs, artists, albums..."
                className="w-full pl-11 pr-10 py-3 bg-secondary rounded-xl border-0 outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                autoFocus
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-accent rounded-full"
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
                  className="absolute top-full left-0 right-0 mt-2 bg-popover rounded-xl shadow-xl border overflow-hidden z-10"
                >
                  {query ? (
                    // Search suggestions
                    <div className="py-2">
                      {suggestions.map((suggestion, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => handleSuggestionClick(suggestion)}
                          className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-accent transition-colors text-left"
                        >
                          <Search className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm">{suggestion}</span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    // Recent searches
                    <div className="py-2">
                      <div className="flex items-center justify-between px-4 py-2">
                        <span className="text-xs font-medium text-muted-foreground uppercase">Recent</span>
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
                          className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-accent transition-colors text-left"
                        >
                          <Clock className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm">{search}</span>
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
          <div className="flex gap-2 mt-4 overflow-x-auto pb-2">
            {[
              { id: 'songs', icon: Music, label: 'Songs' },
              { id: 'videos', icon: Film, label: 'Videos' },
              { id: 'channels', icon: User, label: 'Channels' },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setCategory(cat.id as CategoryType)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap",
                  category === cat.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground hover:text-foreground"
                )}
              >
                <cat.icon className="w-4 h-4" />
                {cat.label}
              </button>
            ))}
          </div>
        )}
      </header>

      {/* Results */}
      <div className="flex-1 overflow-y-auto p-4 pb-28" onClick={() => setShowSuggestions(false)}>
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : results.length === 0 && query ? (
          <div className="text-center py-12">
            <Search className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <p className="text-muted-foreground">No results found for "{query}"</p>
          </div>
        ) : results.length === 0 ? (
          <div className="text-center py-12">
            <Search className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <p className="text-muted-foreground">Search for your favorite music</p>
          </div>
        ) : (
          <>
            {/* Songs Grid */}
            {(category === 'songs' || category === 'all') && videos.length > 0 && (
              <section className="mb-8">
                {category === 'all' && <h2 className="text-lg font-semibold mb-4">Songs</h2>}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {videos.map((video) => (
                    <MusicCard key={video.videoId} video={video} />
                  ))}
                </div>
              </section>
            )}
            
            {/* Channels */}
            {(category === 'channels' || category === 'all') && channels.length > 0 && (
              <section className="mb-8">
                {category === 'all' && <h2 className="text-lg font-semibold mb-4">Artists</h2>}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {channels.map((channel) => (
                    <button
                      key={channel.authorId}
                      onClick={() => onOpenChannel?.(channel.author)}
                      className="p-4 rounded-xl bg-card hover:bg-accent transition-all text-center group"
                    >
                      <div className="w-20 h-20 mx-auto rounded-full overflow-hidden bg-secondary mb-3">
                        <img
                          src={channel.authorThumbnails?.[0]?.url || '/placeholder.svg'}
                          alt={channel.author}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                        />
                      </div>
                      <p className="font-medium truncate">{channel.author}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {channel.subCount ? `${(channel.subCount / 1000).toFixed(0)}K subscribers` : 'Channel'}
                      </p>
                    </button>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </motion.div>
  );
}
