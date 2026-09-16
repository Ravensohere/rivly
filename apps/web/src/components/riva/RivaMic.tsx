import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LivingOrb } from '@/components/ui/LivingOrb';
import { useRiva } from '@/hooks/useRiva';
import { useLocation } from 'react-router-dom';
import { LearningPathSheet } from '@/components/learning/LearningPathSheet';
import { ShoppingListSheet } from '@/components/riva/ShoppingListSheet';
import { useShoppingList } from '@/hooks/useShoppingList';

export function RivaMic() {
  const {
      isListening,
      isProcessing,
      isAISpeaking,
      isGeminiConnected,
      transcript,
      interimTranscript,
      rivaResponse,
      startListening,
      stopListening,
      stopPlayback,
      error,
      isSupported,
      credits,
      learningPathIdToShow,
      clearLearningPathToShow,
      shoppingListOpen,
      setShoppingListOpen,
  } = useRiva();

  const { items: shoppingItems, toggleItem, removeItem, clearChecked } = useShoppingList();

  const [showTranscript, setShowTranscript] = useState(false);
  const location = useLocation();
  const isPlanner = location.pathname === '/app';
  
  // Decide if we should show the floating mic button
  // We HIDE it on the main landscape page because the central Orb handles it there.
  const isDayScreen = location.pathname === '/' || location.pathname === '/day' || location.pathname === '/app';

  const [videoData, setVideoData] = useState<{ videoId: string; title: string } | null>(null);
  const [toolResultCard, setToolResultCard] = useState<{ message: string; action: string } | null>(null);

  // Show transcript when listening, AI speaking, or processing
  useEffect(() => {
    if (isListening || isProcessing || isAISpeaking) {
      setShowTranscript(true);
    } else if (rivaResponse) {
      setShowTranscript(true);
      const timer = setTimeout(() => setShowTranscript(false), 3000); // Increased time to read response
      
      // Handle Video / Weather / News Response
      const responseAny = rivaResponse as any;
      if (responseAny.action === 'online_response' && responseAny.data?.original_action === 'search_youtube' && responseAny.data?.tool_data?.videoId) {
        setVideoData({
          videoId: responseAny.data.tool_data.videoId,
          title: responseAny.data.tool_data.title,
        });
      }
      if ((responseAny.data?.original_action === 'get_weather' || responseAny.data?.original_action === 'get_news') && responseAny.message) {
        setToolResultCard({ message: responseAny.message, action: responseAny.data.original_action });
      } else {
        setToolResultCard(null);
      }

      return () => clearTimeout(timer);
    } else {
      setShowTranscript(false);
    }
  }, [isListening, isProcessing, isAISpeaking, rivaResponse]);

  // Global trigger for voice commands (from OS Shortcuts/Intents)
  useEffect(() => {
    const handleTrigger = () => {
      console.log('[RivaMic] Shortcut trigger received');
      if (!isListening && !isProcessing) {
         startListening();
      }
    };
    window.addEventListener('trigger-riva-mic', handleTrigger);
    return () => window.removeEventListener('trigger-riva-mic', handleTrigger);
  }, [isListening, isProcessing, startListening]);

  const buttonRef = useRef<HTMLButtonElement>(null);



  if (!isSupported) return null;

  return (
    <>
      {/* Transcript bubble — on /app it floats above the command bar; on other pages above nav */}
      <AnimatePresence>
        {showTranscript && (transcript || error) && !isPlanner && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.9 }}
            className="fixed left-1/2 -translate-x-1/2 z-50 max-w-sm bottom-48"
            style={{ width: 'min(90%, calc(100vw - 2rem))' }}
          >
            <div className="bg-background/80 backdrop-blur-xl border border-primary/20 rounded-2xl p-4 shadow-xl">
              <p className="text-sm font-medium text-muted-foreground mb-1">
                {error ? 'Riva Error' : isAISpeaking ? 'Riva is speaking...' : isProcessing ? 'Riva is thinking...' : isListening ? 'Riva is listening...' : 'Riva'}
              </p>
              <p className="text-base text-foreground font-medium">
                {error || transcript || "Speak now..."}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Credit Meter — hidden on /app (command bar owns that area) */}
      <AnimatePresence>
        {credits !== null && !isPlanner && (
            <motion.div
               initial={{ opacity: 0, x: 20 }}
               animate={{ 
                   opacity: 1, 
                   x: 0,
                   scale: credits < 100 ? [1, 1.1, 1] : 1,
               }}
               transition={{ 
                   scale: { repeat: credits < 100 ? Infinity : 0, duration: 1 } 
               }}
               className={cn(
                   "fixed z-40 backdrop-blur-xl border border-primary/20 rounded-full px-4 py-2 flex items-center gap-2 shadow-lg",
                   "bg-primary/10",
                   "bottom-24 left-4"
               )}
            >
                <div className={cn("w-2 h-2 rounded-full", credits > 100 ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-red-500 animate-pulse")} />
                <span className="text-sm font-medium text-primary font-mono">{credits.toLocaleString()} Cr</span>
            </motion.div>
        )}
      </AnimatePresence>

      {/* Weather / News result card */}
      <AnimatePresence>
        {toolResultCard && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-24 z-[999] max-w-md mx-auto"
            style={{
              left: 'max(1rem, env(safe-area-inset-left, 0px))',
              right: 'max(1rem, env(safe-area-inset-right, 0px))',
            }}
          >
            <div className="rounded-xl bg-card border border-border shadow-lg p-4 flex justify-between items-start gap-2">
              <p className="text-sm text-foreground flex-1">{toolResultCard.message}</p>
              <button
                type="button"
                onClick={() => setToolResultCard(null)}
                className="text-muted-foreground hover:text-foreground p-1 rounded"
              >
                ✕
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* YouTube Video Player Overlay */}
      <AnimatePresence>
        {videoData && (
            <motion.div
                initial={{ opacity: 0, y: 50, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 50, scale: 0.9 }}
                className="fixed bottom-24 z-[1000] bg-black rounded-xl shadow-2xl overflow-hidden border border-white/20"
                style={{
                  width: 'min(90vw, 28rem)',
                  right: 'max(1rem, env(safe-area-inset-right, 0px))',
                }}
                drag
                dragConstraints={{ left: 0, right: 0, top: 0, bottom: 500 }}
            >
                <div className="relative pt-[56.25%] bg-black">
                    <iframe 
                        className="absolute top-0 left-0 w-full h-full"
                        src={`https://www.youtube.com/embed/${videoData.videoId}?autoplay=1`} 
                        title="YouTube video player" 
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                        allowFullScreen
                    ></iframe>
                </div>
                <div className="p-3 bg-zinc-900 flex justify-between items-center">
                    <p className="text-xs text-white truncate flex-1 mr-2">{videoData.title}</p>
                    <button 
                        onClick={() => setVideoData(null)}
                        className="p-1 hover:bg-white/10 rounded-full text-zinc-400 hover:text-white transition-colors"
                    >
                        ✕
                    </button>
                </div>
            </motion.div>
        )}
      </AnimatePresence>

      <LearningPathSheet
        pathId={learningPathIdToShow}
        onClose={clearLearningPathToShow}
      />

      <ShoppingListSheet
        open={!!shoppingListOpen}
        onClose={() => setShoppingListOpen(false)}
        items={shoppingItems}
        onToggle={toggleItem}
        onRemove={removeItem}
        onClearChecked={clearChecked}
      />

      {/* Floating Button - ONLY shown if NOT on day screen */}
      <AnimatePresence>
        {!isDayScreen && (
            <motion.button
              ref={buttonRef}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              className={cn(
                "fixed z-50 rounded-full shadow-2xl flex items-center justify-center transition-all duration-300",
                (isListening || isAISpeaking) ? "w-24 h-24" : "w-16 h-16",
                "bg-background/50 backdrop-blur-md border border-white/10",
                isPlanner ? "bottom-44" : "bottom-24"
              )}
              style={{ right: 'max(1.5rem, env(safe-area-inset-right, 0px))' }}
              onClick={() => {
                  if (isAISpeaking) {
                      // Tap while AI is speaking = interrupt
                      stopPlayback();
                  } else if (isListening || isGeminiConnected) {
                      // Tap while session is active = end session
                      stopListening();
                  } else {
                      // Tap while idle = start new session
                      startListening();
                  }
              }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <div className="relative w-full h-full flex items-center justify-center">
                  {/* Background Orb Animation */}
                  <div className="absolute inset-0 overflow-hidden rounded-full opacity-80 pointer-events-none">
                      <LivingOrb
                          state={isAISpeaking ? 'bloom' : isListening ? 'active' : isProcessing ? 'bloom' : 'idle'}
                          className="w-full h-full scale-150"
                      />
                  </div>
              </div>

              {isListening && transcript && (
                  <div className="absolute top-[115%] left-1/2 -translate-x-1/2 w-max max-w-[250px] text-center pointer-events-none">
                      <p className="text-sm text-foreground/70 italic drop-shadow-md text-wrap">
                          {transcript}
                      </p>
                  </div>
              )}
            </motion.button>
        )}
      </AnimatePresence>
    </>
  );
}
