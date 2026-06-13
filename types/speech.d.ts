// Full Web Speech API type declarations for TypeScript
// (SpeechRecognition is in lib.dom.d.ts since TS 4.4, but Next.js strict check
//  sometimes misses it — these declarations ensure it's always available.)

interface SpeechRecognitionEventMap {
  audioend: Event;
  audiostart: Event;
  end: Event;
  error: SpeechRecognitionErrorEvent;
  nomatch: SpeechRecognitionEvent;
  result: SpeechRecognitionEvent;
  soundend: Event;
  soundstart: Event;
  speechend: Event;
  speechstart: Event;
  start: Event;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  grammars: SpeechGrammarList;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  abort(): void;
  start(): void;
  stop(): void;
  addEventListener<K extends keyof SpeechRecognitionEventMap>(
    type: K,
    listener: (this: SpeechRecognition, ev: SpeechRecognitionEventMap[K]) => unknown,
    options?: boolean | AddEventListenerOptions,
  ): void;
  addEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions): void;
  removeEventListener<K extends keyof SpeechRecognitionEventMap>(
    type: K,
    listener: (this: SpeechRecognition, ev: SpeechRecognitionEventMap[K]) => unknown,
    options?: boolean | EventListenerOptions,
  ): void;
  removeEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | EventListenerOptions): void;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => unknown) | null;
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => unknown) | null;
  onend: ((this: SpeechRecognition, ev: Event) => unknown) | null;
  onstart: ((this: SpeechRecognition, ev: Event) => unknown) | null;
}

declare var SpeechRecognition: {
  prototype: SpeechRecognition;
  new (): SpeechRecognition;
};

interface SpeechRecognitionResultList {
  readonly length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  readonly isFinal: boolean;
  readonly length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  readonly confidence: number;
  readonly transcript: string;
}

interface SpeechRecognitionEvent extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultList;
}

type SpeechRecognitionErrorCode =
  | 'aborted'
  | 'audio-capture'
  | 'bad-grammar'
  | 'language-not-supported'
  | 'network'
  | 'no-speech'
  | 'not-allowed'
  | 'service-not-allowed';

interface SpeechRecognitionErrorEvent extends Event {
  readonly error: SpeechRecognitionErrorCode;
  readonly message: string;
}

interface SpeechGrammar {
  src: string;
  weight: number;
}

interface SpeechGrammarList {
  readonly length: number;
  addFromString(string: string, weight?: number): void;
  addFromURI(src: string, weight?: number): void;
  item(index: number): SpeechGrammar;
  [index: number]: SpeechGrammar;
}

// Vendor-prefixed version (Chrome)
interface Window {
  webkitSpeechRecognition: typeof SpeechRecognition;
}
