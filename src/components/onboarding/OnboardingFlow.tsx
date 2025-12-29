import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Music2, 
  ChevronRight, 
  Sparkles, 
  User, 
  Search,
  X,
  Loader2,
  Check,
  Plus
} from 'lucide-react';
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
  const [searchResults, setSearchResults] = useState<Artist[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebounce(searchInput, 300); // Auto-search on type

  const searchArtists = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setShowSuggestions(true);
      return;
    }

    setIsSearching(true);
    setShowSuggestions(false);

    try {
      // First, check if we have local matches
      const localMatches = SUGGESTED_ARTISTS.filter(artist =>
        artist.name.toLowerCase().includes(query.toLowerCase())
      );

      if (localMatches.length > 0) {
        setSearchResults(localMatches);
        setIsSearching(false);
        return;
      }

      // Search from the YouTube Music API
      console.log('Searching for:', query);
      const response = await fetch(
        `https://yt.omada.cafe/api/v1/search?q=${encodeURIComponent(query)}`
      );

      if (response.ok) {
        const data = await response.json();
        console.log('API Response for:', query, data);
        
        const foundArtists: Artist[] = [];
        const seenArtists = new Set<string>();

        if (data && data.content) {
          data.content.forEach((item: any) => {
            // Extract artist from channel type
            if (item.type === 'channel' && item.author) {
              const artistName = item.author;
              if (!seenArtists.has(artistName)) {
                seenArtists.add(artistName);
                foundArtists.push({
                  name: artistName,
                  genre: 'Artist',
                  id: item.authorId,
                  thumbnail: item.authorThumbnails?.[0]?.url || item.authorThumbnail
                });
              }
            }
            
            // Extract artist from video type
            if (item.type === 'video' && item.author) {
              const artistName = item.author;
              if (!seenArtists.has(artistName)) {
                seenArtists.add(artistName);
                foundArtists.push({
                  name: artistName,
                  genre: 'Artist',
                  id: item.authorId,
                  thumbnail: item.thumbnails?.[0]?.url
                });
              }
            }

            // Extract from other fields that might contain artist names
            const potentialArtistFields = [
              item.title,
              item.artist,
              item.author,
              item.channelName
            ];

            potentialArtistFields.forEach(field => {
              if (field && typeof field === 'string') {
                // Check if the field contains common artist indicators
                const lowerField = field.toLowerCase();
                const lowerQuery = query.toLowerCase();
                
                if (lowerField.includes(lowerQuery) || 
                    lowerField.includes('artist') ||
                    lowerField.includes('music') ||
                    lowerField.includes('official')) {
                  
                  // Extract potential artist name (remove common suffixes)
                  let artistName = field;
                  artistName = artistName.replace(/\s*-\s*.*$/i, ''); // Remove " - song title"
                  artistName = artistName.replace(/\([^)]*\)/g, ''); // Remove parentheses
                  artistName = artistName.replace(/\s*\[[^\]]*\]/g, ''); // Remove brackets
                  artistName = artistName.replace(/\s*\|.*$/i, ''); // Remove " | something"
                  artistName = artistName.trim();
                  
                  if (artistName && !seenArtists.has(artistName)) {
                    seenArtists.add(artistName);
                    foundArtists.push({
                      name: artistName,
                      genre: 'Artist',
                      id: item.authorId || item.channelId
                    });
                  }
                }
              }
            });
          });
        }

        // If no artists found, try a more aggressive search
        if (foundArtists.length === 0 && query.length > 2) {
          // Search for songs by the query
          const songResponse = await fetch(
            `https://yt.omada.cafe/api/v1/search?q=${encodeURIComponent(query + ' song')}`
          );
          
          if (songResponse.ok) {
            const songData = await songResponse.json();
            if (songData && songData.content) {
              songData.content.forEach((item: any) => {
                if (item.author && !seenArtists.has(item.author)) {
                  seenArtists.add(item.author);
                  foundArtists.push({
                    name: item.author,
                    genre: 'Artist',
                    id: item.authorId
                  });
                }
              });
            }
          }
        }

        // Sort by relevance (exact match first, then partial match)
        foundArtists.sort((a, b) => {
          const aMatch = a.name.toLowerCase().includes(query.toLowerCase()) ? 0 : 1;
          const bMatch = b.name.toLowerCase().includes(query.toLowerCase()) ? 0 : 1;
          return aMatch - bMatch;
        });

        setSearchResults(foundArtists.slice(0, 20));
        
        // If still no results, show message
        if (foundArtists.length === 0) {
          setSearchResults([]);
        }
      } else {
        console.error('API Error:', response.status);
        // Fallback to local search
        const fallbackResults = SUGGESTED_ARTISTS.filter(artist =>
          artist.name.toLowerCase().includes(query.toLowerCase())
        );
        setSearchResults(fallbackResults);
      }
    } catch (error) {
      console.error('Error searching artists:', error);
      // Fallback to local search
      const fallbackResults = SUGGESTED_ARTISTS.filter(artist =>
        artist.name.toLowerCase().includes(query.toLowerCase())
      );
      setSearchResults(fallbackResults.length > 0 ? fallbackResults : []);
      setShowSuggestions(true);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Auto-search when typing
  useEffect(() => {
    if (debouncedSearch.trim()) {
      searchArtists(debouncedSearch);
    } else {
      setSearchResults([]);
      setShowSuggestions(true);
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
    // Save all selected artists
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

  const displayedArtists = searchInput.trim() 
    ? searchResults
    : showSuggestions 
      ? SUGGESTED_ARTISTS
      : [];

  const isArtistSelected = (artistName: string) => {
    return selectedArtists.some(a => a.name === artistName);
  };

  const handleClearSearch = () => {
    setSearchInput('');
    setSearchResults([]);
    setShowSuggestions(true);
  };

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
            <div className="p-8">
              <div className="text-center mb-8">
                <Sparkles className="w-12 h-12 mx-auto mb-4 text-primary" />
                <h1 className="text-2xl font-bold text-foreground mb-2">
                  Tell us which artists you like
                </h1>
                <p className="text-muted-foreground mb-6">
                  Start typing to search for artists or select from suggestions
                </p>

                {/* Search Bar - Auto-searches as you type */}
                <div className="max-w-md mx-auto mb-6">
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="Type to search artists (e.g., Lauren, NF, Drake)..."
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      className="pl-12 pr-10 py-6 text-base bg-secondary/50 border-border/50 rounded-xl"
                      autoFocus
                    />
                    {searchInput && (
                      <button
                        onClick={handleClearSearch}
                        className="absolute right-4 top-1/2 -translate-y-1/2 hover:bg-muted rounded-full p-1"
                      >
                        <X className="w-5 h-5 text-muted-foreground hover:text-foreground" />
                      </button>
                    )}
                  </div>
                  {isSearching && (
                    <div className="mt-2 text-sm text-muted-foreground flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Searching...
                    </div>
                  )}
                </div>
              </div>

              {/* Selected Artists List - Always visible when there are selections */}
              {selectedArtists.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-6 bg-primary/5 rounded-xl p-4 border border-primary/10"
                >
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
                      <Check className="w-4 h-4 text-primary" />
                      Selected Artists ({selectedArtists.length})
                    </h3>
                    <button
                      onClick={() => setSelectedArtists([])}
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Clear all
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selectedArtists.map((artist) => (
                      <div
                        key={artist.name}
                        className="px-3 py-2 bg-primary/10 text-primary rounded-full flex items-center gap-2 text-sm hover:bg-primary/20 transition-colors"
                      >
                        <span className="font-medium">{artist.name}</span>
                        {artist.genre && artist.genre !== 'Artist' && (
                          <span className="text-xs bg-primary/20 px-2 py-0.5 rounded-full">
                            {artist.genre}
                          </span>
                        )}
                        <button
                          onClick={() => toggleArtist(artist)}
                          className="hover:bg-primary/30 rounded-full p-0.5 ml-1"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Results/Artists Grid */}
              <div className="mb-6">
                {/* Section Title */}
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-semibold text-foreground">
                    {searchInput.trim() 
                      ? `Search Results for "${searchInput}"`
                      : 'Popular Artists'
                    }
                  </h2>
                  {displayedArtists.length > 0 && (
                    <span className="text-sm text-muted-foreground">
                      {displayedArtists.length} artists
                    </span>
                  )}
                </div>

                {/* Artists Grid */}
                <div className="flex flex-wrap justify-center gap-2 max-h-[40vh] overflow-y-auto p-2">
                  {isSearching ? (
                    <div className="flex justify-center items-center py-12 w-full">
                      <Loader2 className="w-8 h-8 text-primary animate-spin" />
                      <span className="ml-3 text-muted-foreground">Searching artists...</span>
                    </div>
                  ) : displayedArtists.length > 0 ? (
                    displayedArtists.map((artist) => {
                      const isSelected = isArtistSelected(artist.name);
                      return (
                        <motion.button
                          key={`${artist.name}-${artist.id || 'local'}`}
                          onClick={() => toggleArtist(artist)}
                          whileTap={{ scale: 0.95 }}
                          className={cn(
                            "px-4 py-3 rounded-xl border transition-all duration-200 flex items-center gap-3 w-full sm:w-auto min-w-[200px]",
                            isSelected
                              ? "bg-primary text-primary-foreground border-primary shadow-lg"
                              : "bg-secondary/50 border-border/50 hover:border-primary/50 hover:bg-secondary hover:shadow-md"
                          )}
                        >
                          <div className="flex items-center gap-3 w-full">
                            <div className={cn(
                              "w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center",
                              isSelected 
                                ? "bg-primary-foreground/20" 
                                : "bg-muted"
                            )}>
                              {isSelected ? (
                                <Check className="w-4 h-4" />
                              ) : (
                                <Plus className="w-4 h-4" />
                              )}
                            </div>
                            <div className="text-left flex-1 min-w-0">
                              <span className="font-medium block truncate">{artist.name}</span>
                              {artist.genre && (
                                <span className={cn(
                                  "text-xs",
                                  isSelected 
                                    ? "text-primary-foreground/70" 
                                    : "text-muted-foreground"
                                )}>
                                  {artist.genre}
                                </span>
                              )}
                            </div>
                          </div>
                        </motion.button>
                      );
                    })
                  ) : searchInput.trim() ? (
                    <div className="text-center py-8 text-muted-foreground w-full">
                      <Search className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p className="mb-2">No artists found for "{searchInput}"</p>
                      <div className="space-y-3">
                        <p className="text-sm">Try:</p>
                        <div className="flex flex-wrap justify-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              // Try to add as manual artist
                              const newArtist: Artist = {
                                name: searchInput,
                                genre: 'Artist'
                              };
                              toggleArtist(newArtist);
                              setSearchInput('');
                            }}
                            className="gap-1"
                          >
                            <Plus className="w-3 h-3" />
                            Add "{searchInput}" as artist
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSearchInput(searchInput + ' music');
                            }}
                          >
                            Search "{searchInput} music"
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground w-full">
                      <Sparkles className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>Start typing above to search for your favorite artists</p>
                      <p className="text-sm mt-1">Or select from popular suggestions below</p>
                    </div>
                  )}
                </div>

                {/* Popular Suggestions (only when not searching) */}
                {!searchInput.trim() && !isSearching && (
                  <div className="mt-8">
                    <h3 className="text-lg font-semibold text-foreground mb-4 text-center">
                      Popular Artists
                    </h3>
                    <div className="flex flex-wrap justify-center gap-2">
                      {SUGGESTED_ARTISTS.map((artist) => {
                        const isSelected = isArtistSelected(artist.name);
                        return (
                          <motion.button
                            key={artist.name}
                            onClick={() => toggleArtist(artist)}
                            whileTap={{ scale: 0.95 }}
                            className={cn(
                              "px-4 py-2 rounded-full border transition-all duration-200 flex items-center gap-2",
                              isSelected
                                ? "bg-primary text-primary-foreground border-primary shadow-lg"
                                : "bg-secondary/50 border-border/50 hover:border-primary/50 hover:bg-secondary hover:shadow-md"
                            )}
                          >
                            <span className="font-medium">{artist.name}</span>
                            {artist.genre && (
                              <span className={cn(
                                "text-xs px-2 py-0.5 rounded-full",
                                isSelected 
                                  ? "bg-primary-foreground/20" 
                                  : "bg-muted text-muted-foreground"
                              )}>
                                {artist.genre}
                              </span>
                            )}
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between border-t pt-6">
                <Button
                  variant="ghost"
                  onClick={() => setStep('name')}
                  className="gap-2"
                >
                  <ChevronRight className="w-4 h-4 rotate-180" />
                  Back to Name
                </Button>
                <div className="flex gap-3">
                  <Button
                    variant="ghost"
                    onClick={() => {
                      // Skip but save empty preferences
                      setOnboardingComplete();
                      onComplete();
                    }}
                  >
                    Skip for now
                  </Button>
                  <Button
                    onClick={handleComplete}
                    className="gap-2"
                    disabled={isSearching}
                  >
                    {isSearching ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Searching...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        {selectedArtists.length > 0 
                          ? `Continue with ${selectedArtists.length} artist${selectedArtists.length > 1 ? 's' : ''}`
                          : 'Continue without artists'
                        }
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>

            {/* Tips */}
            <div className="border-t bg-muted/20 p-4">
              <div className="text-center text-xs text-muted-foreground">
                <p className="mb-1">
                  <span className="text-primary">💡 Tip:</span> Just type to search - no need to click search button
                </p>
                <p>Results appear automatically as you type</p>
              </div>
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
