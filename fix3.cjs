const fs = require('fs');
let code = fs.readFileSync('src/hooks/useStreamingTTS.ts', 'utf8');

code = code.replace(/export function useStreamingTTS\(content: string, isStreaming: boolean, autoPlayEnabled: boolean\) \{/, 'export function useStreamingTTS(content: string, isStreaming: boolean, autoPlayEnabled: boolean, voiceURI?: string, rate?: number, pitch?: number) {');

code = code.replace(/speak\(nextSentence, \{/, 'speak(nextSentence, {\n      voiceURI,\n      rate,\n      pitch,');

fs.writeFileSync('src/hooks/useStreamingTTS.ts', code);

let code2 = fs.readFileSync('src/components/research/AnswerView.tsx', 'utf8');
code2 = code2.replace(/useStreamingTTS\(content, !!isStreaming, getAutoTTSEnabled\(\)\)/, 'useStreamingTTS(content, !!isStreaming, getAutoTTSEnabled(), selectedVoiceURI, speechRate, speechPitch)');
fs.writeFileSync('src/components/research/AnswerView.tsx', code2);
