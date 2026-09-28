// Detects greetings and pleasantries so the assistant does not attach random
// knowledge sources to a message like "hi how are you".

const SMALL_TALK_VOCAB = new Set([
  // English greetings / pleasantries
  "hi", "hii", "hiya", "hello", "helo", "hey", "yo", "hola", "sup", "salam", "salaam",
  "assalamualaikum", "assalamualaykum", "wassalam", "wasalam",
  "good", "morning", "afternoon", "evening", "night", "day",
  "how", "are", "you", "u", "ur", "your", "yourself", "doing", "going",
  "what", "whats", "is", "am", "im", "i", "me", "my",
  "the", "there", "here",
  "fine", "well", "great", "nice", "cool", "ok", "okay", "k", "alright",
  "thanks", "thank", "thankyou", "thx", "tq", "please", "pls", "welcome",
  "yes", "no", "yeah", "yup", "nope",
  "test", "testing", "check", "ping", "can", "could", "would", "help",
  // Malay greetings / pleasantries
  "apa", "khabar", "kabar", "terima", "kasih", "selamat", "pagi", "tengahari",
  "petang", "malam", "siang", "hai", "ya", "tak", "tidak", "baik", "saya",
]);

/**
 * True when a message carries no real question — e.g. a greeting, thanks, or a
 * bare "test". Conservative: any unknown word makes it a real question.
 */
export function isSmallTalk(message: string): boolean {
  const normalized = message
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (normalized.length < 2) return true;

  const words = normalized.split(" ");
  if (words.length > 8) return false;

  return words.every((word) => SMALL_TALK_VOCAB.has(word));
}
