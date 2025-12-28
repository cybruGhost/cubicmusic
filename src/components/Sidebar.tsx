import { useState, useEffect } from 'react';
import { Home, Compass, Library, Music2, Plus, ListMusic, ChevronLeft, ChevronRight, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getPlaylists } from '@/lib/playlists';
import { UserPlaylist } from '@/types/music';
import { CreatePlaylistDialog } from './playlists/CreatePlaylistDialog';
import { ScrollArea } from './ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onPlaylistSelect?: (playlist: UserPlaylist) => void;
  onSignInClick?: () => void;
}

const navItems = [
  { id: 'home', icon: Home, label: 'Home' },
  { id: 'explore', icon: Compass, label: 'Explore' },
  { id: 'library', icon: Library, label: 'Library' },
];

export function Sidebar({ activeTab, onTabChange, onPlaylistSelect, onSignInClick }: SidebarProps) {
  const [playlists, setPlaylists] = useState<UserPlaylist[]>([]);
  const [collapsed, setCollapsed] = useState(false);

  const loadPlaylists = () => {
    setPlaylists(getPlaylists());
  };

  useEffect(() => {
    loadPlaylists();
  }, []);

  return (
    <aside 
      className={cn(
        "h-full bg-sidebar border-r border-sidebar-border flex flex-col transition-all duration-300",
        collapsed ? "w-[70px]" : "w-64"
      )}
    >
      {/* Logo */}
      <div className={cn("p-4 flex items-center", collapsed ? "justify-center" : "gap-3")}>
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center glow flex-shrink-0">
          <Music2 className="w-5 h-5 text-primary-foreground" />
        </div>
        {!collapsed && (
          <span className="text-xl font-bold text-gradient">C-Music</span>
        )}
      </div>

      {/* Collapse Button */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="mx-3 mb-2 p-2 rounded-lg hover:bg-accent transition-colors flex items-center justify-center"
      >
        {collapsed ? (
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        ) : (
          <div className="flex items-center gap-2 w-full">
            <ChevronLeft className="w-4 h-4 text-muted-foreground" />
            {!collapsed && <span className="text-xs text-muted-foreground">Collapse</span>}
          </div>
        )}
      </button>

      {/* Navigation */}
      <nav className="px-3">
        <ul className="space-y-1">
          {navItems.map((item) => (
            <li key={item.id}>
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => onTabChange(item.id)}
                    className={cn(
                      "nav-link w-full text-sm font-medium",
                      collapsed && "justify-center px-2",
                      activeTab === item.id && "active"
                    )}
                  >
                    <item.icon className="w-5 h-5 flex-shrink-0" />
                    {!collapsed && item.label}
                  </button>
                </TooltipTrigger>
                {collapsed && (
                  <TooltipContent side="right">
                    {item.label}
                  </TooltipContent>
                )}
              </Tooltip>
            </li>
          ))}
        </ul>
      </nav>

      {/* Playlists Section */}
      {!collapsed && (
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
      )}

      {/* Sign In Button */}
      <div className={cn("mt-auto p-3", collapsed && "px-2")}>
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <button 
              onClick={onSignInClick}
              className={cn(
                "w-full py-2.5 px-4 bg-secondary/50 border border-border rounded-xl text-foreground text-sm font-medium hover:bg-secondary transition-all duration-200 flex items-center gap-2",
                collapsed && "justify-center px-2"
              )}
            >
              <User className="w-4 h-4" />
              {!collapsed && "Sign In"}
            </button>
          </TooltipTrigger>
          {collapsed && (
            <TooltipContent side="right">Sign In</TooltipContent>
          )}
        </Tooltip>
      </div>
    </aside>
  );
}
