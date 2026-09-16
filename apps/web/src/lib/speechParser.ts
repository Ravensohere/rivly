/**
 * Extracts individual task items from a continuous speech string,
 * supporting natural English and Hindi/Hinglish conjunctions.
 */
export function extractTasksFromSpeech(text: string): string[] {
    const lower = text.toLowerCase();
    
    // 1. Remove introductory/filler conversational cruft at the START of the sentence recursively
    // Regex matches the start of the string repeatedly for any of these words followed by spaces
    let cleanedText = lower;
    const openerRegex = /^(okay|ok|sure|yes|yeah|yeah sure|i will|i'll|i need to|i have to|please|hey riva|add|create|make)\s+/i;
    while (openerRegex.test(cleanedText)) {
      cleanedText = cleanedText.replace(openerRegex, '');
    }
  
    // 2. Normalize all conjunctions to a single split token '|||'
    // Handles English: and, then, also, comma, first/then/finally pattern
    // Handles Hindi: aur (and), phir (then), ke baad (after that)
    // Removed 'bhi' as a delimiter because it's often used as 'also' attached to a noun (e.g. 'report bhi')
    // Handle "first X then Y finally Z" pattern
    cleanedText = cleanedText.replace(/\bfirst\b/gi, '|||');
    cleanedText = cleanedText.replace(/\bfinally\b/gi, '|||');
    cleanedText = cleanedText.replace(/\bafter that\b/gi, '|||');
    const splitPattern = /,|\b(and|then|also|aur|phir|ke baad)\b/g;
    cleanedText = cleanedText.replace(splitPattern, '|||');
  
    // 3. Split the string into raw task segments
    const rawSegments = cleanedText.split('|||');
  
    // 4. Clean each segment
    const validTasks = rawSegments
      .map(segment => {
        let task = segment.trim();
        
        // Strip trailing/leading verb modifiers common in Hindi/English task strings
        // e.g., "notes banana hai" -> "notes", "do laundry please" -> "laundry"
        // Preserve numbers (e.g., "buy 2 liters milk") and parenthetical notes (e.g., "call doctor (about headache)")
        task = task
          .replace(/\b(hai|karna|banana|chahiye|please|ok|to|do|bhi)\b/gi, ' ')
          .replace(/\.$/, '') // remove trailing periods
          .replace(/\s+/g, ' ') // normalize spaces
          .trim();
          
        return task;
      })
      // 5. Filter out empty or very short segments (less than 2 words/chars usually junk)
      .filter(task => {
        if (!task || task.length < 2) return false;
        if (task.match(/^(no|none|nothing|that's it|that's all|that is all)$/i)) return false;

        // Ensure it's at least 2 words, or a single word that's long enough, or contains a number
        const wordCount = task.split(/\s+/).length;
        return wordCount >= 2 || task.length > 4 || /\d/.test(task);
      });
  
    return validTasks;
}
