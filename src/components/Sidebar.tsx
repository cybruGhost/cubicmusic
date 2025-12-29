import { useState, useEffect } from 'react';
import { 
  Home, 
  Compass, 
  Library, 
  Music2, 
  ChevronLeft, 
  ChevronRight, 
  User,
  Settings,
  Sparkles,
  Radio
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getGreeting } from '@/lib/storage';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import { motion } from 'framer-motion';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onSignInClick?: () => void;
  onSettingsClick?: () => void;
}

// Add 'radio' to navigation items
const navItems = [
  { id: 'home', icon: Home, label: 'Home' },
  { id: 'explore', icon: Compass, label: 'Explore' },
  { id: 'library', icon: Library, label: 'Library' },
  { id: 'radio', icon: Radio, label: 'Radio' }, // Added radio tab
];

export function Sidebar({ activeTab, onTabChange, onSignInClick, onSettingsClick }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const greeting = getGreeting();

  return (
    <aside 
      className={cn(
        "h-full flex flex-col transition-all duration-300 border-r border-border/50",
        collapsed ? "w-[72px]" : "w-72"
      )}
      style={{
        background: 'linear-gradient(180deg, hsl(240 12% 6%) 0%, hsl(240 10% 4%) 100%)'
      }}
    >
      {/* Logo */}
      <div className={cn("p-5 flex items-center", collapsed ? "justify-center" : "gap-3")}>
        <motion.div 
          whileHover={{ scale: 1.05, rotate: 5 }}
          className="w-11 h-11 rounded-2xl bg-gradient-to-br from-primary via-primary/80 to-primary/60 flex items-center justify-center shadow-lg flex-shrink-0"
          style={{ boxShadow: '0 0 30px hsl(174 72% 56% / 0.3)' }}
        >
          <Music2 className="w-6 h-6 text-primary-foreground" />
        </motion.div>
        {!collapsed && (
          <div>
            <span className="text-xl font-bold text-gradient tracking-tight">C-Music</span>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Premium</p>
          </div>
        )}
      </div>

      {/* Greeting */}
      {!collapsed && (
        <div className="px-5 py-3">
          <p className="text-sm text-foreground font-medium">{greeting} 👋</p>
        </div>
      )}

      {/* Navigation */}
      <nav className="px-3 mt-2">
        <ul className="space-y-1">
          {navItems.map((item) => (
            <li key={item.id}>
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => onTabChange(item.id)}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200",
                      collapsed && "justify-center px-2",
                      activeTab === item.id 
                        ? "bg-primary/15 text-primary" 
                        : "text-muted-foreground hover:bg-accent hover:text-foreground"
                    )}
                  >
                    <item.icon className={cn(
                      "w-5 h-5 flex-shrink-0 transition-transform",
                      activeTab === item.id && "scale-110"
                    )} />
                    {!collapsed && item.label}
                    {!collapsed && activeTab === item.id && (
                      <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />
                    )}
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

      {/* Quick Access */}
      {!collapsed && (
        <div className="px-5 mt-6">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">
            Quick Access
          </p>
          <div className="space-y-2">
            <button 
              onClick={() => onTabChange('home')}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg bg-gradient-to-r from-primary/10 to-primary/5 hover:from-primary/20 hover:to-primary/10 transition-all group"
            >
              <Sparkles className="w-4 h-4 text-primary group-hover:scale-110 transition-transform" />
              <span className="text-sm text-foreground">Discover</span>
            </button>
            <button 
              onClick={() => onTabChange('radio')} // Connect to radio tab
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-accent transition-all group"
            >
              <Radio className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
              <span className="text-sm text-muted-foreground group-hover:text-foreground">Radio Mode</span>
            </button>
          </div>
        </div>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Collapse Toggle */}
      <div className="px-3 py-2">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            "w-full p-2.5 rounded-lg hover:bg-accent transition-colors flex items-center",
            collapsed ? "justify-center" : "gap-2"
          )}
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          ) : (
            <>
              <ChevronLeft className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Collapse</span>
            </>
          )}
        </button>
      </div>

      {/* Bottom Actions */}
      <div className={cn("p-3 space-y-2 border-t border-border/30", collapsed && "px-2")}>
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <button 
              onClick={onSettingsClick}
              className={cn(
                "w-full py-2.5 px-3 rounded-xl text-sm font-medium transition-all duration-200 flex items-center gap-2 text-muted-foreground hover:text-foreground hover:bg-accent",
                collapsed && "justify-center px-2"
              )}
            >
              <Settings className="w-4 h-4" />
              {!collapsed && "Settings"}
            </button>
          </TooltipTrigger>
          {collapsed && <TooltipContent side="right">Settings</TooltipContent>}
        </Tooltip>

        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <button 
              onClick={onSignInClick}
              className={cn(
                "w-full py-2.5 px-3 bg-primary/10 border border-primary/20 rounded-xl text-primary text-sm font-medium hover:bg-primary/20 transition-all duration-200 flex items-center gap-2",
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
