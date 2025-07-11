import React from 'react';

export const WordListControls = ({
  showAllWords,
  onShowAllWordsChange,
  sortOrder,
  onSortOrderChange,
  searchTerm,
  onSearchTermChange,
  onSearch,
  searchResultText,
}) => {
  return (
    <div className="p-4 border-b border-gray-200">
      <h2 className="text-lg font-bold">単語リスト</h2>
      <div className="mt-4 text-sm space-y-2">
        <label className="flex items-center cursor-pointer">
          <input 
            type="checkbox"
            className="mr-2"
            checked={showAllWords}
            onChange={onShowAllWordsChange}
          />
          表記揺れがない単語も表示
        </label>
        <div className="flex gap-x-4">
          <label className="flex items-center cursor-pointer">
            <input type="radio" name="sortOrder" value="JPN_ORDER" checked={sortOrder === 'JPN_ORDER'} onChange={onSortOrderChange} className="mr-1" />
            五十音順
          </label>
          <label className="flex items-center cursor-pointer">
            <input type="radio" name="sortOrder" value="FREQ_DESC" checked={sortOrder === 'FREQ_DESC'} onChange={onSortOrderChange} className="mr-1" />
            頻度順(多)
          </label>
          <label className="flex items-center cursor-pointer">
            <input type="radio" name="sortOrder" value="FREQ_ASC" checked={sortOrder === 'FREQ_ASC'} onChange={onSortOrderChange} className="mr-1" />
            頻度順(少)
          </label>
        </div>
        <form onSubmit={onSearch} className="flex gap-x-2 pt-2 items-center">
          <input 
            type="text" 
            placeholder="単語を検索..."
            value={searchTerm}
            onChange={onSearchTermChange}
            className="flex-1 min-w-0 border border-gray-300 rounded px-2 py-1 text-sm"
          />
          <button type="submit" className="px-4 py-1 bg-gray-200 hover:bg-gray-300 rounded text-sm whitespace-nowrap">
            検索
          </button>
          <div className="w-16 text-center">
            {searchResultText && (
              <span className="text-xs text-gray-500 whitespace-nowrap">
                {searchResultText}
              </span>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};