import { useState, useEffect } from 'react';
import { Home, Compass, Library, Music2, Plus, ListMusic } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getPlaylists } from '@/lib/playlists';
import { UserPlaylist } from '@/types/music';
import { CreatePlaylistDialog } from './playlists/CreatePlaylistDialog';
import { ScrollArea } from './ui/scroll-area';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onPlaylistSelect?: (playlist: UserPlaylist) => void;
}

const navItems = [
  { id: 'home', icon: Home, label: 'Home' },
  { id: 'explore', icon: Compass, label: 'Explore' },
  { id: 'library', icon: Library, label: 'Library' },
];

export function Sidebar({ activeTab, onTabChange, onPlaylistSelect }: SidebarProps) {
  const [playlists, setPlaylists] = useState<UserPlaylist[]>([]);

  const loadPlaylists = () => {
    setPlaylists(getPlaylists());
  };

  useEffect(() => {
    loadPlaylists();
  }, []);

  return (
    <aside className="w-64 h-full bg-sidebar border-r border-sidebar-border flex flex-col">
      {/* Logo */}
      <div className="p-6 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center glow">
          <Music2 className="w-5 h-5 text-primary-foreground" />
        </div>
        <span className="text-xl font-bold text-gradient">Cubic</span>
      </div>

      {/* Navigation */}
      <nav className="px-3">
        <ul className="space-y-1">
          {navItems.map((item) => (
            <li key={item.id}>
              <button
                onClick={() => onTabChange(item.id)}
                className={cn(
                  "nav-link w-full text-sm font-medium",
                  activeTab === item.id && "active"
                )}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {/* Playlists Section */}
      <div className="mt-6 flex-1 flex flex-col min-h-0">
        <div className="px-6 flex items-center justify-between mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Playlists
          </span>
          <CreatePlaylistDialog onPlaylistCreated={loadPlaylists}>
            <button className="p-1 hover:bg-accent rounded transition-colors">
              <Plus className="w-4 h-4 text-muted-foreground hover:text-foreground" />
            </button>
          </CreatePlaylistDialog>
        </div>
        
        <ScrollArea className="flex-1 px-3">
          {playlists.length === 0 ? (
            <div className="px-3 py-4 text-center">
              <ListMusic className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
              <p className="text-xs text-muted-foreground">
                No playlists yet
              </p>
            </div>
          ) : (
            <ul className="space-y-1 pb-4">
              {playlists.map((playlist) => (
                <li key={playlist.id}>
                  <button
                    onClick={() => onPlaylistSelect?.(playlist)}
                    className="nav-link w-full text-sm"
                  >
                    <div className="w-8 h-8 rounded bg-secondary flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {playlist.thumbnail ? (
                        <img 
                          src={playlist.thumbnail} 
                          alt={playlist.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <ListMusic className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                    <span className="truncate">{playlist.name}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>
      </div>

      {/* Create Playlist Button */}
      <div className="p-4 mx-3 mb-4">
        <CreatePlaylistDialog onPlaylistCreated={loadPlaylists}>
          <button className="w-full py-2.5 px-4 bg-primary/10 border border-primary/30 rounded-xl text-primary text-sm font-medium hover:bg-primary/20 transition-all duration-200 flex items-center justify-center gap-2">
            <Plus className="w-4 h-4" />
            New Playlist
          </button>
        </CreatePlaylistDialog>
      </div>
    </aside>
  );
}
