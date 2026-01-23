import { useState, useEffect, useCallback } from 'react';
import { Search } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import { Sidebar } from '@/components/Sidebar';
import { Player } from '@/components/Player';
import { MusicGrid } from '@/components/MusicGrid';
import { QuickPicks } from '@/components/QuickPicks';
import { MoodChips } from '@/components/MoodChips';
import { HomePageSections } from '@/components/HomePageSections';
import { FullscreenLyrics } from '@/components/lyrics/FullscreenLyrics';
import { LibraryView } from '@/components/LibraryView';
import { ExploreView } from '@/components/ExploreView';
import { SamplesView } from '@/components/SamplesView';
import { SettingsPage } from '@/components/SettingsPage';
import { OnboardingFlow } from '@/components/onboarding/OnboardingFlow';
import { SearchPage } from '@/components/SearchPage';
import { ChannelInfo } from '@/components/ChannelInfo';
import { useSearch } from '@/hooks/useSearch';
import { usePlayerContext } from '@/context/PlayerContext';
import { getPreferredArtists, hasCompletedOnboarding, getGreeting } from '@/lib/storage';
import { toast } from 'sonner';

// Extract dominant color from image
function extractColor(img: HTMLImageElement): string {
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return '174 72% 56%';
    
    canvas.width = 50;
    canvas.height = 50;
    ctx.drawImage(img, 0, 0, 50, 50);
    
    const data = ctx.getImageData(0, 0, 50, 50).data;
    let r = 0, g = 0, b = 0, count = 0;
    
    for (let i = 0; i < data.length; i += 16) {
      r += data[i];
      g += data[i + 1];
      b += data[i + 2];
      count++;
    }
    
    r = Math.round(r / count);
    g = Math.round(g / count);
    b = Math.round(b / count);
    
    // Convert to HSL
    const rNorm = r / 255;
    const gNorm = g / 255;
    const bNorm = b / 255;
    
    const max = Math.max(rNorm, gNorm, bNorm);
    const min = Math.min(rNorm, gNorm, bNorm);
    let h = 0, s = 0;
    const l = (max + min) / 2;
    
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      
      switch (max) {
        case rNorm: h = ((gNorm - bNorm) / d + (gNorm < bNorm ? 6 : 0)) / 6; break;
        case gNorm: h = ((bNorm - rNorm) / d + 2) / 6; break;
        case bNorm: h = ((rNorm - gNorm) / d + 4) / 6; break;
      }
    }
    
    return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
  } catch {
    return '174 72% 56%';
  }
}

