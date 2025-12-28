import { useState, useEffect, useCallback } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { SearchBar } from '@/components/SearchBar';
import { Player } from '@/components/Player';
import { MusicGrid } from '@/components/MusicGrid';
import { QuickPicks } from '@/components/QuickPicks';
import { MoodChips } from '@/components/MoodChips';
import { PlaylistView } from '@/components/playlists/PlaylistView';
import { PlaylistCard } from '@/components/playlists/PlaylistCard';
import { CreatePlaylistDialog } from '@/components/playlists/CreatePlaylistDialog';
import { useSearch } from '@/hooks/useSearch';
import { getPlaylists } from '@/lib/playlists';
import { UserPlaylist } from '@/types/music';
import { Plus } from 'lucide-react';

export default function Index() {
  const [activeTab, setActiveTab] = useState('home');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeMood, setActiveMood] = useState<string>();
  const [initialized, setInitialized] = useState(false);
  const [selectedPlaylist, setSelectedPlaylist] = useState<UserPlaylist | null>(null);
  const [playlists, setPlaylists] = useState<UserPlaylist[]>([]);
  const { videos, loading, search } = useSearch();

  const loadPlaylists = useCallback(() => {
    setPlaylists(getPlaylists());
  }, []);

  useEffect(() => {
    loadPlaylists();
  }, [loadPlaylists]);

  useEffect(() => {
    if (!initialized) {
      search('nf');
      setInitialized(true);
    }
  }, [initialized, search]);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    setSelectedPlaylist(null);
    if (query.trim()) {
      search(query);
      setActiveMood(undefined);
    } else {
      search('nf');
    }
  }, [search]);

  const handleMoodSelect = useCallback((mood: string) => {
    setActiveMood(mood);
    setSelectedPlaylist(null);
    search(`${mood} music playlist`);
  }, [search]);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setSelectedPlaylist(null);
    setSearchQuery('');
  };

  const handlePlaylistSelect = (playlist: UserPlaylist) => {
    setSelectedPlaylist(playlist);
    setActiveTab('library');
  };

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <Sidebar 
          activeTab={activeTab} 
          onTabChange={handleTabChange}
          onPlaylistSelect={handlePlaylistSelect}
        />

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto scrollbar-thin">
          {/* Header with Search */}
          <header className="sticky top-0 z-10 glass border-b border-border">
            <div className="px-6 py-4">
              <SearchBar onSearch={handleSearch} />
            </div>
          </header>

          {/* Content */}
          <div className="p-6 pb-28 space-y-8">
            {/* Playlist View */}
            {selectedPlaylist ? (
              <PlaylistView
                playlist={selectedPlaylist}
                onBack={() => setSelectedPlaylist(null)}
                onUpdate={loadPlaylists}
              />
            ) : activeTab === 'library' ? (
              /* Library View */
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h1 className="text-2xl font-bold text-foreground">Your Library</h1>
                  <CreatePlaylistDialog onPlaylistCreated={loadPlaylists}>
                    <button className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium">
                      <Plus className="w-4 h-4" />
                      New Playlist
                    </button>
                  </CreatePlaylistDialog>
                </div>
                
                {playlists.length === 0 ? (
                  <div className="text-center py-16">
                    <p className="text-muted-foreground mb-4">No playlists yet</p>
                    <CreatePlaylistDialog onPlaylistCreated={loadPlaylists}>
                      <button className="px-6 py-3 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors font-medium">
                        Create Your First Playlist
                      </button>
                    </CreatePlaylistDialog>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {playlists.map((playlist, index) => (
                      <PlaylistCard
                        key={playlist.id}
                        playlist={playlist}
                        index={index}
                        onSelect={setSelectedPlaylist}
                        onDelete={loadPlaylists}
                      />
                    ))}
                  </div>
                )}
              </div>
            ) : (
              /* Home/Explore View */
              <>
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
              </>
            )}
          </div>
        </main>
      </div>

      {/* Player Bar */}
      <Player />
    </div>
  );
}
