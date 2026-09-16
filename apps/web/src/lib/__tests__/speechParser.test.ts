import { extractTasksFromSpeech } from '../speechParser';

describe('extractTasksFromSpeech', () => {

  it('correctly splits English conjunctions', () => {
    const input = "Call mom and buy groceries then submit report";
    const expected = ["call mom", "buy groceries", "submit report"];
    
    expect(extractTasksFromSpeech(input)).toEqual(expected);
  });

  it('correctly splits Hinglish and strips verb modifiers', () => {
    const input = "Meeting notes banana aur report bhi complete karna";
    // "banana", "aur", "bhi", "karna" stripped
    const expected = ["meeting notes", "report complete"];
    
    expect(extractTasksFromSpeech(input)).toEqual(expected);
  });

  it('returns single task properly without splitting', () => {
    const input = "Do laundry";
    const expected = ["laundry"]; // 'do' is stripped as a filler
    
    expect(extractTasksFromSpeech(input)).toEqual(expected);
  });

  it('filters out words that are too short like "ok"', () => {
    const input = "ok";
    const expected: string[] = [];
    
    expect(extractTasksFromSpeech(input)).toEqual(expected);
  });

  it('handles heavily mixed Hindi/English with varying modifiers', () => {
    const input = "Kal ka presentation prepare karna hai aur slides bhi";
    const expected = ["kal ka presentation prepare", "slides"];
    // kal ka presentation prepare (karna hai removed), slides (bhi removed)
    
    expect(extractTasksFromSpeech(input)).toEqual(expected);
  });

  it('strips conversation openers successfully', () => {
    const input = "hey riva okay add task email john and get coffee";
    const expected = ["task email john", "get coffee"];
    
    expect(extractTasksFromSpeech(input)).toEqual(expected);
  });

  it('removes trailing punctuation', () => {
    const input = "clean the kitchen, and wash the car.";
    const expected = ["clean the kitchen", "wash the car"];
    
    expect(extractTasksFromSpeech(input)).toEqual(expected);
  });
  
  it('filters out negative user confirmation answers', () => {
     const assertions = [
        "none", "nothing", "that's it", "that is all"
     ];
     
     assertions.forEach(input => {
         expect(extractTasksFromSpeech(input)).toEqual([]);
     });
  });
});
