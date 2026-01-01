import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getSettings } from '@/lib/storage';

interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  hue: number;
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
  hue: 174,
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
      document.documentElement.style.removeProperty('--dynamic-primary');
      document.documentElement.style.removeProperty('--dynamic-bg');
      document.documentElement.style.removeProperty('--primary');
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

        canvas.width = 100;
        canvas.height = 100;
        ctx.drawImage(img, 0, 0, 100, 100);

        const imageData = ctx.getImageData(0, 0, 100, 100).data;
        
        // Collect vibrant colors with their counts
        const colorBuckets: Map<string, { r: number; g: number; b: number; count: number; saturation: number }> = new Map();

        for (let i = 0; i < imageData.length; i += 4) {
          const r = imageData[i];
          const g = imageData[i + 1];
          const b = imageData[i + 2];
          
          // Skip very dark or very light
          const brightness = (r + g + b) / 3;
          if (brightness < 25 || brightness > 230) continue;
          
          // Calculate saturation
          const max = Math.max(r, g, b);
          const min = Math.min(r, g, b);
          const saturation = max === 0 ? 0 : (max - min) / max;
          
          // Skip low saturation (grayscale)
          if (saturation < 0.15) continue;

          // Bucket colors (reduce precision to group similar colors)
          const bucketR = Math.round(r / 25) * 25;
          const bucketG = Math.round(g / 25) * 25;
          const bucketB = Math.round(b / 25) * 25;
          const key = `${bucketR}-${bucketG}-${bucketB}`;
          
          const existing = colorBuckets.get(key);
          if (existing) {
            existing.count++;
            // Keep the more saturated version
            if (saturation > existing.saturation) {
              existing.r = r;
              existing.g = g;
              existing.b = b;
              existing.saturation = saturation;
            }
          } else {
            colorBuckets.set(key, { r, g, b, count: 1, saturation });
          }
        }

        // Find most vibrant dominant color (balance count and saturation)
        let bestColor = { r: 64, g: 191, b: 175 }; // Default teal
        let bestScore = 0;

        colorBuckets.forEach(({ r, g, b, count, saturation }) => {
          // Score = count * saturation boost
          const score = count * (1 + saturation * 2);
          if (score > bestScore) {
            bestScore = score;
            bestColor = { r, g, b };
          }
        });

        // Convert to HSL
        const { h, s, l } = rgbToHsl(bestColor.r, bestColor.g, bestColor.b);
        const intensity = settings.dynamicThemeIntensity;

        // Create vibrant primary color
        const adjustedS = Math.min(Math.max(s * 1.3, 50), 85);
        const adjustedL = Math.min(Math.max(l, 40), 55);
        const primaryHsl = `${h} ${adjustedS}% ${adjustedL}%`;
        
        setColors({
          primary: primaryHsl,
          secondary: `${h} 20% 12%`,
          accent: `${h} 25% 18%`,
          hue: h,
        });

        // Apply CSS variables
        document.documentElement.style.setProperty('--dynamic-primary', primaryHsl);
        document.documentElement.style.setProperty('--primary', primaryHsl);
        
        // Create rich gradient background
        const bgIntensity = 6 + intensity * 6;
        document.documentElement.style.setProperty('--dynamic-bg', 
          `linear-gradient(135deg, 
            hsl(${h} 15% ${bgIntensity}%) 0%, 
            hsl(${h} 20% ${bgIntensity + 2}%) 50%, 
            hsl(${h} 25% ${bgIntensity + 4}%) 100%)`
        );

        // Update other theme colors for consistency
        document.documentElement.style.setProperty('--accent', `${h} 25% 18%`);
        document.documentElement.style.setProperty('--muted', `${h} 15% 20%`);
        
      } catch {
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