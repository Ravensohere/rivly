/**
 * rivaLanguage.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Riva language configuration and response maps for English, Hindi, and Hinglish.
 * 
 * Language Codes:
 * - English: en-IN (Indian English)
 * - Hindi: hi-IN (Devanagari script)
 * - Hinglish: hi-IN (Latin script, Hindi grammar + English words)
 */

// ── Types ─────────────────────────────────────────────────────────────────────

export type RivaLanguage = 'english' | 'hindi' | 'hinglish';
export type LanguageCode = 'en-IN' | 'hi-IN';

export interface RivaResponseMap {
  greeting: string;
  goodMorning: string;
  goodAfternoon: string;
  goodEvening: string;
  goodNight: string;
  taskAdded: string;
  taskCompleted: string;
  taskDeleted: string;
  planCreated: string;
  planReady: string;
  focusStarted: string;
  focusStopped: string;
  focusCompleted: string;
  checkInDone: string;
  howAreYou: string;
  feelingGood: string;
  feelingBad: string;
  needHelp: string;
  motivation: string;
  breakReminder: string;
  waterReminder: string;
  standUpReminder: string;
  breathingReminder: string;
  wellDone: string;
  keepGoing: string;
  greatJob: string;
  perfect: string;
  understanding: string;
  sorry: string;
  didntUnderstand: string;
  tryAgain: string;
  goodnight: string;
  sweetDreams: string;
  wakeUp: string;
  morningEnergy: string;
  dayPlanning: string;
  eveningReflection: string;
  weeklyReview: string;
  monthlyReview: string;
  goalSet: string;
  goalCompleted: string;
  streakStarted: string;
  streakEnded: string;
  newRecord: string;
  proTip: string;
  upgradePrompt: string;
  creditsLow: string;
  creditsAdded: string;
  subscriptionActive: string;
  subscriptionExpired: string;
  welcomeBack: string;
  firstTime: string;
  onboardingComplete: string;
  tutorialSkipped: string;
  settingsSaved: string;
  profileUpdated: string;
  dataExported: string;
  dataDeleted: string;
  syncComplete: string;
  syncError: string;
  offlineMode: string;
  onlineMode: string;
  featureLocked: string;
  featureUnlocked: string;
}

// ── Response Maps ─────────────────────────────────────────────────────────────

