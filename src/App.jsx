import { useState, useRef, useEffect } from "react";
import { LeftPane } from "./components/LeftPane";
import { RightPane } from "./components/RightPane";

function App() {
  const [appStatus, setAppStatus] = useState("LOADING_DICT");
  const [error, setError] = useState(null);
  const [groupedTokens, setGroupedTokens] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [allSentences, setAllSentences] = useState([]);
  const [sentenceMap, setSentenceMap] = useState({});
  const [groupedSentences, setGroupedSentences] = useState(null);

  const workerRef = useRef(null);

  useEffect(() => {
    workerRef.current = new Worker(new URL("./worker.js", import.meta.url), {
      type: "module",
    });
    workerRef.current.onmessage = (e) => {
      const { type, data, message } = e.data;
      switch (type) {
        case "INIT_SUCCESS":
          setAppStatus("READY");
          break;
        case "PROCESS_SUCCESS":
          setGroupedTokens(data.groupedTokens);
          setAllSentences(data.sentences);
          setSentenceMap(data.sentenceMap);
          setAppStatus("READY");
          break;
        case "ERROR":
          setError(message);
          setAppStatus("ERROR");
          break;
      }
    };
    workerRef.current.onerror = (err) => {
      setError(`Worker Error: ${err.message}`);
      setAppStatus("ERROR");
    };
    workerRef.current.postMessage({ type: "INIT" });
    return () => {
      if (workerRef.current) workerRef.current.terminate();
    };
  }, []);

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    setAppStatus("PROCESSING");
    setGroupedTokens(null);
    setSelectedGroup(null);
    setAllSentences([]);
    setSentenceMap({});
    setGroupedSentences(null);
    workerRef.current.postMessage({ type: "PROCESS", file });
  };

  const handleGroupSelect = (group) => {
    setSelectedGroup(group);
    const sentencesByVariant = {};
    const usedSentenceIndices = new Set();
    for (const variant of group.variants) {
      const keyword = variant.word;
      sentencesByVariant[keyword] = [];
      const sentenceIndicesForGroup = sentenceMap[group.reading] || [];
      for (const index of sentenceIndicesForGroup) {
        if (usedSentenceIndices.has(index)) continue;
        const sentence = allSentences[index];
        if (sentence && sentence.text.includes(keyword)) {
          sentencesByVariant[keyword].push(sentence);
          usedSentenceIndices.add(index);
        }
      }
      if (sentencesByVariant[keyword].length === 0) {
        delete sentencesByVariant[keyword];
      }
    }
    setGroupedSentences(sentencesByVariant);
  };

  const getStatusMessage = () => {
    switch (appStatus) {
      case "LOADING_DICT":
        return (
          <div className="text-center p-4 bg-blue-100 text-blue-800">
            辞書を読み込んでいます...
          </div>
        );
      case "PROCESSING":
        return (
          <div className="text-center p-4 bg-blue-100 text-blue-800">
            ファイルを解析中です...
          </div>
        );
      case "ERROR":
        return (
          <div className="text-center p-4 bg-red-100 text-red-800">
            エラー: {error}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100 text-gray-900 font-sans">
      <header className="bg-white p-4 sm:px-6 border-b border-gray-200 shadow-sm flex items-center gap-x-6">
        <h1 className="text-xl font-bold whitespace-nowrap">
          文章表記揺れチェッカー
        </h1>
        <label className="cursor-pointer text-sm font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 py-2 px-4 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
          <span>ファイルを選択(.txt .docx)</span>
          <input
            type="file"
            onChange={handleFileChange}
            disabled={appStatus !== "READY"}
            accept=".txt,.docx"
            className="hidden" // 本来のinputは隠す
          />
        </label>
      </header>

      {getStatusMessage()}

      <main className="flex flex-1 min-h-0">
        <LeftPane
          groupedTokens={groupedTokens}
          selectedGroup={selectedGroup}
          onGroupSelect={handleGroupSelect}
        />
        <RightPane
          selectedGroup={selectedGroup}
          groupedSentences={groupedSentences}
        />
      </main>
    </div>
  );
}

export default App;
