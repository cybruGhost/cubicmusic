import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Music2, ChevronRight, Sparkles, User, Search, X, Loader2, Check, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { setUsername, addPreferredArtist, setOnboardingComplete } from '@/lib/storage';
import { cn } from '@/lib/utils';
import { useDebounce } from '@/hooks/use-debounce';

interface Artist {
  name: string;
  genre?: string;
  id?: string;
  thumbnail?: string;
}

const SUGGESTED_ARTISTS: Artist[] = [
  { name: "Taylor Swift", genre: "Pop" },
  { name: "Drake", genre: "Hip-Hop" },
  { name: "The Weeknd", genre: "R&B" },
  { name: "Billie Eilish", genre: "Pop" },
  { name: "Bad Bunny", genre: "Latin" },
  { name: "Ed Sheeran", genre: "Pop" },
  { name: "Dua Lipa", genre: "Pop" },
  { name: "Kendrick Lamar", genre: "Hip-Hop" },
  { name: "Ariana Grande", genre: "Pop" },
  { name: "Post Malone", genre: "Hip-Hop" },
  { name: "SZA", genre: "R&B" },
  { name: "Travis Scott", genre: "Hip-Hop" },
  { name: "Olivia Rodrigo", genre: "Pop" },
  { name: "Bruno Mars", genre: "Pop" },
  { name: "Rihanna", genre: "R&B" },
  { name: "Kanye West", genre: "Hip-Hop" },
  { name: "Beyoncé", genre: "R&B" },
  { name: "Justin Bieber", genre: "Pop" },
  { name: "Adele", genre: "Pop" },
  { name: "Harry Styles", genre: "Pop" },
  { name: "Doja Cat", genre: "Hip-Hop" },
  { name: "Lil Baby", genre: "Hip-Hop" },
  { name: "21 Savage", genre: "Hip-Hop" },
  { name: "Morgan Wallen", genre: "Country" },
  { name: "Coldplay", genre: "Rock" },
  { name: "Imagine Dragons", genre: "Rock" },
  { name: "BTS", genre: "K-Pop" },
  { name: "BLACKPINK", genre: "K-Pop" },
  { name: "Peso Pluma", genre: "Latin" },
  { name: "Burna Boy", genre: "Afrobeats" },
];

interface OnboardingFlowProps {
  onComplete: () => void;
}

