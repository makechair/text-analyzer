import React from 'react';

export const HighlightedSentence = ({ text, keywords }) => {
  if (!keywords || keywords.length === 0) {
    return <span>{text}</span>;
  }
  const regex = new RegExp(`(${keywords.join('|')})`, 'g');
  const parts = text.split(regex);

  return (
    <span>
      {parts.map((part, index) =>
        keywords.includes(part) ? (
          <span key={index} className="bg-orange-200 rounded px-1">
            {part}
          </span>
        ) : (
          <span key={index}>{part}</span>
        )
      )}
    </span>
  );
};