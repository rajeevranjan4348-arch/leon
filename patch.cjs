const fs = require('fs');
let code = fs.readFileSync('src/components/research/AnswerView.tsx', 'utf8');

// Replace states
code = code.replace(/const \[isGeneratingNvidiaVoice, setIsGeneratingNvidiaVoice\] = useState\(false\);/, '');
code = code.replace(/const \[isNvidiaPlaying, setIsNvidiaPlaying\] = useState\(false\);/, '');
code = code.replace(/const \[isNvidiaMuted, setIsNvidiaMuted\] = useState\(false\);/, '');
code = code.replace(/const nvidiaAudioRef = useRef<HTMLAudioElement \| null>\(null\);/, '');

// Remove handleStopNvidiaVoice and handleNvidiaListen
code = code.replace(/const handleStopNvidiaVoice = \(\) => \{[\s\S]*?setIsNvidiaMuted\(false\);\n  \};\n/, '');
code = code.replace(/const handleNvidiaListen = async \(\) => \{[\s\S]*?console\.warn\('NVIDIA voice generation error:', err\);\n    \}\n  \};\n/, '');

// Add useStreamingTTS hook
const hookInsert = `
  const { toggle: handleStreamingListen, isSpeaking: streamingIsSpeaking, isPaused: streamingIsPaused, stop: streamingStop } = useStreamingTTS(content, !!isStreaming, getAutoTTSEnabled());
`;
code = code.replace(/(const { displayedText: typedContent, cursorVisible } = useSmoothTypewriter\(content, !!isStreaming\);)/, `$1\n${hookInsert}`);

// Also we need to import getAutoTTSEnabled
code = code.replace(/import { speakTextWithPersona } from '@\/lib\/voiceService';/, `import { speakTextWithPersona, getAutoTTSEnabled } from '@/lib/voiceService';`);

// Find the speaker button and replace
// onClick={handleNvidiaListen} -> onClick={handleStreamingListen}
code = code.replace(/onClick=\{handleNvidiaListen\}/, 'onClick={handleStreamingListen}');
code = code.replace(/disabled=\{isGeneratingNvidiaVoice && !isNvidiaPlaying\}/, 'disabled={false}');
code = code.replace(/isNvidiaPlaying && !isNvidiaMuted && !isPaused/g, 'streamingIsSpeaking && !streamingIsPaused');
code = code.replace(/isNvidiaPlaying && isNvidiaMuted/g, 'false'); // No muted state anymore
code = code.replace(/isGeneratingNvidiaVoice/g, 'false');
code = code.replace(/isNvidiaPlaying\s*\?\s*isNvidiaMuted/g, 'streamingIsSpeaking ? false');
code = code.replace(/isNvidiaPlaying/g, 'streamingIsSpeaking');
code = code.replace(/isNvidiaMuted/g, 'false');

// Stop Audio button if playing
// {(isNvidiaPlaying || isSpeaking) && ( -> {(streamingIsSpeaking) && (
code = code.replace(/\{\(isNvidiaPlaying \|\| isSpeaking\) && \(/, '{(streamingIsSpeaking) && (');
code = code.replace(/handleStopNvidiaVoice\(\);\n\s*handleStopSpeak\(\);/g, 'streamingStop();');

// Delete handleStopSpeak if not used elsewhere, or just keep it
// Wait, isSpeaking from AnswerView's own state?
// Let's replace 'isSpeaking' usage from the old AnswerView with streamingIsSpeaking
code = code.replace(/const \[isSpeaking, setIsSpeaking\] = useState\(false\);/, '');
code = code.replace(/const \[isPaused, setIsPaused\] = useState\(false\);/, '');

// But AnswerView has other usages of isSpeaking, isPaused?
// Let's replace them carefully where it matters. 
// "isPaused" is used in VoiceStateIcon
code = code.replace(/isPaused/g, 'streamingIsPaused');

fs.writeFileSync('src/components/research/AnswerView.tsx', code);
