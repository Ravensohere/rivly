import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic, MicOff, Send, Loader2, Sparkles, X,
  Zap, Calendar, Plus, Play, Clock, BellRing, BookOpen,
  ChevronUp, ChevronDown
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRiva } from '@/hooks/useRiva';

// Quick-command chip definitions (7 P0 commands)
const QUICK_CMDS = [
  { label: 'Plan my day', icon: Calendar,  cmd: 'Plan my day' },
  { label: "What's next",  icon: Zap,       cmd: "What's next?" },
  { label: 'Add task',     icon: Plus,      cmd: 'add task ' },
  { label: 'Replan',       icon: Clock,     cmd: "Replan: I'm running 30 mins late" },
  { label: 'Start focus',  icon: Play,      cmd: 'Start focus for 25 minutes' },
  { label: 'Explain',      icon: BookOpen,  cmd: 'Explain ' },
  { label: 'Reminder',     icon: BellRing,  cmd: 'Set reminder for ' },
];

export function RivaCommandBar() {
  const {
    isListening, isProcessing, transcript, interimTranscript,
    rivaResponse, startListening, stopListening,
    processTranscript, credits, error, isSupported,
    isCommandBarOpen, setIsCommandBarOpen
  } = useRiva();

  const [inputText, setInputText]   = useState('');
  const [showChips, setShowChips]   = useState(false);
  const [showResponse, setShowResponse] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const responseTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Show response card whenever rivaResponse changes
  useEffect(() => {
    if (rivaResponse) {
      setShowResponse(true);
      if (responseTimerRef.current) clearTimeout(responseTimerRef.current);
      responseTimerRef.current = setTimeout(() => setShowResponse(false), 10000); // Increased to 10s for readability
    }
    return () => { if (responseTimerRef.current) clearTimeout(responseTimerRef.current); };
  }, [rivaResponse]);

  // Show live transcript in input while listening
  useEffect(() => {
    if (isListening && transcript) {
      setInputText(transcript);
    }
  }, [transcript, isListening]);

  // Handle Command Palette Open/Close
  useEffect(() => {
    if (isCommandBarOpen) {
      setShowChips(true);
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setShowChips(false);
      setInputText('');
      inputRef.current?.blur();
    }
  }, [isCommandBarOpen]);

  const handleSend = useCallback(() => {
    const text = inputText.trim();
    if (!text || isProcessing) return;
    processTranscript(text);
    setInputText('');
    setShowChips(false);
    setIsCommandBarOpen(false);
    inputRef.current?.blur();
  }, [inputText, isProcessing, processTranscript, setIsCommandBarOpen]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSend();
    if (e.key === 'Escape') { setInputText(''); setShowChips(false); setIsCommandBarOpen(false); }
  };

  const handleChip = (cmd: string) => {
    // If ends with space, focus input for user to complete
    if (cmd.endsWith(' ')) {
      setInputText(cmd);
      // Wait for React to render before focusing
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      processTranscript(cmd);
      setShowChips(false);
      setIsCommandBarOpen(false);
    }
  };

  const handleMicToggle = () => {
    if (isListening) stopListening();
    else startListening();
  };

  const responseAny = rivaResponse as any;
  const isKnowledgeAnswer = responseAny?.data?.original_action === 'online_response' || responseAny?.action === 'online_response';

  return (
    <div
      className="fixed bottom-[72px] left-0 right-0 z-[800] pointer-events-none"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      {/* ── Response Card ── */}
      <AnimatePresence>
        {showResponse && rivaResponse && (
          <motion.div
            key="response-card"
            initial={{ opacity: 0, y: 14, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            className="mx-4 mb-2 pointer-events-auto"
          >
            <div
              className="rounded-2xl border border-primary/20 p-4 shadow-xl"
              style={{
                background: 'hsl(var(--background) / 0.92)',
                backdropFilter: 'blur(24px)',
              }}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 text-primary mb-1">
                  <Sparkles className="w-4 h-4 shrink-0" />
                  <span className="text-xs font-semibold uppercase tracking-wide">Riva</span>
                  {isKnowledgeAnswer && (
                    <span className="text-xs text-muted-foreground font-normal normal-case tracking-normal ml-1">· Knowledge</span>
                  )}
                </div>
                <button
                  onClick={() => setShowResponse(false)}
                  aria-label="Dismiss Riva's response"
                  className="text-muted-foreground hover:text-foreground p-0.5 rounded transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-sm text-foreground leading-relaxed">{rivaResponse.message}</p>
              {isKnowledgeAnswer && (
                <button
                  className="mt-2 text-xs text-primary underline underline-offset-2"
                  onClick={() => processTranscript('go deeper on the last explanation')}
                >
                  Go deeper →
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Overlay Backdrop ── */}
      <AnimatePresence>
        {isCommandBarOpen && (
           <motion.div 
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             exit={{ opacity: 0 }}
             transition={{ duration: 0.2 }}
             className="fixed inset-0 top-0 bottom-[-100px] z-[790] pointer-events-auto bg-black/40 backdrop-blur-sm"
             onClick={() => setIsCommandBarOpen(false)}
           />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isCommandBarOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed z-[810] bottom-[72px] left-0 right-0 pointer-events-none"
            style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
          >
            {/* ── Quick Command Chips ── */}
            <AnimatePresence>
              {showChips && (
          <motion.div
            key="chips"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="mx-4 mb-2 pointer-events-auto"
          >
            <div
              className="rounded-2xl border border-border/40 p-3 shadow-lg"
              style={{
                background: 'hsl(var(--background) / 0.95)',
                backdropFilter: 'blur(20px)',
              }}
            >
              <p className="text-xs text-muted-foreground mb-2 px-1">Quick commands</p>
              <div className="flex flex-wrap gap-2">
                {QUICK_CMDS.map(({ label, icon: Icon, cmd }) => (
                  <button
                    key={label}
                    onClick={() => handleChip(cmd)}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all',
                      'bg-primary/10 text-primary border border-primary/20',
                      'hover:bg-primary/20 active:scale-95'
                    )}
                  >
                    <Icon className="w-3 h-3" />
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Main Command Bar ── */}
      <div className="mx-3 mb-1 pointer-events-auto">
        <motion.div
          animate={{
            boxShadow: isListening
              ? '0 0 0 2px hsl(var(--primary) / 0.6), 0 8px 32px -4px hsl(var(--primary) / 0.25)'
              : '0 4px 24px -4px rgba(0,0,0,0.12)',
          }}
          transition={{ duration: 0.3 }}
          className="flex items-center gap-2 h-12 rounded-2xl border border-border/40 px-3"
          style={{
            background: 'hsl(var(--background) / 0.90)',
            backdropFilter: 'blur(28px) saturate(180%)',
          }}
        >
          {/* Chips Toggle */}
          <button
            onClick={() => setShowChips(s => !s)}
            className={cn(
              'w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-all',
              showChips
                ? 'bg-primary text-primary-foreground'
                : 'bg-primary/10 text-primary hover:bg-primary/20'
            )}
          >
            {showChips
              ? <ChevronDown className="w-4 h-4" />
              : <ChevronUp className="w-4 h-4" />
            }
          </button>

          {/* Listening pulse dot */}
          {isListening && (
            <motion.div
              animate={{ scale: [1, 1.4, 1], opacity: [1, 0.6, 1] }}
              transition={{ duration: 0.8, repeat: Infinity }}
              className="w-2 h-2 rounded-full bg-red-500 shrink-0"
            />
          )}

          {/* Text input */}
          <input
            ref={inputRef}
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setShowChips(false)}
            placeholder={isListening ? 'Listening…' : 'Ask Riva anything…'}
            className={cn(
              'flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/60',
              'outline-none border-none min-w-0',
              isListening && 'text-primary placeholder:text-primary/60'
            )}
          />

          {/* Credits pill */}
          {credits !== null && !inputText.trim() && !isListening && (
            <div className={cn(
              'flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-mono shrink-0',
              credits > 100 ? 'text-emerald-600' : 'text-red-500'
            )}>
              <div className={cn('w-1.5 h-1.5 rounded-full', credits > 100 ? 'bg-emerald-500' : 'bg-red-500 animate-pulse')} />
              {credits.toLocaleString()}
            </div>
          )}

          {/* Send or Mic */}
          {inputText.trim() ? (
            <button
              onClick={handleSend}
              disabled={isProcessing}
              className={cn(
                'w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-all',
                'bg-primary text-primary-foreground hover:bg-primary/90 active:scale-95',
                isProcessing && 'opacity-50 pointer-events-none'
              )}
            >
              {isProcessing
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <Send className="w-4 h-4" />
              }
            </button>
          ) : (
            <div className="relative flex items-center justify-center">
              {isProcessing ? (
                <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-primary/10">
                  <Loader2 className="w-4 h-4 text-primary animate-spin" />
                </div>
              ) : isSupported ? (
                <button
                  onClick={handleMicToggle}
                  className={cn(
                    'w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-all',
                    isListening
                      ? 'bg-red-500 text-white shadow-[0_0_12px_rgba(239,68,68,0.5)]'
                      : 'bg-primary/10 text-primary hover:bg-primary/20 active:scale-95'
                  )}
                >
                  {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>
              ) : null}
              {isListening && transcript && (
                 <div className="absolute top-[120%] right-0 pointer-events-none w-[200px] text-right">
                     <p className="text-sm italic text-muted-foreground opacity-80 truncate">{transcript}</p>
                 </div>
              )}
            </div>
          )}
        </motion.div>
      </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
