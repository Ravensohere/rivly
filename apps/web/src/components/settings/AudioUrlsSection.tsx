/**
 * AudioUrlsSection - Settings section for configuring sleep sound URLs
 * Users paste their own public audio URLs here
 * Note: This component renders content only - wrapper is provided by parent
 */

import { Music, ExternalLink, Check, AlertCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useAudioUrls, AUDIO_URL_LABELS, AudioUrlKey } from '@/hooks/useAudioUrls';
import { toast } from 'sonner';

export function AudioUrlsSection() {
  const { urls, updateUrl, isValidUrl, getConfiguredCount, totalSounds } = useAudioUrls();

  const handleUrlChange = (key: AudioUrlKey, value: string) => {
    updateUrl(key, value);
  };

  const handleBlur = (key: AudioUrlKey) => {
    const url = urls[key];
    if (url && !isValidUrl(url)) {
      toast.error(`Invalid URL for ${AUDIO_URL_LABELS[key]}. Must be a valid https:// URL.`);
    } else if (url && isValidUrl(url)) {
      toast.success(`${AUDIO_URL_LABELS[key]} URL saved!`);
    }
  };

  const configuredCount = getConfiguredCount();

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="text-primary"><Music className="w-4 h-4" /></div>
        <p className="text-sm text-muted-foreground">
          {configuredCount}/{totalSounds} sounds configured
        </p>
      </div>
      
      <div className="p-4 space-y-4">
        {/* Instructions */}
        <div className="p-3 rounded-xl bg-primary/5 border border-primary/20">
          <p className="text-sm text-foreground">
            Paste URLs to your own audio files. Use a public file host like:
          </p>
          <ul className="mt-2 text-xs text-muted-foreground space-y-1">
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary/60" />
              Cloudflare R2 (free tier available)
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary/60" />
              Supabase Storage
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary/60" />
              AWS S3 (public bucket)
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary/60" />
              Any CORS-friendly file host
            </li>
          </ul>
        </div>

        {/* URL inputs */}
        <div className="space-y-3">
          {(Object.keys(AUDIO_URL_LABELS) as AudioUrlKey[]).map((key) => {
            const url = urls[key];
            const valid = isValidUrl(url);
            const empty = !url || url.trim() === '';
            
            return (
              <div key={key} className="space-y-1.5">
                <label className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">
                    {AUDIO_URL_LABELS[key]}
                  </span>
                  {!empty && (
                    valid ? (
                      <span className="flex items-center gap-1 text-xs text-green-500">
                        <Check className="w-3 h-3" /> Valid
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-destructive">
                        <AlertCircle className="w-3 h-3" /> Invalid
                      </span>
                    )
                  )}
                </label>
                <Input
                  type="url"
                  value={url}
                  onChange={(e) => handleUrlChange(key, e.target.value)}
                  onBlur={() => handleBlur(key)}
                  placeholder="https://your-storage.com/audio/forest.mp3"
                  className={`text-sm ${!empty && !valid ? 'border-destructive' : ''}`}
                />
              </div>
            );
          })}
        </div>

        {/* Help link */}
        <a
          href="https://developers.cloudflare.com/r2/get-started/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-xs text-primary hover:underline"
        >
          <ExternalLink className="w-3 h-3" />
          Learn how to set up Cloudflare R2
        </a>
      </div>
    </div>
  );
}
