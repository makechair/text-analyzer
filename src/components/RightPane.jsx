import React from 'react';
import { HighlightedSentence } from './HighlightedSentence';

export const RightPane = ({ selectedGroup, groupedSentences }) => {
  return (
    <div className="flex-1 min-w-0 flex flex-col p-4 sm:p-6 bg-white">
      <h2 className="text-lg font-bold border-b pb-2 mb-4">「{selectedGroup?.primaryWord || '...'}」グループの文</h2>
      <div className="flex-grow overflow-y-auto">
        {groupedSentences && Object.keys(groupedSentences).length > 0 ? (
          Object.entries(groupedSentences).map(([keyword, sentences]) => (
            <div key={keyword} className="mb-6">
              <h3 className="font-bold text-base mb-2 pb-1 border-b">「{keyword}」</h3>
              <ul>
                {sentences.map(({ text, lineNum }, index) => (
                  <li key={`${keyword}-${index}`} className="flex gap-x-3 py-2 border-b border-gray-100 text-gray-800 leading-relaxed">
                    <span className="text-gray-400 text-sm whitespace-nowrap">({index + 1}, 行{lineNum})</span>
                    <div className="flex-1 min-w-0 break-words">
                      <HighlightedSentence 
                        text={text} 
                        keywords={Object.keys(groupedSentences)} 
                      />
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))
        ) : (
          <p className="text-gray-500 pt-4">{selectedGroup ? '該当する文はありません。' : '左のリストから単語グループを選択してください。'}</p>
        )}
      </div>
    </div>
  );
};