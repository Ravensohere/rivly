import { AVATAR_PRESETS, AvatarSettings, MotionIntensity } from '@/lib/avatarSettings';

const MOTION_OPTIONS: { id: MotionIntensity; label: string }[] = [
  { id: 'calm', label: 'Calm' },
  { id: 'normal', label: 'Normal' },
  { id: 'energetic', label: 'Energetic' },
];

/**
 * "Make it yours" panel — color + motion, the Nixi-inspired customization the merge request
 * called out specifically. Flowzo-referenced visual language: rounded pill swatches, compact
 * segmented control, orange active-state ring (apps/web Figma reference, Flowzo file).
 */
export function AvatarCustomizer({
  settings,
  onChange,
}: {
  settings: AvatarSettings;
  onChange: (patch: Partial<AvatarSettings>) => void;
}) {
  return (
    <div className="w-full rounded-2xl border border-border bg-card/60 p-4 flex flex-col gap-4">
      <div>
        <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Color</p>
        <div className="flex gap-2 flex-wrap">
          {AVATAR_PRESETS.map((preset) => {
            const active = settings.pillColor === preset.pillColor && settings.eyeColor === preset.eyeColor;
            return (
              <button
                key={preset.id}
                type="button"
                title={preset.label}
                onClick={() => onChange({ pillColor: preset.pillColor, eyeColor: preset.eyeColor })}
                className="flex flex-col items-center gap-1 group"
              >
                <span
                  className="block w-9 h-9 rounded-full transition-shadow"
                  style={{
                    background: preset.pillColor,
                    boxShadow: active
                      ? `0 0 0 2px var(--background, #fff), 0 0 0 4px ${preset.eyeColor}`
                      : `inset 0 0 0 1px ${preset.eyeColor}55`,
                  }}
                >
                  <span
                    className="block w-2 h-2 rounded-full mx-auto mt-3.5"
                    style={{ background: preset.eyeColor, boxShadow: `0 0 6px ${preset.eyeColor}aa` }}
                  />
                </span>
                <span className="text-[10px] text-muted-foreground group-hover:text-foreground">
                  {preset.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Motion</p>
        <div className="flex rounded-full border border-border overflow-hidden w-fit">
          {MOTION_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => onChange({ motionIntensity: opt.id })}
              className={`px-3 py-1.5 text-xs transition-colors ${
                settings.motionIntensity === opt.id
                  ? 'bg-orange-500 text-white'
                  : 'bg-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <label className="flex items-center justify-between text-xs text-muted-foreground cursor-pointer">
        <span>Eyes follow cursor</span>
        <input
          type="checkbox"
          checked={settings.trackCursor}
          onChange={(e) => onChange({ trackCursor: e.target.checked })}
          className="accent-orange-500 w-4 h-4"
        />
      </label>
    </div>
  );
}
