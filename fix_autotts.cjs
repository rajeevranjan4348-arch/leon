const fs = require('fs');
let code = fs.readFileSync('src/lib/voiceService.ts', 'utf8');

// Change getAutoTTSEnabled default to true if null
code = code.replace(/const saved = localStorage\.getItem\(STORAGE_KEY_AUTO_TTS\);\n\s*return saved === 'true';/, "const saved = localStorage.getItem(STORAGE_KEY_AUTO_TTS);\n    if (saved === null) return true;\n    return saved === 'true';");

fs.writeFileSync('src/lib/voiceService.ts', code);
