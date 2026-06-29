import { useState, useEffect, useRef, useCallback } from 'react'
import { useStore } from '../store'

const API = ''

interface Participant {
  id: string
  name: string
  stream?: MediaStream
}

export default function VideoRoom({ roomCode, roomId, onClose }: { roomCode: string; roomId: number; onClose: () => void }) {
  const { token, user } = useStore()
  const [participants, setParticipants] = useState<Participant[]>([])
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [videoEnabled, setVideoEnabled] = useState(true)
  const [audioEnabled, setAudioEnabled] = useState(true)
  const [screenSharing, setScreenSharing] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)
  const [chatMessages, setChatMessages] = useState<{ sender: string; text: string }[]>([])
  const [chatInput, setChatInput] = useState('')
  const [materials, setMaterials] = useState<any[]>([])
  const [materialsOpen, setMaterialsOpen] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map())
  const remoteStreams = useRef<Map<string, MediaStream>>(new Map())

  const initMedia = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      setLocalStream(stream)
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream
      }
      return stream
    } catch (e) {
      console.error('Media access denied:', e)
      return null
    }
  }, [])

  const createPeerConnection = useCallback((targetId: string, stream: MediaStream) => {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    })
    stream.getTracks().forEach(track => pc.addTrack(track, stream))

    pc.onicecandidate = (e) => {
      if (e.candidate && wsRef.current) {
        wsRef.current.send(JSON.stringify({
          type: 'ice-candidate',
          target: targetId,
          candidate: e.candidate,
        }))
      }
    }

    pc.ontrack = (e) => {
      remoteStreams.current.set(targetId, e.streams[0])
      setParticipants(prev => {
        const exists = prev.find(p => p.id === targetId)
        if (exists) {
          return prev.map(p => p.id === targetId ? { ...p, stream: e.streams[0] } : p)
        }
        return [...prev, { id: targetId, name: targetId.split('_').slice(1).join('_'), stream: e.streams[0] }]
      })
    }

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'disconnected') {
        peerConnections.current.delete(targetId)
        setParticipants(prev => prev.filter(p => p.id !== targetId))
      }
    }

    peerConnections.current.set(targetId, pc)
    return pc
  }, [])

  const handleOffer = useCallback(async (senderId: string, offer: RTCSessionInit) => {
    if (!localStream) return
    const pc = createPeerConnection(senderId, localStream)
    await pc.setRemoteDescription(new RTCSessionDescription(offer))
    const answer = await pc.createAnswer()
    await pc.setLocalDescription(answer)
    wsRef.current?.send(JSON.stringify({
      type: 'answer',
      target: senderId,
      answer,
    }))
  }, [localStream, createPeerConnection])

  const handleAnswer = useCallback(async (senderId: string, answer: RTCSessionInit) => {
    const pc = peerConnections.current.get(senderId)
    if (pc) await pc.setRemoteDescription(new RTCSessionDescription(answer))
  }, [])

  const handleIceCandidate = useCallback(async (senderId: string, candidate: RTCIceCandidateInit) => {
    const pc = peerConnections.current.get(senderId)
    if (pc) await pc.addIceCandidate(new RTCIceCandidate(candidate))
  }, [])

  useEffect(() => {
    let mounted = true

    const connect = async () => {
      const stream = await initMedia()
      if (!stream || !mounted) return

      const wsUrl = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/api/video/ws/${roomCode}/${user?.id}/${user?.display_name || user?.username}`
      const ws = new WebSocket(wsUrl)
      wsRef.current = ws

      ws.onopen = () => {
        const existingParticipants = participants.filter(p => p.id !== `${user?.id}_${user?.display_name}`)
        existingParticipants.forEach(async (p) => {
          const pc = createPeerConnection(p.id, stream)
          const offer = await pc.createOffer()
          await pc.setLocalDescription(offer)
          ws.send(JSON.stringify({
            type: 'offer',
            target: p.id,
            offer,
          }))
        })
      }

      ws.onmessage = async (e) => {
        const data = JSON.parse(e.data)
        switch (data.type) {
          case 'user_joined':
            setParticipants(data.participants.map((p: string) => ({
              id: p,
              name: p.split('_').slice(1).join('_'),
            })).filter((p: Participant) => p.id !== `${user?.id}_${user?.display_name}`))
            if (stream && ws.readyState === WebSocket.OPEN) {
              const pc = createPeerConnection(data.user_id + '_' + data.user_name, stream)
              const offer = await pc.createOffer()
              await pc.setLocalDescription(offer)
              ws.send(JSON.stringify({
                type: 'offer',
                target: data.user_id + '_' + data.user_name,
                offer,
              }))
            }
            break
          case 'user_left':
            setParticipants(prev => prev.filter(p => p.id !== data.user_id + '_' + data.user_name))
            const leftPc = peerConnections.current.get(data.user_id + '_' + data.user_name)
            if (leftPc) leftPc.close()
            peerConnections.current.delete(data.user_id + '_' + data.user_name)
            break
          case 'offer':
            await handleOffer(data.sender, data.offer)
            break
          case 'answer':
            await handleAnswer(data.sender, data.answer)
            break
          case 'ice-candidate':
            await handleIceCandidate(data.sender, data.candidate)
            break
          case 'chat':
            setChatMessages(prev => [...prev, { sender: data.sender.split('_').slice(1).join('_'), text: data.text }])
            break
          case 'toggle_video':
          case 'toggle_audio':
            break
        }
      }

      ws.onclose = () => {
        peerConnections.current.forEach(pc => pc.close())
        peerConnections.current.clear()
      }
    }

    connect()

    return () => {
      mounted = false
      localStream?.getTracks().forEach(t => t.stop())
      peerConnections.current.forEach(pc => pc.close())
      peerConnections.current.clear()
      wsRef.current?.close()
    }
  }, [roomCode])

  const toggleVideo = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach(t => { t.enabled = !videoEnabled })
      setVideoEnabled(!videoEnabled)
    }
  }

  const toggleAudio = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach(t => { t.enabled = !audioEnabled })
      setAudioEnabled(!audioEnabled)
    }
  }

  const toggleScreenShare = async () => {
    if (screenSharing) {
      if (localStream) {
        localStream.getTracks().forEach(t => { if (t.kind === 'video') t.stop() })
        const cam = await navigator.mediaDevices.getUserMedia({ video: true })
        cam.getVideoTracks().forEach(t => localStream.addTrack(t))
        setScreenSharing(false)
      }
    } else {
      try {
        const screen = await navigator.mediaDevices.getDisplayMedia({ video: true })
        const screenTrack = screen.getVideoTracks()[0]
        peerConnections.current.forEach(pc => {
          const sender = pc.getSenders().find(s => s.track?.kind === 'video')
          if (sender) sender.replaceTrack(screenTrack)
        })
        screenTrack.onended = () => {
          peerConnections.current.forEach(pc => {
            const sender = pc.getSenders().find(s => s.track?.kind === 'video')
            if (sender && localStream) {
              const camTrack = localStream.getVideoTracks()[0]
              if (camTrack) sender.replaceTrack(camTrack)
            }
          })
          setScreenSharing(false)
        }
        setScreenSharing(true)
      } catch (e) {
        console.error('Screen share failed:', e)
      }
    }
  }

  const sendChat = () => {
    if (chatInput.trim() && wsRef.current) {
      wsRef.current.send(JSON.stringify({ type: 'chat', text: chatInput }))
      setChatMessages(prev => [...prev, { sender: 'Ви', text: chatInput }])
      setChatInput('')
    }
  }

  const uploadMaterial = async (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    const resp = await fetch(`${API}/api/video/rooms/${roomId}/materials`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    })
    const data = await resp.json()
    if (data.ok) {
      setMaterials(prev => [...prev, data.material])
    }
  }

  const loadMaterials = async () => {
    const resp = await fetch(`${API}/api/video/rooms/${roomId}/materials`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const data = await resp.json()
    setMaterials(data)
  }

  useEffect(() => {
    loadMaterials()
  }, [roomId])

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col" style={{ background: '#0a0a0f' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2" style={{ background: 'rgba(20,20,30,0.95)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <div className="flex items-center gap-3">
          <span className="text-sm">🎥</span>
          <span className="text-sm font-semibold">{roomCode}</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'rgba(34,197,94,0.2)', color: '#22c55e' }}>● LIVE</span>
          <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{participants.length + 1} учасників</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setMaterialsOpen(!materialsOpen)} className="px-3 py-1.5 rounded-lg text-xs" style={{ background: 'rgba(255,255,255,0.1)', color: 'var(--text-primary)' }}>
            📎 Матеріали ({materials.length})
          </button>
          <button onClick={() => setChatOpen(!chatOpen)} className="px-3 py-1.5 rounded-lg text-xs" style={{ background: 'rgba(255,255,255,0.1)', color: 'var(--text-primary)' }}>
            💬 Чат
          </button>
          <button onClick={onClose} className="px-3 py-1.5 rounded-lg text-xs font-semibold" style={{ background: 'rgba(239,68,68,0.2)', color: '#ef4444' }}>
            Вийти
          </button>
        </div>
      </div>

      {/* Main area */}
      <div className="flex-1 flex min-h-0">
        {/* Video grid */}
        <div className="flex-1 p-4 overflow-auto">
          <div className="grid gap-3" style={{
            gridTemplateColumns: participants.length === 0 ? '1fr' : participants.length <= 3 ? 'repeat(2, 1fr)' : 'repeat(auto-fit, minmax(280px, 1fr))',
          }}>
            {/* Local video */}
            <div className="relative rounded-xl overflow-hidden" style={{ background: '#1a1a2e', aspectRatio: '16/9' }}>
              <video ref={localVideoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
              <div className="absolute bottom-2 left-2 px-2 py-1 rounded-lg text-[10px] font-medium" style={{ background: 'rgba(0,0,0,0.6)' }}>
                👤 Ви ({user?.display_name || user?.username})
              </div>
              {!videoEnabled && (
                <div className="absolute inset-0 flex items-center justify-center" style={{ background: '#1a1a2e' }}>
                  <span className="text-4xl">{user?.display_name?.[0] || '👤'}</span>
                </div>
              )}
            </div>

            {/* Remote videos */}
            {participants.map(p => (
              <RemoteVideo key={p.id} participant={p} />
            ))}
          </div>
        </div>

        {/* Chat panel */}
        {chatOpen && (
          <div className="w-80 flex flex-col" style={{ borderLeft: '1px solid rgba(255,255,255,0.1)', background: 'rgba(20,20,30,0.95)' }}>
            <div className="p-3 text-xs font-semibold" style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
              💬 Чат кімнати
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {chatMessages.map((msg, i) => (
                <div key={i} className="text-xs">
                  <span className="font-semibold" style={{ color: 'var(--accent-light)' }}>{msg.sender}: </span>
                  <span style={{ color: 'var(--text-secondary)' }}>{msg.text}</span>
                </div>
              ))}
            </div>
            <div className="p-3 flex gap-2" style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
              <input value={chatInput} onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendChat()}
                placeholder="Повідомлення..."
                className="flex-1 px-3 py-1.5 rounded-lg text-xs" style={{ background: 'rgba(255,255,255,0.1)', color: 'var(--text-primary)', border: '1px solid rgba(255,255,255,0.1)' }}
              />
              <button onClick={sendChat} className="px-3 py-1.5 rounded-lg text-xs" style={{ background: 'var(--accent)', color: '#fff' }}>
                →
              </button>
            </div>
          </div>
        )}

        {/* Materials panel */}
        {materialsOpen && (
          <div className="w-80 flex flex-col" style={{ borderLeft: '1px solid rgba(255,255,255,0.1)', background: 'rgba(20,20,30,0.95)' }}>
            <div className="p-3 text-xs font-semibold" style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
              📎 Матеріали уроку
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              <label className="block p-3 rounded-xl text-center cursor-pointer text-xs" style={{ background: 'rgba(255,255,255,0.05)', border: '2px dashed rgba(255,255,255,0.2)' }}>
                📤 Завантажити файл
                <input type="file" className="hidden" accept=".jpg,.jpeg,.png,.gif,.pdf,.pptx,.ppt,.docx,.doc,.mp4,.webm,.zip"
                  onChange={e => e.target.files?.[0] && uploadMaterial(e.target.files[0])} />
              </label>
              {materials.map(m => (
                <a key={m.id} href={`${API}${m.url}`} target="_blank" rel="noreferrer"
                  className="block p-3 rounded-xl text-xs" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <div className="flex items-center gap-2">
                    <span>{m.file_type === '.pdf' ? '📄' : m.file_type === '.pptx' ? '📊' : m.file_type === '.mp4' ? '🎬' : '📎'}</span>
                    <div className="flex-1 truncate">{m.original_name}</div>
                    <span style={{ color: 'var(--text-muted)' }}>{(m.file_size / 1024).toFixed(0)} KB</span>
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-3 p-4" style={{ background: 'rgba(20,20,30,0.95)', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
        <button onClick={toggleVideo} className="w-10 h-10 rounded-full flex items-center justify-center text-sm" style={{ background: videoEnabled ? 'rgba(255,255,255,0.1)' : 'rgba(239,68,68,0.2)' }}>
          {videoEnabled ? '📷' : '📷✕'}
        </button>
        <button onClick={toggleAudio} className="w-10 h-10 rounded-full flex items-center justify-center text-sm" style={{ background: audioEnabled ? 'rgba(255,255,255,0.1)' : 'rgba(239,68,68,0.2)' }}>
          {audioEnabled ? '🎤' : '🎤✕'}
        </button>
        <button onClick={toggleScreenShare} className="w-10 h-10 rounded-full flex items-center justify-center text-sm" style={{ background: screenSharing ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.1)' }}>
          🖥️
        </button>
      </div>
    </div>
  )
}

function RemoteVideo({ participant }: { participant: Participant }) {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    if (videoRef.current && participant.stream) {
      videoRef.current.srcObject = participant.stream
    }
  }, [participant.stream])

  return (
    <div className="relative rounded-xl overflow-hidden" style={{ background: '#1a1a2e', aspectRatio: '16/9' }}>
      <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
      <div className="absolute bottom-2 left-2 px-2 py-1 rounded-lg text-[10px] font-medium" style={{ background: 'rgba(0,0,0,0.6)' }}>
        👤 {participant.name}
      </div>
    </div>
  )
}
