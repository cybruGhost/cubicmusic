import { ScrollArea } from '@/components/ui/scroll-area';

interface PlainLyricsProps {
  lyrics: string;
}

export function PlainLyrics({ lyrics }: PlainLyricsProps) {
  const lines = lyrics.split('\n').filter(line => line.trim());

  return (
    <ScrollArea className="h-[300px] md:h-[400px]">
      <div className="space-y-3 px-4 py-2">
        {lines.map((line, index) => (
          <p 
            key={index} 
            className="text-foreground/80 text-sm md:text-base leading-relaxed"
          >
            {line}
          </p>
        ))}
      </div>
    </ScrollArea>
  );
}
