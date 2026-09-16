// Morning Bridge Action Sheet - Shows when user taps an action
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { 
  Droplets, 
  Wind, 
  Sun, 
  Book, 
  Pen, 
  ListTodo, 
  Footprints,
  Heart,
  Coffee,
  Sparkles,
  Check,
  SkipForward,
  Settings,
} from 'lucide-react';
import { MorningBridgeAction, MorningBridgeIcon } from '@/types/morningBridge';
import { useNavigate } from 'react-router-dom';

interface MorningBridgeActionSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  action: MorningBridgeAction | null;
  onDone: () => void;
  onSkip: () => void;
}

const ICON_MAP: Record<MorningBridgeIcon, React.ReactNode> = {
  droplet: <Droplets className="w-6 h-6" />,
  stretch: <Heart className="w-6 h-6" />,
  sun: <Sun className="w-6 h-6" />,
  wind: <Wind className="w-6 h-6" />,
  book: <Book className="w-6 h-6" />,
  pen: <Pen className="w-6 h-6" />,
  list: <ListTodo className="w-6 h-6" />,
  footprints: <Footprints className="w-6 h-6" />,
  heart: <Heart className="w-6 h-6" />,
  coffee: <Coffee className="w-6 h-6" />,
  sparkles: <Sparkles className="w-6 h-6" />,
};

export function MorningBridgeActionSheet({
  open,
  onOpenChange,
  action,
  onDone,
  onSkip,
}: MorningBridgeActionSheetProps) {
  const navigate = useNavigate();

  if (!action) return null;

  const handleDone = () => {
    onDone();
    onOpenChange(false);
  };

  const handleSkip = () => {
    onSkip();
    onOpenChange(false);
  };

  const handleEditActions = () => {
    onOpenChange(false);
    navigate('/sleep');
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent 
        side="bottom" 
        className="rounded-t-3xl max-h-[80dvh] overflow-y-auto pb-safe"
      >
        <SheetHeader className="text-center pb-4">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
            {ICON_MAP[action.iconKey] || <Sparkles className="w-6 h-6" />}
          </div>
          <SheetTitle className="text-xl">{action.title}</SheetTitle>
          {action.subtitle && (
            <SheetDescription className="text-muted-foreground">
              {action.subtitle}
            </SheetDescription>
          )}
          {action.durationMins && (
            <p className="text-sm text-muted-foreground mt-2">
              ~{action.durationMins} minute{action.durationMins !== 1 ? 's' : ''}
            </p>
          )}
        </SheetHeader>

        <div className="space-y-3 pt-4">
          <Button 
            onClick={handleDone}
            className="w-full h-14 text-base gap-2 rounded-2xl"
            size="lg"
          >
            <Check className="w-5 h-5" />
            Done
          </Button>
          
          <Button 
            onClick={handleSkip}
            variant="outline"
            className="w-full h-12 gap-2 rounded-2xl"
          >
            <SkipForward className="w-4 h-4" />
            Skip for today
          </Button>
          
          <Button 
            onClick={handleEditActions}
            variant="ghost"
            className="w-full h-10 gap-2 text-muted-foreground"
            size="sm"
          >
            <Settings className="w-4 h-4" />
            Edit actions
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
