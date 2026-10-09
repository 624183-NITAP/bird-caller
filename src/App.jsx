import { useState, useEffect, useRef, useCallback } from 'react';
import { Mic, Square, Loader2, Bird, BookOpen, Plus } from 'lucide-react';
import './index.css';

function App() {
  const [ready, setReady] = useState(false);
  const [progressItems, setProgressItems] = useState([]);
  const [recording, setRecording] = useState(false);
  const [status, setStatus] = useState('Loading model...');
  const [results, setResults] = useState([]);
  const [journal, setJournal] = useState(() => JSON.parse(localStorage.getItem('birdJournal')) || []);
  
  const worker = useRef(null);
  const mediaRecorder = useRef(null);
  const audioContext = useRef(null);
  const audioChunks = useRef([]);

  // Initialize the worker
  useEffect(() => {
    if (!worker.current) {
      // Create the worker
      worker.current = new Worker(new URL('./worker.js', import.meta.url), {
        type: 'module'
      });

      // Handle messages from the worker
      worker.current.addEventListener('message', (e) => {
        switch (e.data.status) {
          case 'initiate':
            setReady(false);
            setProgressItems(prev => [...prev, e.data]);
            break;
          case 'progress':
            setProgressItems(prev => 
              prev.map(item => {
                if (item.file === e.data.file) {
                  return { ...item, progress: e.data.progress }
                }
                return item;
              })
            );
            break;
          case 'done':
            setProgressItems(prev => 
              prev.filter(item => item.file !== e.data.file)
            );
            break;
          case 'ready':
            setReady(true);
            setStatus('Ready to listen');
            break;
          case 'inferencing':
            setStatus('Analyzing audio...');
            break;
          case 'complete':
            setStatus('Ready to listen');
            // Filter out some top results
            const filteredResults = e.data.output
              .filter(r => r.score > 0.05)
              .slice(0, 4);
            setResults(filteredResults);
            break;
          case 'error':
            setStatus(`Error: ${e.data.error}`);
            break;
          default:
            break;
        }
      });
    }

    // Ping worker to start loading if not already
    // The worker lazy loads on first message, so we'll send a dummy or we can just wait until first record.
    // Actually, in our worker we only load on message. Let's modify the worker to load immediately or just send a warmup message.
    return () => {
      // cleanup
    };
  }, []);

  const handleRecord = async () => {
    if (recording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioContext.current = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
      mediaRecorder.current = new MediaRecorder(stream);
      audioChunks.current = [];

      mediaRecorder.current.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunks.current.push(e.data);
        }
      };

      mediaRecorder.current.onstop = async () => {
        const audioBlob = new Blob(audioChunks.current, { type: 'audio/webm' });
        const arrayBuffer = await audioBlob.arrayBuffer();
        
        // Decode the audio to get raw PCM data
        const audioBuffer = await audioContext.current.decodeAudioData(arrayBuffer);
        
        // Extract the raw Float32Array from the first channel
        const channelData = audioBuffer.getChannelData(0);
        
        setStatus('Sending to inference engine...');
        worker.current.postMessage({ audio: channelData });
      };

      mediaRecorder.current.start();
      setRecording(true);
      setStatus('Listening to the wild...');
      setResults([]);
    } catch (err) {
      console.error(err);
      setStatus('Microphone access denied or unavailable.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorder.current && mediaRecorder.current.state === 'recording') {
      mediaRecorder.current.stop();
      mediaRecorder.current.stream.getTracks().forEach(track => track.stop());
    }
    setRecording(false);
    setStatus('Processing recording...');
  };

  // Pre-load the model
  useEffect(() => {
    if (worker.current) {
      // Send a small dummy array to trigger the singleton model load
      // The AST model expects 16kHz audio, let's send a 1 second dummy.
      worker.current.postMessage({ audio: new Float32Array(16000) });
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('birdJournal', JSON.stringify(journal));
  }, [journal]);

  const saveToJournal = (label) => {
    if (!journal.some(b => b.label === label)) {
      setJournal([{ label, date: new Date().toLocaleDateString() }, ...journal]);
    }
  };

  return (
    <>
      <h1>Bird Caller</h1>
      <p className="subtitle">Identify bird songs offline with open-source AI.</p>

      <div className="glass-panel">
        <button 
          className={`record-btn ${recording ? 'recording' : ''}`}
          onClick={handleRecord}
          disabled={!ready && !recording}
          title={recording ? 'Stop listening' : 'Start listening'}
        >
          {recording ? <Square size={36} fill="white" /> : <Mic size={36} />}
        </button>

        <div className="status-text flex items-center justify-center gap-2">
          {!ready && status === 'Loading model...' && <Loader2 className="animate-spin" />}
          {status}
        </div>

        {/* Model loading progress */}
        {progressItems.length > 0 && (
          <div className="text-left mt-4 text-sm text-gray-400">
            <p>Downloading model (only happens once)...</p>
            {progressItems.map(item => (
              <div key={item.file} className="mb-2">
                <div className="flex justify-between text-xs mb-1">
                  <span>{item.file}</span>
                  <span>{Math.round(item.progress || 0)}%</span>
                </div>
                <div className="progress-container">
                  <div 
                    className="progress-bar" 
                    style={{ width: `${item.progress || 0}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Results */}
        {results.length > 0 && (
          <div className="results-grid">
            <h3 className="text-xl font-semibold mb-2 flex items-center gap-2">
              <Bird /> Top Matches
            </h3>
            {results.map((result, idx) => (
              <div key={idx} className="result-card">
                <div className="flex flex-col">
                  <span className="result-label">{result.label}</span>
                  <span className="result-score">
                    {Math.round(result.score * 100)}% Match
                  </span>
                </div>
                <button 
                  onClick={() => saveToJournal(result.label)}
                  className="bg-green-600 hover:bg-green-500 text-white p-2 rounded-full transition-colors flex items-center justify-center border-none cursor-pointer"
                  title="Save to Field Journal"
                  style={{ background: 'var(--accent)', marginLeft: '10px' }}
                >
                  <Plus size={20} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Field Journal */}
        {journal.length > 0 && (
          <div className="results-grid" style={{ marginTop: '3rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '2rem' }}>
            <h3 className="text-xl font-semibold mb-2 flex items-center gap-2">
              <BookOpen /> Field Journal
            </h3>
            {journal.map((bird, idx) => (
              <div key={idx} className="result-card" style={{ background: 'rgba(16, 185, 129, 0.05)' }}>
                <span className="result-label text-green-400">{bird.label}</span>
                <span className="text-sm text-gray-400">
                  {bird.date}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

export default App;
