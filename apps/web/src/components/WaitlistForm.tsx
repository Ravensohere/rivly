
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Sparkles } from "lucide-react";

export function WaitlistForm() {
  const [email, setEmail] = useState("");
  const [userType, setUserType] = useState("");
  const [motivation, setMotivation] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error("Please enter your email");
      return;
    }

    setLoading(true);
    try {
      // In production, this would be an absolute URL or relative if on same domain
      // Using the worker URL from .env if available, fallback to relative
      const apiUrl = import.meta.env.VITE_API_URL || "/api";
      const response = await fetch(`${apiUrl}/waitlist`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          user_type: userType,
          motivation,
          phone,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to join waitlist");
      }

      setSubmitted(true);
      toast.success("You're on the list!", {
        description: "We'll be in touch soon.",
      });
    } catch (error) {
      console.error(error);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="bg-card/40 backdrop-blur-xl border border-primary/20 p-8 rounded-[2.5rem] text-center space-y-4 animate-in fade-in zoom-in duration-500">
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <Sparkles className="w-8 h-8 text-primary" />
        </div>
        <h3 className="text-2xl font-bold tracking-tight">You're on the list!</h3>
        <p className="text-muted-foreground">
          Thanks for joining. We'll reach out to <strong>{email}</strong> within 24 hours.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 bg-card/40 backdrop-blur-xl border border-white/10 p-8 rounded-[2.5rem] shadow-2xl">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email" className="text-sm font-medium ml-1">Email <span className="text-destructive">*</span></Label>
          <Input 
            id="email"
            type="email"
            placeholder="name@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-12 bg-background/50 border-white/10 rounded-2xl focus:ring-primary focus:border-primary"
            required
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="userType" className="text-sm font-medium ml-1">I am a...</Label>
            <Select onValueChange={setUserType} value={userType}>
              <SelectTrigger id="userType" className="h-12 bg-background/50 border-white/10 rounded-2xl">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent className="rounded-2xl border-white/10 bg-background/95 backdrop-blur-md">
                <SelectItem value="Student">Student (JEE/NEET)</SelectItem>
                <SelectItem value="Professional">Working Professional</SelectItem>
                <SelectItem value="Parent">Parent</SelectItem>
                <SelectItem value="Founder">Founder/Executive</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone" className="text-sm font-medium ml-1">Phone/WhatsApp</Label>
            <Input 
              id="phone"
              type="tel"
              placeholder="+91..."
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="h-12 bg-background/50 border-white/10 rounded-2xl"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="motivation" className="text-sm font-medium ml-1">Why Rivly? (Optional)</Label>
          <Input 
            id="motivation"
            placeholder="e.g. JEE prep burnout, founder meeting overload"
            value={motivation}
            onChange={(e) => setMotivation(e.target.value)}
            className="h-12 bg-background/50 border-white/10 rounded-2xl"
          />
          <p className="text-[10px] text-muted-foreground ml-1">We prioritize users with genuine pain points matching our philosophy.</p>
        </div>
      </div>

      <Button 
        type="submit" 
        disabled={loading}
        className="w-full h-14 text-lg font-bold rounded-2xl shadow-xl shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98] bg-primary hover:bg-primary/90 text-primary-foreground"
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Joining...
          </>
        ) : (
          "Join the Waitlist"
        )}
      </Button>
    </form>
  );
}
