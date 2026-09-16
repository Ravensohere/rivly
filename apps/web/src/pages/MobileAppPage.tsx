import { motion } from 'framer-motion';
import { Smartphone, Download, Check, Apple, Play, Globe, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageTransition } from '@/components/ui/PageTransition';
import { Link } from 'react-router-dom';

export default function MobileAppPage() {
  return (
    <PageTransition className="min-h-screen bg-background py-12 px-6">
      <div className="max-w-3xl mx-auto space-y-12">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="w-20 h-20 bg-primary/10 rounded-[2.5rem] flex items-center justify-center mx-auto mb-6">
            <Smartphone className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight">Rivly Mobile</h1>
          <p className="text-xl text-muted-foreground">The full rhythm experience, in your pocket.</p>
        </div>

        {/* Benefits */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-12">
          {[
            { title: "Native Alarms", desc: "Reliable, system-level alarms that wake you up gently.", icon: ShieldCheck },
            { title: "Offline Access", desc: "Plan and focus even without an internet connection.", icon: Globe },
            { title: "Push Notifications", desc: "Gentle reminders for your morning and evening rhythms.", icon: Download },
            { title: "Haptic Feedback", desc: "Feel the rhythm with subtle tactile interactions.", icon: Check }
          ].map((feature, i) => (
             <motion.div 
               key={i}
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ delay: 0.1 * i }}
               className="p-6 rounded-3xl bg-card border border-border/40 space-y-3"
             >
               <div className="w-10 h-10 rounded-xl bg-primary/5 flex items-center justify-center text-primary">
                 <feature.icon className="w-5 h-5" />
               </div>
               <h3 className="font-semibold text-lg">{feature.title}</h3>
               <p className="text-sm text-muted-foreground leading-relaxed">{feature.desc}</p>
             </motion.div>
          ))}
        </div>

        {/* Call to Actions */}
        <div className="bg-secondary/30 rounded-[3rem] p-8 md:p-12 text-center space-y-8 border border-border/20">
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Get the App</h2>
            <p className="text-muted-foreground">Native iOS and Android apps are currently in private beta.</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button disabled className="h-14 px-8 rounded-full gap-2 opacity-50 cursor-not-allowed">
              <Apple className="w-5 h-5" /> App Store
            </Button>
            <Button disabled className="h-14 px-8 rounded-full gap-2 opacity-50 cursor-not-allowed">
              <Play className="w-5 h-5" /> Play Store
            </Button>
          </div>

          <div className="pt-8 border-t border-border/40">
            <p className="text-sm font-medium mb-4">Want to use it on your phone today?</p>
            <div className="p-6 bg-background rounded-3xl border border-border/40 text-left space-y-4">
               <h4 className="font-bold flex items-center gap-2">
                 <Globe className="w-4 h-4 text-primary" /> 
                 Install as a PWA
               </h4>
               <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                 <li>Open <span className="text-foreground font-medium">rivly.in</span> in Safari or Chrome.</li>
                 <li>Tap the <span className="text-foreground font-medium">Share</span> or <span className="text-foreground font-medium">Menu</span> button.</li>
                 <li>Select <span className="text-foreground font-medium">"Add to Home Screen"</span>.</li>
               </ol>
            </div>
          </div>
        </div>

        <div className="text-center pt-8">
          <Link to="/">
            <Button variant="ghost" className="text-muted-foreground hover:text-foreground">
              Return to Landing Page
            </Button>
          </Link>
        </div>
      </div>
    </PageTransition>
  );
}
