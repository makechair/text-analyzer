import React, { forwardRef } from 'react';

const Highlight = ({ text, query }) => {
  if (!query || !text || !text.includes(query)) {
    return <span>{text}</span>;
  }
  const parts = text.split(new RegExp(`(${query})`, 'gi'));
  return (
    <span>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <span key={i} className="bg-yellow-200 px-0.5 rounded-sm">
            {part}
          </span>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </span>
  );
};

export const WordList = forwardRef(({ 
  tokens, 
  expandedPos, 
  onTogglePosExpansion, 
  selectedGroup, 
  onGroupSelect,
  searchTerm
}, ref) => {
  return (
    <div className="flex-grow overflow-y-auto p-4" ref={ref}>
      {tokens && 
        Object.keys(tokens).map(pos => {
          const groupsToDisplay = tokens[pos];
          return (
            <div key={pos} className="mb-4">
              <h3 onClick={() => onTogglePosExpansion(pos)} className="flex items-center cursor-pointer select-none font-bold text-gray-600 mb-2">
                <span className={`mr-2 transition-transform ${expandedPos[pos] ? 'rotate-90' : ''}`}>▶</span>
                {pos}
              </h3>
              {expandedPos[pos] && (
                <ul>
                  {groupsToDisplay.map(group => (
                    <li 
                      key={group.reading}
                      data-reading={group.reading}
                      onClick={() => onGroupSelect(group)}
                      className={`p-2 rounded cursor-pointer transition-colors ${selectedGroup?.reading === group.reading ? 'bg-blue-300 text-black' : 'hover:bg-gray-200'}`}
                    >
                      <div className="font-bold">
                        <Highlight text={group.primaryWord} query={searchTerm} /> (合計: {group.totalCount})
                      </div>
                      {group.variants.length > 1 && (
                        <ul className="pl-4 text-sm text-gray-600">
                          {group.variants.map(({ word, count }) => (
                            <li key={word}>
                              <Highlight text={word} query={searchTerm} /> ({count})
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
  );
});