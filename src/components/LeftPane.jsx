import React, { useState, useEffect, useMemo } from 'react';

const POS_ORDER = [
  '名詞',
  '動詞',
  '形容詞',
  '形容動詞',
  '副詞',
  '連体詞',
  '接続詞',
  '感動詞',
  '助詞',
  '助動詞'
];

export const LeftPane = ({ groupedTokens, selectedGroup, onGroupSelect }) => {
  const [expandedPos, setExpandedPos] = useState({});
  const [showAllWords, setShowAllWords] = useState(false);
  const [sortOrder, setSortOrder] = useState('JPN_ORDER')

  useEffect(() => {
    if (groupedTokens) {
      const initialExpansionState = Object.keys(groupedTokens).reduce((acc, pos) => {
        acc[pos] = true;
        return acc;
      }, {});
      setExpandedPos(initialExpansionState);
    }
  }, [groupedTokens]);

  const togglePosExpansion = (pos) => {
    setExpandedPos(prev => ({ ...prev, [pos]: !prev[pos] }));
  };

  const sortedAndFilteredTokens = useMemo(() => {
    if (!groupedTokens) return null;

    const sortedPosKeys = Object.keys(groupedTokens)
      .sort((a, b) => {
        const indexA = POS_ORDER.indexOf(a);
        const indexB = POS_ORDER.indexOf(b);
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;
        return indexA - indexB;
      });
    
    const result = {};
    for (const pos of sortedPosKeys) {
      // フィルタリング
      const filtered = showAllWords 
        ? groupedTokens[pos] 
        : groupedTokens[pos].filter(group => group.variants.length > 1);

      if (filtered.length === 0) continue;

      // ソート
      const sorted = [...filtered]; // 元の配列を壊さないようにコピー
      switch (sortOrder) {
        case 'FREQ_DESC':
          sorted.sort((a, b) => b.totalCount - a.totalCount);
          break;
        case 'FREQ_ASC':
          sorted.sort((a, b) => a.totalCount - b.totalCount);
          break;
        case 'JPN_ORDER':
        default:
          sorted.sort((a, b) => a.reading.localeCompare(b.reading, 'ja'));
          break;
      }
      result[pos] = sorted;
    }
    return result;
  }, [groupedTokens, showAllWords, sortOrder]);

  return (
    <div className="flex-none w-[35%] min-w-0 flex flex-col bg-gray-50 border-r border-gray-200">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-bold">単語リスト</h2>
        <div className="mt-4 text-sm">
          <label className="flex items-center cursor-pointer">
            <input 
              type="checkbox"
              className="mr-2"
              checked={showAllWords}
              onChange={(e) => setShowAllWords(e.target.checked)}
            />
            表記揺れがない単語も表示
          </label>
          <div className="flex gap-x-4">
            <label className="flex items-center cursor-pointer">
              <input type="radio" name="sortOrder" value="JPN_ORDER" checked={sortOrder === 'JPN_ORDER'} onChange={(e) => setSortOrder(e.target.value)} className="mr-1" />
              五十音順
            </label>
            <label className="flex items-center cursor-pointer">
              <input type="radio" name="sortOrder" value="FREQ_DESC" checked={sortOrder === 'FREQ_DESC'} onChange={(e) => setSortOrder(e.target.value)} className="mr-1" />
              頻度順(多)
            </label>
            <label className="flex items-center cursor-pointer">
              <input type="radio" name="sortOrder" value="FREQ_ASC" checked={sortOrder === 'FREQ_ASC'} onChange={(e) => setSortOrder(e.target.value)} className="mr-1" />
              頻度順(少)
            </label>
          </div>
        </div>
      </div>
      <div className="flex-grow overflow-y-auto p-4">
      {sortedAndFilteredTokens && 
          Object.keys(sortedAndFilteredTokens).map(pos => {
            const groupsToDisplay = sortedAndFilteredTokens[pos];
            return (
              <div key={pos} className="mb-4">
                <h3 onClick={() => togglePosExpansion(pos)} className="flex items-center cursor-pointer select-none font-bold text-gray-600 mb-2">
                  <span className={`mr-2 transition-transform ${expandedPos[pos] ? 'rotate-90' : ''}`}>▶</span>
                  {pos}
                </h3>
                {expandedPos[pos] && (
                  <ul>
                    {groupsToDisplay.map(group => (
                      <li 
                        key={group.reading} 
                        onClick={() => onGroupSelect(group)}
                        className={`p-2 rounded cursor-pointer transition-colors ${selectedGroup?.reading === group.reading ? 'bg-blue-300 text-black' : 'hover:bg-gray-200'}`}
                      >
                        <div className="font-bold">{group.primaryWord} (合計: {group.totalCount})</div>
                        {group.variants.length > 1 && (
                          <ul className="pl-4 text-sm text-gray-600">
                            {group.variants.map(({ word, count }) => (
                              <li key={word}>
                                {word} ({count})
                              </li>
                            ))}
                          </ul>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
      </div>
    </div>
  );
};