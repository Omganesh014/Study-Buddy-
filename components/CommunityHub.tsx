import React, { useEffect, useMemo, useRef, useState } from 'react';
import { UsersIcon } from '../constants';
import { auth, db } from '../services/firebase';
import {
  addDoc,
  collection,
  doc,
  deleteDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import Peer from 'simple-peer';

type Participant = { uid: string; displayName?: string|null; photoURL?: string|null; muted?: boolean; hasVideo?: boolean };
type ChatMsg = { id: string; senderUid: string; text: string };
const sharedTasks: {id: number, text: string, completed: boolean}[] = [];
const leaderboard: {id: number, name: string, score: number}[] = [];

const SidePanel: React.FC<{ roomId: string | null } & { messages: ChatMsg[]; onSend: (text: string) => Promise<void> }> = ({ roomId, messages, onSend }) => {
    const [activeTab, setActiveTab] = useState('chat');
    const [text, setText] = useState('');

    return (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg flex flex-col h-full">
            <div className="flex border-b border-gray-200 dark:border-gray-700 p-2">
                <button onClick={() => setActiveTab('chat')} className={`flex-1 py-2 text-sm font-semibold rounded-md transition-colors ${activeTab === 'chat' ? 'bg-violet-600 text-white' : 'hover:bg-gray-200 dark:hover:bg-gray-700'}`}>Chat</button>
                <button onClick={() => setActiveTab('tasks')} className={`flex-1 py-2 text-sm font-semibold rounded-md transition-colors ${activeTab === 'tasks' ? 'bg-violet-600 text-white' : 'hover:bg-gray-200 dark:hover:bg-gray-700'}`}>Tasks</button>
                <button onClick={() => setActiveTab('leaderboard')} className={`flex-1 py-2 text-sm font-semibold rounded-md transition-colors ${activeTab === 'leaderboard' ? 'bg-violet-600 text-white' : 'hover:bg-gray-200 dark:hover:bg-gray-700'}`}>Challenge</button>
            </div>
            <div className="flex-grow p-4 overflow-y-auto">
                {activeTab === 'chat' && (
                  <div className="space-y-3 h-full">
                    {messages.length > 0 ? messages.map(msg => (
                      <div key={msg.id}>
                        <span className="font-semibold text-violet-600 dark:text-violet-300 text-sm">{msg.senderUid.slice(0,5)}: </span>
                        <span className="text-gray-700 dark:text-gray-200">{msg.text}</span>
                      </div>
                    )) : (
                      <div className="flex items-center justify-center h-full text-center text-gray-500 dark:text-gray-400">
                        <p>No messages yet. <br/> Start the conversation!</p>
                      </div>
                    )}
                  </div>
                )}
                {activeTab === 'tasks' && (
                    <div className="space-y-2 h-full">
                        {sharedTasks.length > 0 ? sharedTasks.map(task => (
                             <div key={task.id} className={`flex items-center p-2 rounded-md ${task.completed ? 'bg-green-500/10' : ''}`}>
                                <input type="checkbox" defaultChecked={task.completed} className="form-checkbox h-4 w-4 rounded text-violet-500 bg-transparent border-gray-400 focus:ring-violet-500" />
                                <span className={`ml-2 ${task.completed ? 'line-through text-gray-500 dark:text-gray-400' : 'text-gray-900 dark:text-white'}`}>{task.text}</span>
                            </div>
                        )) : (
                             <div className="flex items-center justify-center h-full text-center text-gray-500 dark:text-gray-400">
                                <p>No shared tasks. <br/> Add one to get started.</p>
                            </div>
                        )}
                    </div>
                )}
                 {activeTab === 'leaderboard' && (
                    <div className="space-y-2 h-full">
                        {leaderboard.length > 0 ? leaderboard.sort((a,b) => b.score - a.score).map((player, index) => (
                             <div key={player.id} className="flex justify-between items-center p-2 bg-gray-100 dark:bg-gray-700 rounded-md">
                                <div>
                                    <span className="font-bold">{index + 1}. {player.name}</span>
                                </div>
                                <span className="font-semibold text-yellow-500 dark:text-yellow-400">{player.score} FP</span>
                            </div>
                        )) : (
                             <div className="flex items-center justify-center h-full text-center text-gray-500 dark:text-gray-400">
                                <p>Complete a focus session to appear on the leaderboard.</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
             <div className="p-4 border-t border-gray-200 dark:border-gray-700">
               <div className="flex gap-2">
                 <input
                   type="text"
                   value={text}
                   onChange={(e) => setText(e.target.value)}
                   placeholder={roomId ? 'Type a message...' : 'Join a room to chat'}
                   disabled={!roomId}
                   className="flex-1 p-2 bg-gray-100 dark:bg-gray-900 rounded border border-gray-300 dark:border-gray-600 focus:ring-violet-500 focus:border-violet-500"
                 />
                 <button
                   onClick={async () => { if (!text.trim()) return; await onSend(text.trim()); setText(''); }}
                   disabled={!roomId || !text.trim()}
                   className="px-3 py-2 bg-violet-600 disabled:bg-violet-400 text-white rounded"
                 >Send</button>
               </div>
            </div>
        </div>
    );
};

const CommunityHub: React.FC = () => {
    const urlRoomId = useMemo(() => new URLSearchParams(window.location.search).get('roomId'), []);
    const [roomId, setRoomId] = useState<string | null>(urlRoomId);
    const [link, setLink] = useState<string>('');
    const [participants, setParticipants] = useState<Participant[]>([]);
    const [messages, setMessages] = useState<ChatMsg[]>([]);
    const [micOn, setMicOn] = useState(false);
    const [camOn, setCamOn] = useState(false);
    const localVideoRef = useRef<HTMLVideoElement | null>(null);
    const localStreamRef = useRef<MediaStream | null>(null);
    const peersRef = useRef<Map<string, Peer.Instance>>(new Map());
    const [remoteStreams, setRemoteStreams] = useState<{ uid: string; stream: MediaStream }[]>([]);
    const user = auth.currentUser;

    // Join a room: write participant doc and subscribe to data
    const joinRoom = async (targetRoomId: string) => {
      if (!auth.currentUser) return;
      const uid = auth.currentUser.uid;
      await setDoc(doc(db, 'rooms', targetRoomId, 'participants', uid), {
        uid,
        displayName: auth.currentUser.displayName,
        photoURL: auth.currentUser.photoURL,
        joinedAt: serverTimestamp(),
        muted: false,
        hasVideo: true,
      }, { merge: true });
      setRoomId(targetRoomId);
      const url = new URL(window.location.href);
      url.searchParams.set('roomId', targetRoomId);
      window.history.replaceState({}, '', url.toString());

      // AV is now user-triggered via Start Video button to avoid permission-related crashes
    };

    // Create room then join
    const createRoom = async () => {
      const id = crypto.randomUUID();
      await setDoc(doc(db, 'rooms', id), {
        name: 'Focus Room',
        createdBy: auth.currentUser?.uid || 'anonymous',
        isLocked: false,
        createdAt: serverTimestamp(),
        currentTimer: { state: 'paused', secondsLeft: 25*60, updatedAt: serverTimestamp() }
      });
      const share = `${window.location.origin}${window.location.pathname}?roomId=${id}`;
      setLink(share);
      await joinRoom(id);
    };

    // Subscribe to participants/messages when roomId is set
    useEffect(() => {
      if (!roomId) return;
      const unsubP = onSnapshot(collection(db, 'rooms', roomId, 'participants'), (snap) => {
        setParticipants(snap.docs.map(d => d.data() as Participant));
      });
      const q = query(collection(db, 'rooms', roomId, 'messages'), orderBy('createdAt', 'asc'));
      const unsubM = onSnapshot(q, (snap) => {
        setMessages(snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })));
      });
      setLink(`${window.location.origin}${window.location.pathname}?roomId=${roomId}`);
      return () => { unsubP(); unsubM(); stopSignalsListener(); };
    }, [roomId]);

    const sendMessage = async (text: string) => {
      if (!roomId || !auth.currentUser) return;
      await addDoc(collection(db, 'rooms', roomId, 'messages'), {
        text,
        senderUid: auth.currentUser.uid,
        createdAt: serverTimestamp(),
      });
    };

    const ensureLocalMedia = async () => {
      if (localStreamRef.current) return localStreamRef.current;
      if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return null as any;
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true }).catch(() => null);
      if (!stream) return null as any;
      localStreamRef.current = stream;
      setMicOn(stream.getAudioTracks().some(t => t.enabled));
      setCamOn(stream.getVideoTracks().some(t => t.enabled));
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        localVideoRef.current.muted = true;
        await localVideoRef.current.play().catch(() => {});
      }
      return stream;
    };

    const toggleMic = () => {
      const s = localStreamRef.current; if (!s) return;
      s.getAudioTracks().forEach(t => t.enabled = !t.enabled);
      setMicOn(s.getAudioTracks().every(t => t.enabled));
    };
    const toggleCam = () => {
      const s = localStreamRef.current; if (!s) return;
      s.getVideoTracks().forEach(t => t.enabled = !t.enabled);
      setCamOn(s.getVideoTracks().every(t => t.enabled));
    };
    const shareScreen = async () => {
      if (!roomId) return;
      if (!('mediaDevices' in navigator) || !(navigator.mediaDevices as any).getDisplayMedia) return;
      const ds: any = await (navigator.mediaDevices as any).getDisplayMedia({ video: true }).catch(() => null);
      if (!ds) return;
      const videoTrack: MediaStreamTrack = ds.getVideoTracks()[0];
      peersRef.current.forEach(peer => {
        const sender: any = (peer as any)._pc?.getSenders().find((s: RTCRtpSender) => s.track && s.track.kind === 'video');
        if (sender) sender.replaceTrack(videoTrack);
      });
      videoTrack.onended = () => {
        const s = localStreamRef.current; if (!s) return;
        const camTrack = s.getVideoTracks()[0];
        peersRef.current.forEach(peer => {
          const sender: any = (peer as any)._pc?.getSenders().find((s: RTCRtpSender) => s.track && s.track.kind === 'video');
          if (sender) sender.replaceTrack(camTrack);
        });
      };
    };

    const signalsUnsubRef = useRef<() => void>();
    const startSignalsListener = (rid: string) => {
      stopSignalsListener();
      if (!auth.currentUser) return;
      const myUid = auth.currentUser.uid;
      const qSig = query(collection(db, 'rooms', rid, 'signals'), where('toUid','==', myUid));
      signalsUnsubRef.current = onSnapshot(qSig, (snap) => {
        snap.docChanges().forEach(change => {
          if (change.type !== 'added') return;
          const data: any = change.doc.data();
          const from = data.fromUid as string;
          let peer = peersRef.current.get(from);
          if (!peer) peer = createPeer(from, false);
          try { peer.signal(data.payload); } catch {}
        });
      });
    };
    const stopSignalsListener = () => { if (signalsUnsubRef.current) { signalsUnsubRef.current(); signalsUnsubRef.current = undefined; } };

    const createPeer = (otherUid: string, initiator: boolean) => {
      const existing = peersRef.current.get(otherUid);
      if (existing) return existing;
      const stream = localStreamRef.current; if (!stream) return undefined as any;
      const peer = new Peer({ initiator, trickle: true, stream });
      peersRef.current.set(otherUid, peer);
      peer.on('signal', async (data) => {
        if (!roomId || !auth.currentUser) return;
        await addDoc(collection(db, 'rooms', roomId, 'signals'), {
          fromUid: auth.currentUser.uid,
          toUid: otherUid,
          type: (data as any).type,
          payload: data,
          createdAt: serverTimestamp(),
        });
      });
      peer.on('stream', (remote: MediaStream) => {
        setRemoteStreams(prev => {
          const next = prev.filter(p => p.uid !== otherUid);
          return [...next, { uid: otherUid, stream: remote }];
        });
      });
      const cleanup = () => {
        peersRef.current.delete(otherUid);
        setRemoteStreams(prev => prev.filter(p => p.uid !== otherUid));
      };
      peer.on('close', cleanup);
      peer.on('error', cleanup);
      return peer;
    };

    useEffect(() => {
      if (!roomId || !auth.currentUser || !localStreamRef.current) return;
      const myUid = auth.currentUser.uid;
      const others = participants.map(p => p.uid).filter(uid => uid !== myUid);
      others.forEach(uid => {
        if (!peersRef.current.get(uid)) {
          const initiator = myUid > uid;
          createPeer(uid, initiator);
        }
      });
      peersRef.current.forEach((peer, uid) => {
        if (!others.includes(uid)) {
          try { peer.destroy(); } catch {}
          peersRef.current.delete(uid);
        }
      });
    }, [participants, roomId]);

    const leaveRoom = async () => {
      try {
        stopSignalsListener();
        peersRef.current.forEach(p => { try { p.destroy(); } catch {} });
        peersRef.current.clear();
        setRemoteStreams([]);
        if (localStreamRef.current) {
          localStreamRef.current.getTracks().forEach(t => { try { t.stop(); } catch {} });
          localStreamRef.current = null;
        }
        if (roomId && auth.currentUser) {
          const ref = doc(db, 'rooms', roomId, 'participants', auth.currentUser.uid);
          try { await deleteDoc(ref); } catch {}
        }
      } finally {
        const url = new URL(window.location.href);
        url.searchParams.delete('roomId');
        window.history.replaceState({}, '', url.toString());
        setRoomId(null);
        setParticipants([]);
        setMessages([]);
        setLink('');
        setMicOn(false); setCamOn(false);
      }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[85vh] animate-fade-in">
            {/* Main Content: Video Chat */}
            <div className="lg:col-span-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg flex flex-col p-4">
                 <div className="flex items-center justify-between mb-4">
                   <h2 className="text-xl font-bold">Focus Room</h2>
                   <div className="flex items-center gap-2">
                    {!roomId && (
                      <>
                        <button onClick={createRoom} className="px-3 py-2 bg-violet-600 text-white rounded hover:bg-violet-700">Create Room</button>
                        <button onClick={() => { const id = prompt('Enter Room ID'); if (id) joinRoom(id); }} className="px-3 py-2 border rounded">Join by ID</button>
                      </>
                    )}
                    {roomId && (
                      <div className="flex items-center gap-2">
                        <input readOnly value={link} className="hidden md:block w-64 p-2 rounded border dark:bg-gray-700" />
                        <button onClick={() => navigator.clipboard.writeText(link)} className="px-3 py-2 border rounded">Copy Link</button>
                        <button onClick={async () => { const s = await ensureLocalMedia(); if (s) startSignalsListener(roomId); }} className="px-3 py-2 border rounded">Start Video</button>
                      </div>
                    )}
                  </div>
                 </div>
                <div className="flex-grow grid grid-cols-2 gap-4">
                    {participants.length > 0 ? (
                        <>
                          <div className="bg-black rounded-lg relative flex items-center justify-center">
                            <video ref={localVideoRef} className="w-full h-full object-cover rounded-lg" playsInline muted></video>
                            <div className="absolute bottom-2 left-2 bg-black/50 text-white text-sm px-2 py-1 rounded-md">You</div>
                          </div>
                          {remoteStreams.map(r => (
                            <div key={r.uid} className="bg-black rounded-lg relative flex items-center justify-center">
                              <video className="w-full h-full object-cover rounded-lg" playsInline autoPlay ref={(el) => { if (el && r.stream) { el.srcObject = r.stream; el.play().catch(()=>{}); }}} />
                              <div className="absolute bottom-2 left-2 bg-black/50 text-white text-sm px-2 py-1 rounded-md">{r.uid.slice(0,6)}</div>
                            </div>
                          ))}
                        </>
                    ) : (
                        <div className="col-span-2 flex flex-col items-center justify-center text-gray-500 dark:text-gray-400 border-2 border-dashed border-gray-400 dark:border-gray-600 rounded-lg">
                            <UsersIcon className="w-16 h-16 mb-4" />
                            <p className="text-lg font-semibold">The focus room is empty.</p>
                            <p className="text-sm">You're the first one here!</p>
                        </div>
                    )}
                </div>
                 <div className="flex justify-center items-center gap-4 mt-4 p-2 bg-gray-100 dark:bg-gray-900 rounded-xl">
                    <button onClick={toggleMic} disabled={!roomId} className="p-3 bg-gray-200 dark:bg-gray-700 rounded-full hover:bg-gray-300 dark:hover:bg-gray-600 text-xl" title={micOn ? 'Mute' : 'Unmute'}>{micOn ? '🎤' : '🔇'}</button>
                    <button onClick={toggleCam} disabled={!roomId} className="p-3 bg-gray-200 dark:bg-gray-700 rounded-full hover:bg-gray-300 dark:hover:bg-gray-600 text-xl" title={camOn ? 'Stop Video' : 'Start Video'}>{camOn ? '📷' : '🚫'}</button>
                    <button onClick={shareScreen} disabled={!roomId} className="p-3 bg-gray-200 dark:bg-gray-700 rounded-full hover:bg-gray-300 dark:hover:bg-gray-600 text-xl" title="Share Screen">🖥️</button>
                    <button onClick={leaveRoom} className="p-3 bg-red-600 text-white rounded-full hover:bg-red-700 text-xl" title="Leave">📞</button>
                 </div>
            </div>

            <div className="lg:col-span-1">
                <SidePanel roomId={roomId} messages={messages} onSend={sendMessage} />
            </div>
        </div>
    );
};

export default CommunityHub;