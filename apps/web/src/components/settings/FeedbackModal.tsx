import { useState } from 'react';
import { 
  ResponsiveModal, 
  ResponsiveModalContent, 
  ResponsiveModalHeader, 
  ResponsiveModalTitle, 
  ResponsiveModalBody, 
  ResponsiveModalFooter 
} from '@/components/ui/ResponsiveModal';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Send, Sparkles, Star } from 'lucide-react';
import { motion } from 'framer-motion';

interface FeedbackModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FeedbackModal({ open, onOpenChange }: FeedbackModalProps) {
  const { user } = useAuthContext();
  const [rating, setRating] = useState<number>(0);
  const [hoveredRating, setHoveredRating] = useState<number>(0);
  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!feedback.trim()) {
      toast.error('Please enter some feedback');
      return;
    }

    if (rating === 0) {
      toast.error('Please select a rating');
      return;
    }

    setIsSubmitting(true);

    try {
      const { data, error } = await supabase.functions.invoke('send-feedback', {
        body: {
          rating,
          feedback,
          userEmail: user?.email,
          userName: user?.user_metadata?.full_name || user?.email?.split('@')[0],
        }
      });

      if (error) throw error;

      toast.success('Feedback sent successfully! Thank you.');
      setRating(0);
      setFeedback('');
      onOpenChange(false);
    } catch (err) {
      toast.error('Failed to send feedback. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setRating(0);
    setFeedback('');
    onOpenChange(false);
  };

  return (
    <ResponsiveModal open={open} onOpenChange={handleClose}>
      <ResponsiveModalContent className="max-w-md">
        <ResponsiveModalHeader>
          <ResponsiveModalTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Send Feedback
          </ResponsiveModalTitle>
        </ResponsiveModalHeader>
        
        <ResponsiveModalBody className="py-4">
          <div className="space-y-6">
            <p className="text-sm text-muted-foreground">
              We'd love to hear your thoughts! Share bugs, issues, or praise about Rivly.
            </p>
            
            {/* Star Rating */}
            <div className="space-y-2">
              <Label>How would you rate your experience?</Label>
              <div className="flex gap-2 justify-center py-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <motion.button
                    key={star}
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setRating(star);
                    }}
                    onMouseEnter={() => setHoveredRating(star)}
                    onMouseLeave={() => setHoveredRating(0)}
                    whileHover={{ scale: 1.2 }}
                    whileTap={{ scale: 0.9 }}
                    style={{ pointerEvents: 'auto' }}
                    className="focus:outline-none transition-all"
                  >
                    <Star
                      className={`w-10 h-10 transition-all ${
                        star <= (hoveredRating || rating)
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'text-muted-foreground/30'
                      }`}
                    />
                  </motion.button>
                ))}
              </div>
              {rating > 0 && (
                <motion.p
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center text-sm text-muted-foreground"
                >
                  {rating === 5 && "Amazing! 🎉"}
                  {rating === 4 && "Great! 😊"}
                  {rating === 3 && "Good 👍"}
                  {rating === 2 && "Okay 😐"}
                  {rating === 1 && "Needs improvement 😔"}
                </motion.p>
              )}
            </div>
            
            {/* Feedback Text */}
            <div className="space-y-2">
              <Label htmlFor="feedback">Your Feedback</Label>
              <Textarea
                id="feedback"
                placeholder="Tell us about bugs, issues, or what you love about Rivly..."
                className="min-h-[150px] rounded-xl"
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
              />
            </div>
          </div>
        </ResponsiveModalBody>

        <ResponsiveModalFooter>
          <Button 
            variant="ghost" 
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting || !feedback.trim() || rating === 0}
            className="gap-2"
          >
            {isSubmitting ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full"
              />
            ) : (
              <Send className="w-4 h-4" />
            )}
            Send Feedback
          </Button>
        </ResponsiveModalFooter>
      </ResponsiveModalContent>
    </ResponsiveModal>
  );
}
