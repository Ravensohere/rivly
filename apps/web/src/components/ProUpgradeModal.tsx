import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Sparkles, Check, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

interface ProUpgradeModalProps {
  open: boolean;
  onClose: () => void;
  feature?: string; // e.g., "unlimited voice commands", "AI insights"
  limitReached?: string; // e.g., "5 voice commands used today"
}

export function ProUpgradeModal({ open, onClose, feature, limitReached }: ProUpgradeModalProps) {
  const navigate = useNavigate();
  const handleUpgrade = () => {
    onClose();
    navigate('/pricing');
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <DialogTitle className="text-xl">Upgrade to Pro</DialogTitle>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
          {limitReached && (
            <DialogDescription className="text-sm text-muted-foreground">
              {limitReached} — Upgrade to keep using {feature || 'Pro features'}.
            </DialogDescription>
          )}
        </DialogHeader>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          {/* Pricing Box */}
          <div className="p-4 rounded-lg bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-2 border-purple-600">
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-3xl font-bold text-purple-900 dark:text-purple-100">₹199</span>
              <span className="text-sm text-gray-600 dark:text-gray-400">/month</span>
            </div>
            <p className="text-xs text-gray-500">Cancel anytime. Privacy-first.</p>
          </div>

          {/* Benefits */}
          <div className="space-y-3">
            <h4 className="font-semibold text-sm text-gray-900 dark:text-white">Pro includes:</h4>
            <ul className="space-y-2">
              {[
                'Unlimited voice commands + spoken AI replies',
                'AI Memory & daily insights (energy patterns)',
                'AI Rhythm Guide (overwhelm detection)',
                'Personalized daily & night briefs',
                'Priority support (WhatsApp)',
                'No data selling, ever'
              ].map((benefit, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <Check className="w-4 h-4 text-purple-600 mt-0.5 shrink-0" />
                  <span className="text-gray-700 dark:text-gray-300">{benefit}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* CTA Buttons */}
          <div className="space-y-2 pt-2">
            <Button
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
              size="lg"
              onClick={handleUpgrade}
            >
              Upgrade Now — ₹199/mo
            </Button>
            <Button variant="ghost" className="w-full" onClick={onClose}>
              Maybe Later
            </Button>
          </div>

          {/* Trust Badge */}
          <p className="text-xs text-center text-gray-500">
            ✓ Secure payment via Cashfree | ✓ Powered by Gemini + Groq AI | ✓ Data stays yours
          </p>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}
