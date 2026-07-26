'use client';
import { useState, useRef, useCallback } from 'react';

interface AssistantWidgetProps {
  tenant: string;
}

type RecordingState = 'idle' | 'recording' | 'processing';

export function AssistantWidget({ tenant }: AssistantWidgetProps) {
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [status, setStatus] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

  const sendPrompt = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setStatus('Running agent...');
    try {
      const res = await fetch(`${API}/api/agent/run?tenant=${tenant}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus(`❌ ${data.message ?? data.error ?? 'Agent request failed'}`);
        return;
      }
      if (data.success && data.releaseVersion != null) {
        setStatus(`✅ ${data.message ?? 'Done'} — release v${data.releaseVersion} created.`);
        setPrompt('');
        // Reload so nav/content pick up extension changes
        window.setTimeout(() => window.location.reload(), 600);
      } else if (data.success) {
        setStatus(`✅ ${data.message ?? 'Done'}`);
        setPrompt('');
      } else {
        setStatus(`❌ ${data.message ?? 'No changes were applied'}`);
      }
    } catch (err) {
      setStatus('❌ Failed to connect to API');
    } finally {
      setLoading(false);
    }
  };

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setRecordingState('processing');
        setStatus('Transcribing...');
        try {
          const formData = new FormData();
          formData.append('audio', blob, 'recording.webm');
          const res = await fetch(`${API}/api/voice/transcribe?tenant=${tenant}`, {
            method: 'POST',
            body: formData,
          });
          const data = await res.json();
          setPrompt(data.text ?? '');
          setStatus('Transcription done. Edit and send.');
        } catch {
          setStatus('❌ Transcription failed');
        }
        setRecordingState('idle');
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setRecordingState('recording');
      setStatus('🎙️ Recording...');
    } catch {
      setStatus('❌ Microphone access denied');
    }
  }, [tenant, API]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  }, []);

  return (
    <div style={{
      position: 'fixed',
      bottom: '1.5rem',
      right: '1.5rem',
      zIndex: 1000,
    }}>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          title="Open AI Assistant"
          style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            background: '#3b82f6',
            color: 'white',
            fontSize: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(59, 130, 246, 0.4)',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          ✨
        </button>
      )}

      {open && (
        <div style={{
          width: '360px',
          background: 'white',
          borderRadius: '12px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)',
          border: '1px solid #e2e8f0',
          overflow: 'hidden',
        }}>
          <div style={{
            background: '#1e293b',
            color: 'white',
            padding: '1rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <span style={{ fontWeight: 600 }}>✨ AI Assistant</span>
            <button
              onClick={() => setOpen(false)}
              style={{ background: 'none', color: '#94a3b8', fontSize: '1.2rem', padding: '0 0.25rem' }}
            >
              ×
            </button>
          </div>

          <div style={{ padding: '1rem' }}>
            <p style={{ color: '#64748b', fontSize: '0.85rem', margin: '0 0 0.75rem' }}>
              Describe changes you want to make to the extension:
            </p>

            <textarea
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder="e.g. Add a table showing all items with a search bar"
              rows={4}
              style={{ width: '100%', resize: 'vertical', fontSize: '0.9rem', marginBottom: '0.75rem' }}
              disabled={loading}
            />

            {status && (
              <div style={{
                padding: '0.5rem 0.75rem',
                background: '#f8fafc',
                borderRadius: '6px',
                fontSize: '0.85rem',
                color: '#475569',
                marginBottom: '0.75rem',
              }}>
                {status}
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={sendPrompt}
                disabled={loading || !prompt.trim()}
                className="btn-primary"
                style={{ flex: 1 }}
              >
                {loading ? 'Running...' : 'Send'}
              </button>

              <button
                onClick={recordingState === 'recording' ? stopRecording : startRecording}
                disabled={loading || recordingState === 'processing'}
                style={{
                  padding: '0.5rem',
                  background: recordingState === 'recording' ? '#ef4444' : '#e2e8f0',
                  color: recordingState === 'recording' ? 'white' : '#475569',
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '1.1rem',
                }}
                title={recordingState === 'recording' ? 'Stop recording' : 'Voice input'}
              >
                {recordingState === 'recording' ? '⏹' : '🎙️'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