export const RIVA_RESPONSES: Record<RivaLanguage, RivaResponseMap> = {
  english: {
    greeting: "Hello! How can I help you today?",
    goodMorning: "Good morning! How are you feeling today?",
    goodAfternoon: "Good afternoon! Hope your day is going well.",
    goodEvening: "Good evening! Time to wind down.",
    goodNight: "Good night! Sleep well and dream big.",
    taskAdded: "Got it! Task added.",
    taskCompleted: "Nice! Task completed. Great progress!",
    taskDeleted: "Task removed.",
    planCreated: "Your plan is ready. Let's make today count!",
    planReady: "Your daily plan is ready. You've got this!",
    focusStarted: "Focus session started. Let's get into flow!",
    focusStopped: "Focus session paused. Ready when you are.",
    focusCompleted: "Focus session complete! Well done!",
    checkInDone: "Check-in recorded. Thanks for sharing!",
    howAreYou: "How are you feeling right now?",
    feelingGood: "That's wonderful to hear! Keep that energy going.",
    feelingBad: "I hear you. It's okay to have tough days. Want to talk about it?",
    needHelp: "I'm here to help. What do you need?",
    motivation: "You're doing great! Every small step counts.",
    breakReminder: "Time for a quick break. Your brain will thank you!",
    waterReminder: "Don't forget to drink water. Stay hydrated!",
    standUpReminder: "You've been sitting for a while. Time to stretch!",
    breathingReminder: "Let's take 3 deep breaths together. Ready?",
    wellDone: "Well done! You're making great progress.",
    keepGoing: "Keep going! You're closer than you think.",
    greatJob: "Great job! I'm proud of you.",
    perfect: "Perfect! That's exactly what I was looking for.",
    understanding: "I understand. Let me help you with that.",
    sorry: "I'm sorry about that. Let's figure this out together.",
    didntUnderstand: "I didn't quite catch that. Could you say it again?",
    tryAgain: "Let's try that again. Take your time.",
    goodnight: "Good night! Time to rest and recharge.",
    sweetDreams: "Sweet dreams! Tomorrow is a fresh start.",
    wakeUp: "Good morning! Time to wake up and shine!",
    morningEnergy: "Rise and shine! Let's make today amazing.",
    dayPlanning: "Let's plan your day. What's most important?",
    eveningReflection: "Time for evening reflection. How did today go?",
    weeklyReview: "Weekly review time! What went well this week?",
    monthlyReview: "Monthly review! Look how far you've come.",
    goalSet: "Goal set! I'll help you stay on track.",
    goalCompleted: "Goal completed! Celebrate this win!",
    streakStarted: "New streak started! Keep it going!",
    streakEnded: "Streak ended. No worries, start fresh tomorrow!",
    newRecord: "New personal record! You're crushing it!",
    proTip: "Pro tip: Consistency beats intensity every time.",
    upgradePrompt: "Want more features? Upgrade to Pro for unlimited access.",
    creditsLow: "Running low on credits. Consider a top-up.",
    creditsAdded: "Credits added! You're all set.",
    subscriptionActive: "Your Pro subscription is active. Enjoy!",
    subscriptionExpired: "Your subscription has expired. Renew to continue.",
    welcomeBack: "Welcome back! Ready to continue?",
    firstTime: "First time here? Let me show you around!",
    onboardingComplete: "Onboarding complete! You're ready to go.",
    tutorialSkipped: "No worries! You can always access the tutorial later.",
    settingsSaved: "Settings saved successfully!",
    profileUpdated: "Profile updated!",
    dataExported: "Data exported. Check your downloads.",
    dataDeleted: "Data deleted. This action cannot be undone.",
    syncComplete: "Sync complete! All your data is up to date.",
    syncError: "Sync error. Please check your connection.",
    offlineMode: "You're in offline mode. Some features may be limited.",
    onlineMode: "Back online! All features available.",
    featureLocked: "This feature is available in Pro. Want to upgrade?",
    featureUnlocked: "Feature unlocked! Enjoy Pro access.",
  },

  hindi: {
    greeting: "Namaste! Main aaj aapki kaise madad kar sakti hoon?",
    goodMorning: "Shubh Prabhat! Aaj aap kaisa mehsoos kar rahe hain?",
    goodAfternoon: "Shubh Dopahar! Umeed hai aapka din accha chal raha hai.",
    goodEvening: "Shubh Sandhya! Aaram karne ka samay ho gaya hai.",
    goodNight: "Shubh Ratri! Acchi neend soyein aur bade sapne dekhein.",
    taskAdded: "Bilkul! Task add kar diya.",
    taskCompleted: "Bahut accha! Task pura ho gaya. Badhiya pragati!",
    taskDeleted: "Task hata diya gaya.",
    planCreated: "Aapka plan taiyaar hai. Aaj ka din behtareen banate hain!",
    planReady: "Aapki daily plan ready hai. Aap kar sakte hain!",
    focusStarted: "Focus session shuru. Chaliye flow mein chalte hain!",
    focusStopped: "Focus session roka gaya. Jab taiyaar ho tab shuru karein.",
    focusCompleted: "Focus session pura! Bahut accha kiya!",
    checkInDone: "Check-in record kar liya. Share karne ke liye shukriya!",
    howAreYou: "Aap abhi kaisa mehsoos kar rahe hain?",
    feelingGood: "Yeh sun kar accha laga! Is energy ko banaye rakhein.",
    feelingBad: "Main samajh sakti hoon. Mushkil din hote hain. Is baare mein baat karna chahenge?",
    needHelp: "Main madad ke liye yahan hoon. Aapko kya chahiye?",
    motivation: "Aap bahut accha kar rahe hain! Har chhota kadam mayne rakhta hai.",
    breakReminder: "Chhota break lene ka samay. Aapka dimaag shukriya adaa karega!",
    waterReminder: "Paani peena na bhoolen. Hydrated rahein!",
    standUpReminder: "Aap kaafi der se baithe hain. Stretch kar lein!",
    breathingReminder: "Chaliye saath mein 3 gehri saansein lein. Taiyaar?",
    wellDone: "Bahut accha! Aap bahut acchi pragati kar rahe hain.",
    keepGoing: "Jaari rakhein! Aap soch se zyada kareeb hain.",
    greatJob: "Bahut badhiya! Mujhe aap par garv hai.",
    perfect: "Bilkul sahi! Yeh wahi hai jo main dhoond rahi thi.",
    understanding: "Main samajh gayi. Chaliye isme aapki madad karti hoon.",
    sorry: "Mujhe afsos hai. Chaliye ise saath mein suljhate hain.",
    didntUnderstand: "Main theek se samajh nahi payi. Kya aap dobara kahenge?",
    tryAgain: "Chaliye phir se koshish karte hain. Aaram se lein.",
    goodnight: "Shubh ratri! Aaram aur recharge karne ka samay.",
    sweetDreams: "Pyare sapne! Kal ek nayi shuruat hai.",
    wakeUp: "Shubh prabhat! Jagne aur chamakne ka samay!",
    morningEnergy: "Utho aur chamko! Chaliye aaj ko amazing banate hain.",
    dayPlanning: "Chaliye aaj ki yojana banate hain. Sabse zaroori kya hai?",
    eveningReflection: "Shaam ki chintan ka samay. Aaj kaisa raha?",
    weeklyReview: "Saaptahik samiksha! Is hafte kya accha raha?",
    monthlyReview: "Maasik samiksha! Dekhein aap kitna aage badhe hain.",
    goalSet: "Goal set! Main aapko track par rehne mein madad karungi.",
    goalCompleted: "Goal pura! Is jeet ka jashn manayein!",
    streakStarted: "Nayi streak shuru! Jaari rakhein!",
    streakEnded: "Streak khatam. Koi baat nahi, kal naye sire se shuru karein!",
    newRecord: "Naya personal record! Aap dhamaka kar rahe hain!",
    proTip: "Pro tip: Lagataar intensity se behtar hai.",
    upgradePrompt: "Aur features chahiye? Unlimited access ke liye Pro mein upgrade karein.",
    creditsLow: "Credits kam ho rahe hain. Top-up par vichar karein.",
    creditsAdded: "Credits add ho gaye! Aap taiyaar hain.",
    subscriptionActive: "Aapka Pro subscription sakriya hai. Aanand lein!",
    subscriptionExpired: "Aapka subscription samapt ho gaya hai. Jaari rakhne ke liye navikaran karein.",
    welcomeBack: "Wapas swagat hai! Jaari rakhne ke liye taiyaar?",
    firstTime: "Pehli baar yahan? Chaliye main aapko dikhati hoon!",
    onboardingComplete: "Onboarding pura! Aap jaane ke liye taiyaar hain.",
    tutorialSkipped: "Koi baat nahi! Aap baad mein bhi tutorial access kar sakte hain.",
    settingsSaved: "Settings safalata se save ho gaye!",
    profileUpdated: "Profile update ho gaya!",
    dataExported: "Data export ho gaya. Apne downloads check karein.",
    dataDeleted: "Data delete ho gaya. Yeh action wapas nahi ho sakta.",
    syncComplete: "Sync pura! Aapka saara data update hai.",
    syncError: "Sync error. Kripya apna connection check karein.",
    offlineMode: "Aap offline mode mein hain. Kuch features seemit ho sakte hain.",
    onlineMode: "Wapas online! Saare features uplabdh hain.",
    featureLocked: "Yeh feature Pro mein uplabdh hai. Upgrade karna chahenge?",
    featureUnlocked: "Feature unlock ho gaya! Pro access ka aanand lein.",
  },

  hinglish: {
    greeting: "Hello! Aaj main aapki kaise help kar sakti hoon?",
    goodMorning: "Good morning! Aaj kaisa feel kar rahe ho?",
    goodAfternoon: "Good afternoon! Umeed hai din accha chal raha hai.",
    goodEvening: "Good evening! Wind down karne ka time ho gaya hai.",
    goodNight: "Good night! Acchi neend lo aur bade sapne dekho.",
    taskAdded: "Done! Task add ho gaya.",
    taskCompleted: "Nice! Task complete ho gaya. Great progress!",
    taskDeleted: "Task remove ho gaya.",
    planCreated: "Your plan ready hai. Let's crush it today!",
    planReady: "Aapki daily plan ready hai. You've got this!",
    focusStarted: "Focus session start ho gaya. Let's get into flow!",
    focusStopped: "Focus session pause ho gaya. Jab ready ho tab start karna.",
    focusCompleted: "Focus session complete! Well done!",
    checkInDone: "Check-in record ho gaya. Thanks for sharing!",
    howAreYou: "Abhi kaisa feel kar rahe ho?",
    feelingGood: "Yeh sun kar accha laga! Is energy ko maintain rakho.",
    feelingBad: "Main samajh sakti hoon. Tough days hote hain. Is baare mein baat karna chahoge?",
    needHelp: "Main help ke liye yahan hoon. Kya chahiye?",
    motivation: "You're doing great! Har chhota step matter karta hai.",
    breakReminder: "Quick break lene ka time. Your brain will thank you!",
    waterReminder: "Paani peena mat bhoolna. Stay hydrated!",
    standUpReminder: "Kaafi der se baithe ho. Time to stretch!",
    breathingReminder: "Chalo saath mein 3 deep breaths lete hain. Ready?",
    wellDone: "Well done! Bahut acchi progress kar rahe ho.",
    keepGoing: "Keep going! You're closer than you think.",
    greatJob: "Great job! Proud of you.",
    perfect: "Perfect! Bilkul wahi jo main dhoond rahi thi.",
    understanding: "Samajh gayi. Chalo isme help karti hoon.",
    sorry: "Sorry about that. Chalo ise saath mein solve karte hain.",
    didntUnderstand: "Theek se samajh nahi aaya. Dobara bolenge?",
    tryAgain: "Chalo phir se try karte hain. Take your time.",
    goodnight: "Good night! Rest aur recharge karne ka time.",
    sweetDreams: "Sweet dreams! Kal ek fresh start hai.",
    wakeUp: "Good morning! Wake up aur shine karne ka time!",
    morningEnergy: "Rise and shine! Chalo aaj ko amazing banate hain.",
    dayPlanning: "Chalo aaj ki plan banate hain. Sabse important kya hai?",
    eveningReflection: "Evening reflection time. Aaj kaisa gaya?",
    weeklyReview: "Weekly review time! Is week kya accha raha?",
    monthlyReview: "Monthly review! Dekho kitna aage aa gaye ho.",
    goalSet: "Goal set! Main track par rehne mein help karungi.",
    goalCompleted: "Goal complete! Is win ko celebrate karo!",
    streakStarted: "New streak start! Keep it going!",
    streakEnded: "Streak ended. No worries, kal fresh start karo!",
    newRecord: "New personal record! You're crushing it!",
    proTip: "Pro tip: Consistency intensity se behtar hai.",
    upgradePrompt: "Aur features chahiye? Unlimited access ke liye Pro lo.",
    creditsLow: "Credits kam ho rahe hain. Top-up kar lo.",
    creditsAdded: "Credits add ho gaye! All set ho.",
    subscriptionActive: "Pro subscription active hai. Enjoy!",
    subscriptionExpired: "Subscription expire ho gaya. Renew karke continue karo.",
    welcomeBack: "Welcome back! Continue karne ke liye ready?",
    firstTime: "Pehli baar yahan? Chalo dikhati hoon!",
    onboardingComplete: "Onboarding complete! Ready to go.",
    tutorialSkipped: "No worries! Baad mein bhi tutorial dekh sakte ho.",
    settingsSaved: "Settings save ho gaye!",
    profileUpdated: "Profile update ho gaya!",
    dataExported: "Data export ho gaya. Downloads check karo.",
    dataDeleted: "Data delete ho gaya. Yeh action undo nahi ho sakta.",
    syncComplete: "Sync complete! Saara data up to date hai.",
    syncError: "Sync error. Connection check karo.",
    offlineMode: "Offline mode mein ho. Kuch features limited honge.",
    onlineMode: "Back online! Saare features available hain.",
    featureLocked: "Yeh feature Pro mein hai. Upgrade karoge?",
    featureUnlocked: "Feature unlock! Pro access enjoy karo.",
  },
};

