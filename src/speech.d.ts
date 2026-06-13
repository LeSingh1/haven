// TypeScript declarations for Web Speech API — not in DOM lib by default
interface Window {
  SpeechRecognition: typeof SpeechRecognition;
  webkitSpeechRecognition: typeof SpeechRecognition;
}