export function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const [step, setStep] = useState<'name' | 'artists'>('name');
  const [name, setName] = useState('');
  const [selectedArtists, setSelectedArtists] = useState<Artist[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Artist[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  const debouncedSearch = useDebounce(searchQuery, 500);

  const searchArtists = useCallback(async (query: string) => {
    if (!query.trim() || query.length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);

    try {
      // First check local matches
      const localMatches = SUGGESTED_ARTISTS.filter(artist =>
        artist.name.toLowerCase().includes(query.toLowerCase())
      );

      if (localMatches.length > 0) {
        setSearchResults(localMatches);
        setIsSearching(false);
        return;
      }

      // Search from API
      const response = await fetch(
        `https://yt.omada.cafe/api/v1/search?q=${encodeURIComponent(query)}`
      );

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      console.log('API Response:', data);

      if (data && Array.isArray(data.content)) {
        const artists: Artist[] = [];
        const seen = new Set<string>();

        // Parse API response
        data.content.forEach((item: any) => {
          // Extract from channel type
          if (item.type === 'channel' && item.author) {
            if (!seen.has(item.author)) {
              seen.add(item.author);
              artists.push({
                name: item.author,
                genre: 'Artist',
                id: item.authorId,
                thumbnail: item.authorThumbnails?.[0]?.url
              });
            }
          }
          
          // Extract from video type
          if (item.type === 'video' && item.author) {
            if (!seen.has(item.author)) {
              seen.add(item.author);
              artists.push({
                name: item.author,
                genre: 'Artist',
                id: item.authorId,
                thumbnail: item.videoThumbnails?.[0]?.url
              });
            }
          }
        });

        // Also check for artists in title (for song searches)
        data.content.forEach((item: any) => {
          if (item.title && item.type === 'video') {
            // Try to extract artist from title (format: "Artist - Song Title")
            const titleMatch = item.title.match(/^([^\-]+)\s*-\s*/);
            if (titleMatch && titleMatch[1]) {
              const potentialArtist = titleMatch[1].trim();
              if (!seen.has(potentialArtist)) {
                seen.add(potentialArtist);
                artists.push({
                  name: potentialArtist,
                  genre: 'Artist',
                  id: item.authorId
                });
              }
            }
          }
        });

        // Limit results and remove duplicates
        const uniqueArtists = artists.filter((artist, index, self) =>
          index === self.findIndex(a => a.name === artist.name)
        ).slice(0, 15);

        setSearchResults(uniqueArtists);
      } else {
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Search error:', error);
      // Fallback to local search
      const fallbackResults = SUGGESTED_ARTISTS.filter(artist =>
        artist.name.toLowerCase().includes(query.toLowerCase())
      );
      setSearchResults(fallbackResults);
    } finally {
      setIsSearching(false);
    }
  }, []);

  useEffect(() => {
    if (debouncedSearch.trim()) {
      searchArtists(debouncedSearch);
    } else {
      setSearchResults([]);
      setIsSearching(false);
    }
  }, [debouncedSearch, searchArtists]);

  const handleNameSubmit = () => {
    if (name.trim()) {
      setUsername(name.trim());
    }
    setStep('artists');
  };

  const toggleArtist = (artist: Artist) => {
    setSelectedArtists(prev => {
      const isSelected = prev.some(a => a.name === artist.name);
      if (isSelected) {
        return prev.filter(a => a.name !== artist.name);
      } else {
        return [...prev, artist];
      }
    });
  };

  const handleComplete = () => {
    // Save selected artists
    selectedArtists.forEach(artist => {
      addPreferredArtist({
        id: artist.id,
        name: artist.name,
        genre: artist.genre,
        thumbnail: artist.thumbnail,
        selectedAt: Date.now()
      });
    });
    
    setOnboardingComplete();
    onComplete();
  };

  // Filter suggested artists that aren't already in selected or search results
  const displayedSuggestedArtists = SUGGESTED_ARTISTS.filter(artist => {
    const notSelected = !selectedArtists.some(a => a.name === artist.name);
    const notInSearch = !searchResults.some(r => r.name === artist.name);
    return notSelected && notInSearch;
  });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] bg-background flex items-center justify-center p-4"
    >
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-primary/20 via-transparent to-transparent rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-primary/10 via-transparent to-transparent rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <AnimatePresence mode="wait">
        {step === 'name' && (
          <motion.div
            key="name"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="relative z-10 w-full max-w-md text-center"
          >
            {/* Logo */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', delay: 0.2 }}
              className="w-20 h-20 mx-auto mb-8 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-2xl"
            >
              <Music2 className="w-10 h-10 text-primary-foreground" />
            </motion.div>

            <h1 className="text-3xl font-bold text-foreground mb-2">
              Welcome to <span className="text-gradient">C-Music</span>
            </h1>
            <p className="text-muted-foreground mb-8">
              Your personalized music experience
            </p>

            <div className="space-y-4">
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="What should I call you?"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="pl-12 py-6 text-lg bg-secondary/50 border-border/50 rounded-xl"
                  onKeyDown={(e) => e.key === 'Enter' && handleNameSubmit()}
                />
              </div>

              <Button
                onClick={handleNameSubmit}
                className="w-full py-6 text-lg gap-2"
              >
                Continue
                <ChevronRight className="w-5 h-5" />
              </Button>

              <button
                onClick={handleNameSubmit}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Skip for now
              </button>
            </div>
          </motion.div>
        )}

        {step === 'artists' && (
          <motion.div
            key="artists"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="relative z-10 w-full max-w-3xl bg-card/80 backdrop-blur-xl rounded-2xl border border-border/50 shadow-2xl overflow-hidden"
          >
            <div className="p-6">
              <div className="text-center mb-6">
                <Sparkles className="w-10 h-10 mx-auto mb-3 text-primary" />
                <h1 className="text-2xl font-bold text-foreground mb-2">
                  Tell us which artists you like
                </h1>
                <p className="text-muted-foreground mb-4">
                  Search for artists or select from suggestions
                </p>

                {/* Search Bar */}
                <div className="relative max-w-md mx-auto mb-4">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Search for artists..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 pr-8 py-4 bg-secondary/50 border-border/50 rounded-lg"
                    autoFocus
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2"
                    >
                      <X className="w-4 h-4 text-muted-foreground" />
                    </button>
                  )}
                  {isSearching && (
                    <Loader2 className="absolute right-10 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
                  )}
                </div>
              </div>

              {/* Selected Artists */}
              {selectedArtists.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-4 bg-primary/5 rounded-lg p-3 border border-primary/10"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium text-foreground flex items-center gap-1">
                      <Check className="w-3 h-3 text-primary" />
                      Selected Artists ({selectedArtists.length})
                    </h3>
                    <button
                      onClick={() => setSelectedArtists([])}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      Clear all
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {selectedArtists.map((artist) => (
                      <div
                        key={artist.name}
                        className="px-2 py-1 bg-primary/10 text-primary rounded-full flex items-center gap-1 text-xs"
                      >
                        <span className="font-medium">{artist.name}</span>
                        {artist.genre && artist.genre !== 'Artist' && (
                          <span className="text-[10px] bg-primary/20 px-1 py-0.5 rounded">
                            {artist.genre}
                          </span>
                        )}
                        <button
                          onClick={() => toggleArtist(artist)}
                          className="hover:bg-primary/20 rounded-full p-0.5 ml-0.5"
                        >
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Search Results */}
              {searchQuery && (
                <div className="mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="text-sm font-medium text-foreground">
                      {isSearching ? 'Searching...' : `Search Results (${searchResults.length})`}
                    </h3>
                    {!isSearching && searchResults.length === 0 && searchQuery.length >= 2 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          toggleArtist({ name: searchQuery, genre: 'Artist' });
                          setSearchQuery('');
                        }}
                        className="h-6 text-xs gap-1"
                      >
                        <Plus className="w-3 h-3" />
                        Add "{searchQuery}"
                      </Button>
                    )}
                  </div>
                  
                  {isSearching ? (
                    <div className="flex justify-center items-center py-4">
                      <Loader2 className="w-6 h-6 text-primary animate-spin" />
                    </div>
                  ) : searchResults.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {searchResults.map((artist) => {
                        const isSelected = selectedArtists.some(a => a.name === artist.name);
                        return (
                          <motion.button
                            key={`${artist.name}-${artist.id || 'search'}`}
                            onClick={() => toggleArtist(artist)}
                            whileTap={{ scale: 0.95 }}
                            className={cn(
                              "px-3 py-1.5 rounded-full border text-sm transition-all flex items-center gap-1.5",
                              isSelected
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-secondary/50 border-border/50 hover:border-primary/50"
                            )}
                          >
                            {isSelected ? (
                              <Check className="w-3 h-3" />
                            ) : (
                              <Plus className="w-3 h-3" />
                            )}
                            <span className="font-medium">{artist.name}</span>
                          </motion.button>
                        );
                      })}
                    </div>
                  ) : searchQuery.length >= 2 ? (
                    <div className="text-center py-3 text-muted-foreground text-sm">
                      No artists found for "{searchQuery}"
                    </div>
                  ) : null}
                </div>
              )}

              {/* Suggested Artists */}
              <div className="mb-4">
                <h3 className="text-sm font-medium text-foreground mb-2">
                  Popular Artists
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {displayedSuggestedArtists.map((artist) => {
                    const isSelected = selectedArtists.some(a => a.name === artist.name);
                    return (
                      <motion.button
                        key={artist.name}
                        onClick={() => toggleArtist(artist)}
                        whileTap={{ scale: 0.95 }}
                        className={cn(
                          "px-3 py-1.5 rounded-full border text-sm transition-all flex items-center gap-1.5",
                          isSelected
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-secondary/50 border-border/50 hover:border-primary/50"
                        )}
                      >
                        {artist.name}
                        <span className={cn(
                          "text-xs",
                          isSelected ? "text-primary-foreground/70" : "text-muted-foreground"
                        )}>
                          {artist.genre}
                        </span>
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-4 border-t border-border/50">
                <div className="text-sm text-muted-foreground">
                  {selectedArtists.length} selected
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    onClick={handleComplete}
                  >
                    Skip
                  </Button>
                  <Button
                    onClick={handleComplete}
                    className="gap-2"
                  >
                    <Sparkles className="w-4 h-4" />
                    Continue
                  </Button>
                </div>
              </div>
            </div>

            {/* Created by */}
            <div className="border-t border-border/50 p-4 text-center text-xs text-muted-foreground">
              Created by <span className="text-primary">cybrughost</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Created by */}
      <div className="absolute bottom-4 text-center text-xs text-muted-foreground">
        Created by <span className="text-primary">cybrughost</span>
      </div>
    </motion.div>
  );
}
