import React, { useState } from 'react';
import './VoiceAssistant.css';

function VoiceAssistant({ predictions, onCommand }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState('');
  const [recognition, setRecognition] = useState(null);

  const processCommand = React.useCallback((command) => {
    let result = '';

    // Check Stress Level - expanded keywords
    if (
      command.includes('stress level') ||
      command.includes('check stress') ||
      command.includes('my stress') ||
      command.includes('am i stressed') ||
      command.includes('how stressed') ||
      command.includes('current stress') ||
      command.includes('stress score') ||
      command.includes('latest stress') ||
      command.includes('last stress') ||
      command.includes('recent stress') ||
      command.includes('what is my stress') ||
      command.includes('tell me my stress') ||
      command.includes('check my stress') ||
      command.includes('show stress') ||
      command.includes('how am i feeling') ||
      command.includes('am i anxious') ||
      command.includes('stress status')
    ) {
      if (predictions.length === 0) {
        result = 'You have no predictions yet. Make your first prediction!';
      } else {
        const lastPrediction = predictions[predictions.length - 1];
        result = `Your last stress level was ${lastPrediction.level} with a score of ${lastPrediction.score.toFixed(2)}.`;
      }
    } 
    // Show History - expanded keywords
    else if (
      command.includes('history') ||
      command.includes('show history') ||
      command.includes('my records') ||
      command.includes('past predictions') ||
      command.includes('show records') ||
      command.includes('my history') ||
      command.includes('previous predictions') ||
      command.includes('past data') ||
      command.includes('show me history') ||
      command.includes('view history') ||
      command.includes('all predictions') ||
      command.includes('past entries') ||
      command.includes('my entries') ||
      command.includes('earlier predictions')
    ) {
      result = `You have ${predictions.length} predictions recorded. Switching to history view.`;
      onCommand({ tab: 'history' });
    } 
    // Recommendations/Insights - expanded keywords
    else if (
      command.includes('recommendation') ||
      command.includes('recommend') ||
      command.includes('advice') ||
      command.includes('suggestions') ||
      command.includes('give me tips') ||
      command.includes('how can i improve') ||
      command.includes('what should i do') ||
      command.includes('help me reduce stress') ||
      command.includes('health tips') ||
      command.includes('wellness advice') ||
      command.includes('insights') ||
      command.includes('show insights') ||
      command.includes('professional advice') ||
      command.includes('stress reduction') ||
      command.includes('how to manage') ||
      command.includes('best practices') ||
      command.includes('improvement tips')
    ) {
      result = 'Showing insights and recommendations. Switching to insights view.';
      onCommand({ tab: 'insights' });
    } 
    // Create Prediction - expanded keywords
    else if (
      command.includes('predict') ||
      command.includes('new prediction') ||
      command.includes('check health') ||
      command.includes('make a prediction') ||
      command.includes('create prediction') ||
      command.includes('add prediction') ||
      command.includes('new entry') ||
      command.includes('add entry') ||
      command.includes('enter data') ||
      command.includes('input data') ||
      command.includes('log my health') ||
      command.includes('check my health') ||
      command.includes('health check') ||
      command.includes('analyze my health') ||
      command.includes('stress prediction') ||
      command.includes('predict my stress') ||
      command.includes('create entry')
    ) {
      result = 'Opening prediction form for you.';
      onCommand({ tab: 'predict' });
    } 
    // Statistics - expanded keywords
    else if (
      command.includes('average') ||
      command.includes('stats') ||
      command.includes('statistics') ||
      command.includes('show stats') ||
      command.includes('data analysis') ||
      command.includes('my average') ||
      command.includes('summary') ||
      command.includes('overview') ||
      command.includes('show me stats') ||
      command.includes('statistical data') ||
      command.includes('how am i doing') ||
      command.includes('performance') ||
      command.includes('progress') ||
      command.includes('trends') ||
      command.includes('show trends') ||
      command.includes('analysis')
    ) {
      if (predictions.length === 0) {
        result = 'No data available yet.';
      } else {
        const avgScore = predictions.reduce((sum, p) => sum + p.score, 0) / predictions.length;
        result = `Your average stress score is ${avgScore.toFixed(1)} based on ${predictions.length} predictions.`;
      }
    } 
    else {
      result = 'I can help you with: Check stress level, Show history, Get recommendations, Create new prediction, or Show statistics. Say any of these commands.';
    }

    setResponse(result);
    
    // Text-to-speech
    if ('speechSynthesis' in window && result) {
      const utterance = new SpeechSynthesisUtterance(result);
      utterance.rate = 1;
      utterance.pitch = 1;
      window.speechSynthesis.speak(utterance);
    }
  }, [predictions, onCommand]);

  React.useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognitionInstance = new SpeechRecognition();
      recognitionInstance.continuous = false;
      recognitionInstance.interimResults = false;
      recognitionInstance.lang = 'en-US';

      recognitionInstance.onstart = () => {
        setIsListening(true);
        setTranscript('Listening...');
      };

      recognitionInstance.onresult = (event) => {
        let interimTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcriptSegment = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            interimTranscript += transcriptSegment + ' ';
          }
        }
        setTranscript(interimTranscript || 'No speech detected');
        processCommand(interimTranscript.toLowerCase());
      };

      recognitionInstance.onerror = (event) => {
        setResponse(`Error: ${event.error}`);
        setIsListening(false);
      };

      recognitionInstance.onend = () => {
        setIsListening(false);
      };

      setRecognition(recognitionInstance);
    }
  }, [processCommand]);

  const startListening = () => {
    if (recognition) {
      setTranscript('');
      setResponse('');
      recognition.start();
    }
  };

  const handleFloatingButtonClose = () => {
    setIsOpen(false);
    if (isListening && recognition) {
      recognition.stop();
    }
  };

  return (
    <>
      {/* Floating Button */}
      <button
        className="voice-floating-btn"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Open voice assistant"
        title="Voice Assistant"
      >
        🎤
      </button>

      {/* Modal Backdrop */}
      {isOpen && <div className="voice-modal-backdrop" onClick={handleFloatingButtonClose} />}

      {/* Modal Dialog */}
      <div className={`voice-assistant-modal ${isOpen ? 'open' : ''}`}>
        <div className="voice-modal-header">
          <h2>Voice Assistant</h2>
          <button
            className="voice-modal-close"
            onClick={handleFloatingButtonClose}
            aria-label="Close voice assistant"
          >
            ✕
          </button>
        </div>

        <div className="voice-modal-content">
          <p className="voice-intro">Hands-free control - just speak naturally! Our AI understands various ways to express the same request.</p>

          <div className="voice-section">
            <button
              onClick={startListening}
              disabled={isListening}
              className="voice-btn"
              aria-label={isListening ? "Listening..." : "Start listening for commands"}
              aria-busy={isListening}
            >
              {isListening ? 'Listening...' : 'Start Listening'}
            </button>

            {transcript && (
              <div className="transcript-box">
                <h4>You said:</h4>
                <p className="transcript-text">"{transcript}"</p>
              </div>
            )}

            {response && (
              <div className="response-box">
                <h4>Response:</h4>
                <p className="response-text">{response}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export default VoiceAssistant;
