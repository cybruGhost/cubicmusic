import { useState } from 'react';
import { Plus, Link } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { createPlaylist, importPlaylistFromUrl, savePlaylist } from '@/lib/playlists';
import { toast } from 'sonner';

interface CreatePlaylistDialogProps {
  onPlaylistCreated?: () => void;
  children?: React.ReactNode;
}

export function CreatePlaylistDialog({ onPlaylistCreated, children }: CreatePlaylistDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [importUrl, setImportUrl] = useState('');
  const [isImporting, setIsImporting] = useState(false);

  const handleCreate = () => {
    if (!name.trim()) {
      toast.error('Please enter a playlist name');
      return;
    }
    
    createPlaylist(name.trim(), description.trim() || undefined);
    toast.success(`Created playlist "${name}"`);
    setName('');
    setDescription('');
    setOpen(false);
    onPlaylistCreated?.();
  };

  const handleImport = async () => {
    if (!importUrl.trim()) {
      toast.error('Please enter a YouTube playlist URL');
      return;
    }
    
    setIsImporting(true);
    
    try {
      const result = await importPlaylistFromUrl(importUrl);
      
      if (result) {
        const playlist = createPlaylist(result.name);
        playlist.tracks = result.videos;
        if (result.videos.length > 0) {
          const thumb = result.videos[0].videoThumbnails?.find(t => t.width >= 120);
          playlist.thumbnail = thumb?.url.startsWith('//') 
            ? `https:${thumb.url}` 
            : thumb?.url;
        }
        savePlaylist(playlist);
        toast.success(`Imported "${result.name}" with ${result.videos.length} tracks`);
        setImportUrl('');
        setOpen(false);
        onPlaylistCreated?.();
      } else {
        toast.error('Could not import playlist. Check the URL.');
      }
    } catch {
      toast.error('Failed to import playlist');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline" size="sm" className="gap-2">
            <Plus className="w-4 h-4" />
            New Playlist
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Playlist</DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="create" className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="create">Create New</TabsTrigger>
            <TabsTrigger value="import">Import</TabsTrigger>
          </TabsList>
          
          <TabsContent value="create" className="space-y-4 mt-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Name</label>
              <Input
                placeholder="My Awesome Playlist"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Description (optional)</label>
              <Textarea
                placeholder="What's this playlist about?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>
            
            <Button onClick={handleCreate} className="w-full">
              Create Playlist
            </Button>
          </TabsContent>
          
          <TabsContent value="import" className="space-y-4 mt-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">YouTube Playlist URL</label>
              <div className="flex gap-2">
                <Input
                  placeholder="https://youtube.com/playlist?list=..."
                  value={importUrl}
                  onChange={(e) => setImportUrl(e.target.value)}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Paste a YouTube playlist URL to import all tracks
              </p>
            </div>
            
            <Button 
              onClick={handleImport} 
              className="w-full gap-2"
              disabled={isImporting}
            >
              <Link className="w-4 h-4" />
              {isImporting ? 'Importing...' : 'Import Playlist'}
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
