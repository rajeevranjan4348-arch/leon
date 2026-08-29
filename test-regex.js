function extractSentences(text) {
  const boundaries = /[.!?\n]+(?:[\s"']|$)/g;
  let lastIndex = 0;
  let match;
  const sentences = [];
  while ((match = boundaries.exec(text)) !== null) {
    const end = match.index + match[0].length;
    sentences.push(text.slice(lastIndex, end));
    lastIndex = end;
  }
  return { sentences, processedLength: lastIndex };
}

console.log(extractSentences("Hello world. This is a sentence! And here\nis another. With some leftover"));
