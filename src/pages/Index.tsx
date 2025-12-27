import { useState, useEffect, useCallback } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { SearchBar } from '@/components/SearchBar';
import { Player } from '@/components/Player';
import { MusicGrid } from '@/components/MusicGrid';
import { QuickPicks } from '@/components/QuickPicks';
import { MoodChips } from '@/components/MoodChips';
import { PlayerProvider } from '@/context/PlayerContext';
import { useSearch } from '@/hooks/useSearch';

function MusicApp() {
  const [activeTab, setActiveTab] = useState('home');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeMood, setActiveMood] = useState<string>();
  const [initialized, setInitialized] = useState(false);
  const { videos, loading, search } = useSearch();

  // Initial load with NF music as requested by user
  useEffect(() => {
    if (!initialized) {
      search('nf');
      setInitialized(true);
    }
  }, [initialized, search]);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    if (query.trim()) {
      search(query);
      setActiveMood(undefined);
    } else {
      search('nf');
    }
  }, [search]);

  const handleMoodSelect = useCallback((mood: string) => {
    setActiveMood(mood);
    search(`${mood} music playlist`);
  }, [search]);

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto scrollbar-thin">
          {/* Header with Search */}
          <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-xl border-b border-border">
            <div className="px-6 py-4">
              <SearchBar onSearch={handleSearch} />
            </div>
          </header>

          {/* Content */}
          <div className="p-6 pb-28 space-y-8">
            {!searchQuery && (
              <>
                {/* Mood Chips */}
                <section>
                  <MoodChips onMoodSelect={handleMoodSelect} activeMood={activeMood} />
                </section>

                {/* Quick Picks */}
                {videos.length > 0 && (
                  <section>
                    <QuickPicks videos={videos} />
                  </section>
                )}

                {/* Main Grid */}
                <section>
                  <MusicGrid 
                    videos={videos.slice(8)} 
                    loading={loading} 
                    title="Recommended for you"
                  />
                </section>
              </>
            )}

            {searchQuery && (
              <section>
                <MusicGrid 
                  videos={videos} 
                  loading={loading} 
                  title={`Results for "${searchQuery}"`}
                />
              </section>
            )}
          </div>
        </main>
      </div>

      {/* Player Bar */}
      <Player />
    </div>
  );
}

export default function Index() {
  return (
    <PlayerProvider>
      <MusicApp />
    </PlayerProvider>
  );
}
