import { apolloText } from './ApolloLocale';

/** Spoken voices are disabled globally. Subtitles and ApolloAudio remain independent. */
export class ApolloVoice {
  readonly enabled = false;
  readonly available = false;
  readonly isSpeaking = false;
  speak(_text: string, _character = 'Narrador'): void {}
  pause(_value: boolean): void {}
  stop(): void {}
  setEnabled(_value: boolean): void {}
  setVolume(_value: number): void {}
  status(): string { return apolloText('Voz desactivada · subtítulos activos'); }
  dispose(): void {}
}
