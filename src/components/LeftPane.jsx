import React, { useState, useEffect, useMemo, useRef } from 'react';
import { WordListControls } from './WordListControls';
import { WordList } from './WordList';

const POS_ORDER = [ '固有名詞', '人名', '名詞', '動詞', '形容詞', '形容動詞', '副詞', '連体詞', '接続詞', '感動詞', '助詞', '助動詞' ];

export const LeftPane = ({ groupedTokens, selectedGroup, onGroupSelect }) => {
  const [expandedPos, setExpandedPos] = useState({});
  const [showAllWords, setShowAllWords] = useState(false);
  const [sortOrder, setSortOrder] = useState('JPN_ORDER');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState({ matches: [], currentIndex: -1 });
  const [searchResultText, setSearchResultText] = useState('');
  
  const scrollContainerRef = useRef(null);

  useEffect(() => {
    if (groupedTokens) {
      const initialExpansionState = Object.keys(groupedTokens).reduce((acc, pos) => {
        acc[pos] = true;
        return acc;
      }, {});
      setExpandedPos(initialExpansionState);
    } else {
      setSearchTerm('');
      setSearchResults({ matches: [], currentIndex: -1 });
      setSearchResultText('');
    }
  }, [groupedTokens]);

  const togglePosExpansion = (pos) => {
    setExpandedPos(prev => ({ ...prev, [pos]: !prev[pos] }));
  };

  const sortedAndFilteredTokens = useMemo(() => {
    if (!groupedTokens) return null;
    const sortedPosKeys = Object.keys(groupedTokens).sort((a, b) => {
      const indexA = POS_ORDER.indexOf(a);
      const indexB = POS_ORDER.indexOf(b);
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;
      return indexA - indexB;
    });
    const result = {};
    for (const pos of sortedPosKeys) {
      const filtered = showAllWords 
        ? groupedTokens[pos] 
        : groupedTokens[pos].filter(group => group.variants.length > 1);
      if (filtered.length === 0) continue;
      const sorted = [...filtered];
      switch (sortOrder) {
        case 'FREQ_DESC': sorted.sort((a, b) => b.totalCount - a.totalCount); break;
        case 'FREQ_ASC': sorted.sort((a, b) => a.totalCount - b.totalCount); break;
        case 'JPN_ORDER': default: sorted.sort((a, b) => a.reading.localeCompare(b.reading, 'ja')); break;
      }
      result[pos] = sorted;
    }
    return result;
  }, [groupedTokens, showAllWords, sortOrder]);

  useEffect(() => {
    if (searchResults.matches.length > 0 && searchResults.currentIndex !== -1) {
      const currentMatch = searchResults.matches[searchResults.currentIndex];
      if (!expandedPos[currentMatch.pos]) {
        togglePosExpansion(currentMatch.pos);
      }
      const timer = setTimeout(() => {
        const targetElement = scrollContainerRef.current?.querySelector(`[data-reading="${currentMatch.reading}"]`);
        if (targetElement) {
          targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [searchResults]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (!searchTerm || !sortedAndFilteredTokens) {
        setSearchResultText('');
        return;
    };
    const allMatches = [];
    Object.entries(sortedAndFilteredTokens).forEach(([pos, groups]) => {
      groups.forEach(group => {
        const isMatch = group.primaryWord.includes(searchTerm) || 
                        group.variants.some(v => v.word.includes(searchTerm));
        if (isMatch) {
          allMatches.push({ reading: group.reading, pos: pos });
        }
      });
    });
    if (allMatches.length === 0) {
      setSearchResults({ matches: [], currentIndex: -1 });
      setSearchResultText('(0/0)');
    } else {
      const isSameSearch = searchResults.matches.length === allMatches.length && 
                           searchResults.matches.every((m, i) => m.reading === allMatches[i].reading);
      let nextIndex = 0;
      if (isSameSearch && allMatches.length > 1) {
        nextIndex = (searchResults.currentIndex + 1) % allMatches.length;
      }
      setSearchResults({ matches: allMatches, currentIndex: nextIndex });
      setSearchResultText(`(${nextIndex + 1}/${allMatches.length})`);
    }
  };

  const handleSearchTermChange = (e) => {
    setSearchTerm(e.target.value);
    setSearchResultText(''); 
  };

  return (
    <div className="flex-none w-[35%] min-w-0 flex flex-col bg-gray-50 border-r border-gray-200">
      <WordListControls
        showAllWords={showAllWords}
        onShowAllWordsChange={(e) => setShowAllWords(e.target.checked)}
        sortOrder={sortOrder}
        onSortOrderChange={(e) => setSortOrder(e.target.value)}
        searchTerm={searchTerm}
        onSearchTermChange={handleSearchTermChange}
        onSearch={handleSearch}
        searchResultText={searchResultText}
      />
      <WordList
        ref={scrollContainerRef}
        tokens={sortedAndFilteredTokens}
        expandedPos={expandedPos}
        onTogglePosExpansion={togglePosExpansion}
        selectedGroup={selectedGroup}
        onGroupSelect={onGroupSelect}
        searchTerm={searchTerm}
      />
    </div>
  );
};