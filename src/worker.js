import kuromoji from 'kuromoji';
import { extractRawText } from 'mammoth';

const DIC_URL = '/kuromoji/';
let tokenizer = null;

const initializeTokenizer = () => {
  return new Promise((resolve, reject) => {
    if (tokenizer) return resolve(tokenizer);
    kuromoji.builder({ dicPath: DIC_URL }).build((err, builtTokenizer) => {
      if (err) return reject(err);
      tokenizer = builtTokenizer;
      resolve(tokenizer);
    });
  });
};

const getDisplayCategory = (token) => {
  if (token.pos === '名詞' && token.pos_detail_1 === '固有名詞') {
    if (token.pos_detail_2 === '人名') {
      return '人名';
    }
    return '固有名詞';
  }
  return token.pos;
};

self.onmessage = async (e) => {
  const { type, file } = e.data;

  try {
    switch (type) {
      case 'INIT': {
        await initializeTokenizer();
        self.postMessage({ type: 'INIT_SUCCESS' });
        break;
      }
      case 'PROCESS': {
        if (!tokenizer) throw new Error('Tokenizer is not initialized.');

        let text = '';
        if (file.type === 'text/plain') {
          text = await file.text();
        } else if (file.name.endsWith('.docx')) {
          const arrayBuffer = await file.arrayBuffer();
          const result = await extractRawText({ arrayBuffer });
          text = result.value;
        } else {
          throw new Error('サポートされていないファイル形式です。');
        }
        
        const sentencesWithMeta = [];
        const terminators = /[。？！]|\n/g;
        let lastIndex = 0;
        let match;
        
        const lineEndPositions = [];
        text.split('\n').forEach((line, index) => {
          const lastEnd = lineEndPositions.length > 0 ? lineEndPositions[lineEndPositions.length - 1].end : -1;
          lineEndPositions.push({ line: index + 1, end: lastEnd + line.length + 1 });
        });

        const getLineNumber = (charPos) => {
          const lineInfo = lineEndPositions.find(l => charPos <= l.end);
          return lineInfo ? lineInfo.line : lineEndPositions.length;
        };

        while ((match = terminators.exec(text)) !== null) {
          const sentenceText = text.substring(lastIndex, match.index + match[0].length);
          if (sentenceText.trim()) {
            sentencesWithMeta.push({ text: sentenceText, lineNum: getLineNumber(lastIndex) });
          }
          lastIndex = match.index + match[0].length;
        }
        if (lastIndex < text.length) {
          const lastSentence = text.substring(lastIndex);
          if (lastSentence.trim()) {
            sentencesWithMeta.push({ text: lastSentence, lineNum: getLineNumber(lastIndex) });
          }
        }

        const wordsByReading = {};
        sentencesWithMeta.forEach((sentence, sentenceIndex) => {
          const tokens = tokenizer.tokenize(sentence.text);

          tokens.forEach(token => {
            if (!token.reading || ['助詞', '助動詞', '接続詞', '連体詞'].includes(token.pos)) {
              return;
            }
            const { reading, surface_form, basic_form } = token;

            if (!wordsByReading[reading]) {
              wordsByReading[reading] = { totalCount: 0, variants: {}, sentenceIndices: new Set() };
            }
            if (!wordsByReading[reading].variants[surface_form]) {
              wordsByReading[reading].variants[surface_form] = { count: 0, pos: getDisplayCategory(token), basic_form };
            }

            wordsByReading[reading].variants[surface_form].count++;
            wordsByReading[reading].totalCount++;
            wordsByReading[reading].sentenceIndices.add(sentenceIndex);
          });
        });

        const groupedByPos = {};
        const sentenceMap = {};

        Object.entries(wordsByReading).forEach(([reading, group]) => {
            if (group.totalCount <= 1 && Object.keys(group.variants).length <= 1) return;
            
            const sortedVariants = Object.entries(group.variants)
                .map(([word, data]) => ({ word, ...data }))
                .sort((a, b) => b.count - a.count);

            const representativeVariant = sortedVariants[0];
            const pos = representativeVariant.pos;
            
            if (!groupedByPos[pos]) groupedByPos[pos] = [];
            
            groupedByPos[pos].push({
                reading: reading,
                primaryWord: representativeVariant.word,
                totalCount: group.totalCount,
                variants: sortedVariants.map(({word, count}) => ({word, count})),
            });
            sentenceMap[reading] = Array.from(group.sentenceIndices);
        });
        
        const sortedFinalGroupedTokens = {};
        Object.keys(groupedByPos).sort((a, b) => a.localeCompare(b, 'ja')).forEach(pos => {
            groupedByPos[pos].sort((a, b) => a.reading.localeCompare(b.reading, 'ja'));
            sortedFinalGroupedTokens[pos] = groupedByPos[pos];
        });

        self.postMessage({
          type: 'PROCESS_SUCCESS',
          data: {
            groupedTokens: sortedFinalGroupedTokens,
            sentences: sentencesWithMeta,
            sentenceMap: sentenceMap
          },
        });
        break;
      }
    }
  } catch (error) {
    self.postMessage({ type: 'ERROR', message: error.message });
  }
};