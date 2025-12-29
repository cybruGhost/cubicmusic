import { useState, useCallback, useEffect } from 'react';
import { Search, X, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface SearchBarProps {
  onSearch: (query: string) => void;
  onOpenSearch?: () => void;
  initialQuery?: string;
  minimal?: boolean;
}

export function SearchBar({ onSearch, onOpenSearch, initialQuery = '', minimal = false }: SearchBarProps) {
  const [query, setQuery] = useState(initialQuery);
  const [isFocused, setIsFocused] = useState(false);
  const [isExpanded, setIsExpanded] = useState(!minimal);

  useEffect(() => {
    const debounce = setTimeout(() => {
      if (query.trim()) {
        onSearch(query);
      }
    }, 500);

    return () => clearTimeout(debounce);
  }, [query, onSearch]);

  const handleClear = useCallback(() => {
    setQuery('');
    onSearch('');
  }, [onSearch]);

  const handleExpand = () => {
    if (minimal && onOpenSearch) {
      onOpenSearch();
    } else {
      setIsExpanded(true);
    }
  };

  // Minimal search icon version
  if (minimal && !isExpanded) {
    return (
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={handleExpand}
        className="w-11 h-11 rounded-full bg-secondary/50 flex items-center justify-center hover:bg-secondary transition-colors"
      >
        <Search className="w-5 h-5 text-muted-foreground" />
      </motion.button>
    );
  }

  return (
    <motion.div
      initial={minimal ? { width: 44 } : { width: '100%' }}
      animate={{ width: '100%' }}
      className={cn(
        "relative flex items-center transition-all duration-300",
        isFocused && "max-w-2xl"
      )}
    >
      <div
        className={cn(
          "w-full flex items-center gap-3 px-4 py-3 rounded-full border transition-all duration-200",
          isFocused 
            ? "border-primary/50 bg-secondary/80 shadow-lg" 
            : "border-transparent bg-secondary/50 hover:bg-secondary/70"
        )}
      >
        <Search className={cn(
          "w-5 h-5 flex-shrink-0 transition-colors",
          isFocused ? "text-primary" : "text-muted-foreground"
        )} />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder="Search songs, albums, artists..."
          className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground outline-none text-sm"
        />
        
        <AnimatePresence>
          {query && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              onClick={handleClear}
              className="p-1 hover:bg-accent rounded-full transition-colors"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </motion.button>
          )}
        </AnimatePresence>

        {query && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={() => onSearch(query)}
            className="p-1.5 bg-primary rounded-full"
          >
            <ArrowRight className="w-4 h-4 text-primary-foreground" />
          </motion.button>
        )}
      </div>
    </motion.div>
  );
}
