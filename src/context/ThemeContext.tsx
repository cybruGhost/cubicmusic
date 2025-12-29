import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getSettings } from '@/lib/storage';

interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
}

interface ThemeContextType {
  colors: ThemeColors | null;
  setAlbumArt: (imageUrl: string | null) => void;
  isDynamic: boolean;
}

const defaultColors: ThemeColors = {
  primary: '174 72% 56%',
  secondary: '240 8% 12%',
  accent: '240 8% 14%',
};

const ThemeContext = createContext<ThemeContextType>({
  colors: null,
  setAlbumArt: () => {},
  isDynamic: true,
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [colors, setColors] = useState<ThemeColors | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const settings = getSettings();

  useEffect(() => {
    if (!imageUrl || settings.theme !== 'dynamic') {
      // Reset to default
      document.documentElement.style.removeProperty('--dynamic-primary');
      document.documentElement.style.removeProperty('--dynamic-bg');
      setColors(null);
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = imageUrl;

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        canvas.width = 50;
        canvas.height = 50;
        ctx.drawImage(img, 0, 0, 50, 50);

        const imageData = ctx.getImageData(0, 0, 50, 50).data;
        const colorCounts: Record<string, { count: number; r: number; g: number; b: number }> = {};

        // Sample colors
        for (let i = 0; i < imageData.length; i += 16) {
          const r = imageData[i];
          const g = imageData[i + 1];
          const b = imageData[i + 2];
          
          // Skip very dark or very light colors
          const brightness = (r + g + b) / 3;
          if (brightness < 30 || brightness > 220) continue;
          
          // Skip grayscale
          const max = Math.max(r, g, b);
          const min = Math.min(r, g, b);
          if (max - min < 20) continue;

          const key = `${Math.round(r / 20)}-${Math.round(g / 20)}-${Math.round(b / 20)}`;
          if (!colorCounts[key]) {
            colorCounts[key] = { count: 0, r, g, b };
          }
          colorCounts[key].count++;
        }

        // Find dominant color
        let dominantColor = { r: 64, g: 191, b: 175 }; // Default teal
        let maxCount = 0;

        Object.values(colorCounts).forEach(({ count, r, g, b }) => {
          if (count > maxCount) {
            maxCount = count;
            dominantColor = { r, g, b };
          }
        });

        // Convert to HSL
        const { h, s, l } = rgbToHsl(dominantColor.r, dominantColor.g, dominantColor.b);
        const intensity = settings.dynamicThemeIntensity;

        // Apply dynamic theme
        const primaryHsl = `${h} ${Math.min(s * 1.2, 80)}% ${Math.max(45, Math.min(l, 60))}%`;
        
        setColors({
          primary: primaryHsl,
          secondary: `${h} 15% 12%`,
          accent: `${h} 20% 16%`,
        });

        // Apply CSS variables with intensity
        document.documentElement.style.setProperty('--dynamic-primary', primaryHsl);
        document.documentElement.style.setProperty('--dynamic-bg', 
          `linear-gradient(135deg, 
            hsl(240 10% 4%) 0%, 
            hsl(${h} 15% ${6 + intensity * 4}%) 50%, 
            hsl(${h} 20% ${8 + intensity * 4}%) 100%)`
        );
      } catch {
        // CORS or other error, use defaults
        setColors(null);
      }
    };

    img.onerror = () => setColors(null);
  }, [imageUrl, settings.theme, settings.dynamicThemeIntensity]);

  return (
    <ThemeContext.Provider value={{ 
      colors, 
      setAlbumArt: setImageUrl,
      isDynamic: settings.theme === 'dynamic'
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

function rgbToHsl(r: number, g: number, b: number) {
  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}
