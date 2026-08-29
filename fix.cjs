const fs = require('fs');
let code = fs.readFileSync('src/components/research/AnswerView.tsx', 'utf8');

code = code.replace(/streamingIsPaused: streamingIsPaused/, 'isPaused: streamingIsPaused');
code = code.replace(/\(streamingIsSpeaking \|\| isSpeaking\)/, '(streamingIsSpeaking)');

fs.writeFileSync('src/components/research/AnswerView.tsx', code);