// ── Helper Functions ──────────────────────────────────────────────────────────

/**
 * Get response text for a given key and language
 */
export function getRivaResponse(
  key: keyof RivaResponseMap,
  language: RivaLanguage = 'english'
): string {
  return RIVA_RESPONSES[language][key] || RIVA_RESPONSES.english[key];
}

/**
 * Get language code for TTS/STT
 */
export function getLanguageCode(language: RivaLanguage): LanguageCode {
  switch (language) {
    case 'hindi':
    case 'hinglish':
      return 'hi-IN';
    case 'english':
    default:
      return 'en-IN';
  }
}

/**
 * Get all available languages
 */
export function getAvailableLanguages(): { id: RivaLanguage; name: string; code: LanguageCode }[] {
  return [
    { id: 'english', name: 'English', code: 'en-IN' },
    { id: 'hindi', name: 'हिंदी (Hindi)', code: 'hi-IN' },
    { id: 'hinglish', name: 'Hinglish', code: 'hi-IN' },
  ];
}

/**
 * Detect language from user input (simple heuristic)
 */
export function detectLanguage(text: string): RivaLanguage {
  const lower = text.toLowerCase();
  
  // Hindi script detection (Devanagari)
  if (/[\u0900-\u097F]/.test(text)) {
    return 'hindi';
  }
  
  // Hinglish keywords (Hindi words in Latin script)
  const hinglishKeywords = [
    'kaise', 'kya', 'kahan', 'kab', 'kyun', 'kaisa', 'meri', 'teri',
    'hai', 'ho', 'hain', 'tha', 'thi', 'the', 'kar', 'karna',
    'mera', 'tera', 'uska', 'iska', 'usne', 'maine',
    'accha', 'nahi', 'haan', 'ji', 'arre', 'yaar', 'bhai', 'did',
  ];
  
  const hinglishCount = hinglishKeywords.filter(word => lower.includes(word)).length;
  
  if (hinglishCount >= 2) {
    return 'hinglish';
  }
  
  // Default to English
  return 'english';
}
