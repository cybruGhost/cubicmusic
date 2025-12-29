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
  verified?: boolean;
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
      // Search from API - use the query directly without "artist" suffix
      const searchUrl = `https://yt.omada.cafe/api/v1/search?q=${encodeURIComponent(query)}`;
      
      const response = await fetch(searchUrl);

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();

      const artists: Artist[] = [];
      const seen = new Set<string>();

      // First add local matches
      const localMatches = SUGGESTED_ARTISTS.filter(artist =>
        artist.name.toLowerCase().includes(query.toLowerCase())
      );
      localMatches.forEach(artist => {
        if (!seen.has(artist.name)) {
          seen.add(artist.name);
          artists.push(artist);
        }
      });

      // Parse API response
      if (data && Array.isArray(data.content)) {
        data.content.forEach((item: any) => {
          // Check for channel type with author
          if (item.type === 'channel' && item.author && item.author.trim()) {
            const artistName = item.author.trim();
            if (!seen.has(artistName)) {
              seen.add(artistName);
              artists.push({
                name: artistName,
                genre: 'Artist',
                id: item.authorId,
                thumbnail: item.authorThumbnails?.[0]?.url,
                verified: item.authorVerified || false
              });
            }
          }
          
          // Check for video type with author
          if (item.type === 'video' && item.author && item.author.trim()) {
            const artistName = item.author.trim();
            if (!seen.has(artistName)) {
              seen.add(artistName);
              artists.push({
                name: artistName,
                genre: 'Artist',
                id: item.authorId,
                thumbnail: item.videoThumbnails?.[0]?.url,
                verified: item.authorVerified || false
              });
            }
          }
          
          // Extract artist from video titles for videos without proper author field
          if (item.type === 'video' && item.title) {
            const title = item.title;
            
            // Pattern 1: "NF - Song Title"
            const dashMatch = title.match(/^([^\-]+)\s*-\s*/);
            if (dashMatch && dashMatch[1]) {
              const potentialArtist = dashMatch[1].trim();
              if (potentialArtist && !seen.has(potentialArtist)) {
                seen.add(potentialArtist);
                artists.push({
                  name: potentialArtist,
                  genre: 'Artist',
                  id: item.authorId,
                  thumbnail: item.videoThumbnails?.[0]?.url,
                  verified: item.authorVerified || false
                });
              }
            }
            
            // Pattern 2: "NF: Song Title"
            const colonMatch = title.match(/^([^:]+)\s*:\s*/);
            if (colonMatch && colonMatch[1]) {
              const potentialArtist = colonMatch[1].trim();
              if (potentialArtist && !seen.has(potentialArtist)) {
                seen.add(potentialArtist);
                artists.push({
                  name: potentialArtist,
                  genre: 'Artist',
                  id: item.authorId,
                  thumbnail: item.videoThumbnails?.[0]?.url,
                  verified: item.authorVerified || false
                });
              }
            }
            
            // Pattern 3: Look for the search query in the title
            const queryLower = query.toLowerCase();
            const titleLower = title.toLowerCase();
            if (titleLower.includes(queryLower)) {
              // Try to extract the part before common separators
              const separators = [' - ', ': ', ' | ', '「', '"', "'", '('];
              for (const sep of separators) {
                const sepIndex = title.indexOf(sep);
                if (sepIndex > 0) {
                  const potentialArtist = title.substring(0, sepIndex).trim();
                  if (potentialArtist && !seen.has(potentialArtist)) {
                    seen.add(potentialArtist);
                    artists.push({
                      name: potentialArtist,
                      genre: 'Artist',
                      id: item.authorId,
                      thumbnail: item.videoThumbnails?.[0]?.url,
                      verified: item.authorVerified || false
                    });
                    break;
                  }
                }
              }
            }
          }
        });
      }

      // Filter out artists that don't match the search query at all
      const queryLower = query.toLowerCase();
      const filteredArtists = artists.filter(artist => 
        artist.name.toLowerCase().includes(queryLower) ||
        queryLower.includes(artist.name.toLowerCase()) ||
        artist.name.toLowerCase().split(' ').some(word => queryLower.includes(word)) ||
        queryLower.split(' ').some(word => artist.name.toLowerCase().includes(word))
      );

      // Sort by: exact match first, then verification, then alphabetical
      const sortedArtists = filteredArtists
        .sort((a, b) => {
          const aExact = a.name.toLowerCase() === queryLower ? 0 : 1;
          const bExact = b.name.toLowerCase() === queryLower ? 0 : 1;
          if (aExact !== bExact) return aExact - bExact;
          
          if (a.verified && !b.verified) return -1;
          if (!a.verified && b.verified) return 1;
          
          return a.name.localeCompare(b.name);
        })
        .slice(0, 20);

      setSearchResults(sortedArtists);
      
    } catch (error) {
      console.error('Search error:', error);
      // Fallback to local search only
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
                    placeholder="Search for artists (e.g., NF, Lana, Lauren)..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 pr-8 py-4 bg-secondary/50 border-border/50 rounded-lg"
                    autoFocus
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 hover:bg-muted rounded-full p-1"
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
                        {artist.verified && (
                          <span className="text-[10px] bg-blue-500/20 text-blue-500 px-1 py-0.5 rounded">
                            ✓
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
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-4"
                >
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
                      <span className="ml-2 text-sm text-muted-foreground">Searching artists...</span>
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
                            {artist.verified && (
                              <span className="text-xs text-blue-500">✓</span>
                            )}
                          </motion.button>
                        );
                      })}
                    </div>
                  ) : searchQuery.length >= 2 ? (
                    <div className="text-center py-3 text-muted-foreground text-sm">
                      <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p>No artists found for "{searchQuery}"</p>
                      <p className="text-xs mt-1">Try a different search term</p>
                    </div>
                  ) : null}
                </motion.div>
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
                <Button
                  variant="ghost"
                  onClick={() => setStep('name')}
                  size="sm"
                >
                  Back
                </Button>
                <div className="flex gap-2">
                  <div className="text-sm text-muted-foreground flex items-center">
                    {selectedArtists.length} selected
                  </div>
                  <Button
                    variant="ghost"
                    onClick={handleComplete}
                    size="sm"
                  >
                    Skip
                  </Button>
                  <Button
                    onClick={handleComplete}
                    className="gap-2"
                    size="sm"
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