export default function Index() {
  const [activeTab, setActiveTab] = useState('home');
  const [activeMood, setActiveMood] = useState<string>();
  const [initialized, setInitialized] = useState(false);
  const [showLyrics, setShowLyrics] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [channelArtist, setChannelArtist] = useState<string | null>(null);
  const { videos, loading, search } = useSearch();
  const { currentTrack } = usePlayerContext();

  // Dynamic theme based on current track
  useEffect(() => {
    if (!currentTrack) return;
    
    const thumbnail = `https://i.ytimg.com/vi/${currentTrack.videoId}/mqdefault.jpg`;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const color = extractColor(img);
      document.documentElement.style.setProperty('--dynamic-primary', color);
    };
    img.src = thumbnail;
  }, [currentTrack?.videoId]);

  // Check onboarding on mount
  useEffect(() => {
    if (!hasCompletedOnboarding()) {
      setShowOnboarding(true);
    }
  }, []);

  useEffect(() => {
    if (!initialized && !showOnboarding) {
      const preferredArtists = getPreferredArtists();
      if (preferredArtists.length > 0) {
        const shuffled = [...preferredArtists].sort(() => Math.random() - 0.5);
        const selected = shuffled.slice(0, 3);
        search(selected.join(' '));
      } else {
        const defaultArtists = ['Taylor Swift', 'Drake', 'The Weeknd', 'Ed Sheeran', 'Dua Lipa', 'Bad Bunny', 'BTS', 'Billie Eilish'];
        const shuffled = [...defaultArtists].sort(() => Math.random() - 0.5);
        search(shuffled.slice(0, 3).join(' '));
      }
      setInitialized(true);
    }
  }, [initialized, search, showOnboarding]);

  const handleMoodSelect = useCallback((moodQuery: string) => {
    setActiveMood(moodQuery);
    // The mood now passes the full search query directly
    search(moodQuery);
  }, [search]);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setShowSettings(false);
  };

  const handleSignInClick = () => {
    toast.info('Sign in coming soon!');
  };

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
    setInitialized(false);
  };

  const handleOpenChannel = (artistName: string) => {
    setChannelArtist(artistName);
  };

  // Show onboarding
  if (showOnboarding) {
    return <OnboardingFlow onComplete={handleOnboardingComplete} />;
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden dynamic-theme-bg">
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <Sidebar 
          activeTab={activeTab}
          onTabChange={handleTabChange}
          onSignInClick={handleSignInClick}
          onSettingsClick={() => setShowSettings(true)}
          autoClose
        />

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto scrollbar-thin">
          {/* Header with Search Icon */}
          <header className="sticky top-0 z-10 backdrop-blur-xl bg-background/60 border-b border-border/30">
            <div className="px-6 py-4 flex items-center justify-between">
              <p className="text-lg font-semibold text-foreground">
                {getGreeting()} 🎶
              </p>
              
              <button
                onClick={() => setShowSearch(true)}
                className="flex items-center gap-2 px-5 py-3 bg-secondary/80 hover:bg-secondary border border-border/50 rounded-2xl transition-all group"
              >
                <Search className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors hidden sm:inline">Search music...</span>
              </button>
            </div>
          </header>

          {/* Content */}
          <div className="p-6 pb-28 space-y-8">
            {showSettings ? (
              <SettingsPage onBack={() => setShowSettings(false)} />
            ) : activeTab === 'samples' ? (
              <SamplesView />
            ) : activeTab === 'library' ? (
              <LibraryView onOpenChannel={handleOpenChannel} />
            ) : activeTab === 'explore' ? (
              <ExploreView />
            ) : (
              /* Home View */
              <>
                {/* Mood Chips */}
                <section>
                  <MoodChips onMoodSelect={handleMoodSelect} activeMood={activeMood} />
                </section>

                {/* Quick Picks - pass mood filter */}
                {videos.length > 0 && (
                  <section className="glass-teal p-6">
                    <QuickPicks videos={videos} onOpenChannel={handleOpenChannel} />
                  </section>
                )}

                {/* Home Page Sections: Pass mood filter so ALL content matches mood */}
                <HomePageSections onOpenChannel={handleOpenChannel} moodFilter={activeMood} />

                {/* Main Grid - already filtered by search */}
                <section>
                  <MusicGrid
                    videos={videos.slice(8)}
                    loading={loading}
                    title={activeMood ? `${activeMood.split(' ')[0]} music` : "Recommended for you"}
                    onOpenChannel={handleOpenChannel}
                  />
                </section>
              </>
            )}
          </div>
        </main>
      </div>

      {/* Fullscreen Lyrics */}
      <FullscreenLyrics isOpen={showLyrics} onClose={() => setShowLyrics(false)} />

      {/* Search Page */}
      <AnimatePresence>
        {showSearch && (
          <SearchPage 
            onClose={() => setShowSearch(false)} 
            onOpenChannel={handleOpenChannel}
          />
        )}
      </AnimatePresence>

      {/* Channel Info Modal */}
      <AnimatePresence>
        {channelArtist && (
          <ChannelInfo 
            artistName={channelArtist} 
            onClose={() => setChannelArtist(null)} 
          />
        )}
      </AnimatePresence>

      {/* Player Bar */}
      <Player 
        onLyricsOpen={() => setShowLyrics(true)} 
        onOpenChannel={handleOpenChannel}
      />
    </div>
  );
}
