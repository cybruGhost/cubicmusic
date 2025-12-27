import { Home, Compass, Library, Music2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const navItems = [
  { id: 'home', icon: Home, label: 'Home' },
  { id: 'explore', icon: Compass, label: 'Explore' },
  { id: 'library', icon: Library, label: 'Library' },
];

export function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  return (
    <aside className="w-64 h-full bg-sidebar border-r border-sidebar-border flex flex-col">
      {/* Logo */}
      <div className="p-6 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
          <Music2 className="w-5 h-5 text-primary-foreground" />
        </div>
        <span className="text-xl font-semibold text-foreground">Music</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3">
        <ul className="space-y-1">
          {navItems.map((item) => (
            <li key={item.id}>
              <button
                onClick={() => onTabChange(item.id)}
                className={cn(
                  "w-full flex items-center gap-4 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200",
                  activeTab === item.id
                    ? "bg-sidebar-accent text-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-foreground"
                )}
              >
                <item.icon className={cn(
                  "w-5 h-5",
                  activeTab === item.id ? "text-primary" : ""
                )} />
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {/* Sign in prompt */}
      <div className="p-4 mx-3 mb-6 bg-card rounded-lg">
        <p className="text-sm text-muted-foreground mb-3">
          Sign in to create & share playlists, get personalized recommendations.
        </p>
        <button className="w-full py-2.5 px-4 border border-primary/50 rounded-full text-primary text-sm font-medium hover:bg-primary/10 transition-colors">
          Sign in
        </button>
      </div>
    </aside>
  );
}
