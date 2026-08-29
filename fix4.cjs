const fs = require('fs');
let code = fs.readFileSync('src/components/research/AnswerView.tsx', 'utf8');

code = code.replace(/getAutoTTSEnabled\(\)/g, 'autoTTS');
code = code.replace(/const \{ displayedText: typedContent, cursorVisible \} = useSmoothTypewriter\(content, !!isStreaming\);/, 'const { autoTTS } = useChatTTS();\n  const { displayedText: typedContent, cursorVisible } = useSmoothTypewriter(content, !!isStreaming);');

fs.writeFileSync('src/components/research/AnswerView.tsx', code);
