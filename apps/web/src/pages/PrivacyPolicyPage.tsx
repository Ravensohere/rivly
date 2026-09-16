import { motion } from 'framer-motion';
import { Shield, ChevronLeft } from 'lucide-react';
import { PageTransition } from '@/components/ui/PageTransition';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export default function PrivacyPolicyPage() {
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
              <Shield className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Privacy Policy</h1>
              <p className="text-muted-foreground text-sm">Last updated: January 26, 2026</p>
            </div>
          </div>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">1. Information We Collect</h2>
            <p className="text-muted-foreground leading-relaxed">
              Rivly collects information to provide a better experience to all our users. This includes:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li><strong>Profile Information:</strong> Name and email address provided during Google Sign-In.</li>
              <li><strong>Google Calendar Data:</strong> If you connect your calendar, we access your calendar events and metadata to display them within the app.</li>
              <li><strong>App Preferences:</strong> Your customized settings, such as theme and notification preferences.</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">2. How We Use Information</h2>
            <p className="text-muted-foreground leading-relaxed">
              We use the collected information to:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li>Provide and maintain the Rivly services.</li>
              <li>Display your Google Calendar events to help you plan your day.</li>
              <li>Personalize your experience with greetings and reminders.</li>
              <li>Improve app performance and functionality.</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">3. Google API Disclosure</h2>
            <p className="text-muted-foreground leading-relaxed">
              Rivly's use and transfer to any other app of information received from Google APIs will adhere to 
              <a href="https://developers.google.com/terms/api-services-user-data-policy#additional_requirements_for_specific_api_scopes" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline ml-1">
                Google API Service User Data Policy
              </a>, including the Limited Use requirements.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              We do not store your calendar events on our servers. The data is fetched directly from Google APIs and displayed locally in your browser/app.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">4. Data Security</h2>
            <p className="text-muted-foreground leading-relaxed">
              We use industry-standard security measures to protect your data. Your profile and preferences are stored securely using Supabase. We never sell your personal data to third parties.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">5. Contact Us</h2>
            <p className="text-muted-foreground leading-relaxed">
              If you have any questions about this Privacy Policy, please contact us at 
              <span className="text-primary ml-1">ravenso.here@gmail.com</span>.
            </p>
          </section>
        </motion.div>
      </div>
    </PageTransition>
  );
}
