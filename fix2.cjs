const fs = require('fs');
let code = fs.readFileSync('src/components/research/AnswerView.tsx', 'utf8');

// Remove handleSpeak and handleStopSpeak completely
code = code.replace(/const handleSpeak = \(\) => \{[\s\S]*?toast\.success\(`Reading aloud \$\{voiceLangMeta \? `\$\{voiceLangMeta.flag\} \$\{voiceLangMeta.name\}` : ''\}`\);\n  \};\n/g, '');
code = code.replace(/const handleStopSpeak = \(\) => \{[\s\S]*?toast\.info\('Stopped read aloud'\);\n    \}\n  \};\n/g, '');

fs.writeFileSync('src/components/research/AnswerView.tsx', code);
