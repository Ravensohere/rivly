import { motion } from 'framer-motion';
import { FileText, ChevronLeft } from 'lucide-react';
import { PageTransition } from '@/components/ui/PageTransition';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export default function TermsOfServicePage() {
  const navigate = useNavigate();

  return (
    <PageTransition className="pb-20">
      <div className="max-w-2xl mx-auto px-6 pt-12">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => navigate(-1)} 
          className="mb-8 -ml-2 text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="w-4 h-4 mr-1" /> Back
        </Button>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8"
        >
          <div className="flex items-center gap-4 mb-2">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
              <FileText className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Terms of Service</h1>
              <p className="text-muted-foreground text-sm">Last updated: January 26, 2026</p>
            </div>
          </div>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">1. Acceptance of Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              By accessing or using Rivly, you agree to be bound by these Terms of Service and all applicable laws and regulations.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">2. Description of Service</h2>
            <p className="text-muted-foreground leading-relaxed">
              Rivly is a productivity and wellness platform that helps users organize their daily schedules using calendar integration and focus tools.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">3. User Accounts</h2>
            <p className="text-muted-foreground leading-relaxed">
              You may need to create an account via Google Authentication to access certain features. You are responsible for maintaining the confidentiality of your account information.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">4. Proper Use</h2>
            <p className="text-muted-foreground leading-relaxed">
              You agree not to use the service for any illegal or unauthorized purpose. You must not violate any laws in your jurisdiction while using Rivly.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">5. Limitation of Liability</h2>
            <p className="text-muted-foreground leading-relaxed">
              Rivly and its creators shall not be liable for any direct, indirect, incidental, or consequential damages resulting from the use or inability to use the service.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">6. Changes to Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              We reserve the right to modify these terms at any time. Your continued use of Rivly after changes are posted constitutes your acceptance of the new terms.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">7. Contact</h2>
            <p className="text-muted-foreground leading-relaxed">
              Questions about the Terms of Service should be sent to 
              <span className="text-primary ml-1">ravenso.here@gmail.com</span>.
            </p>
          </section>
        </motion.div>
      </div>
    </PageTransition>
  );
}
