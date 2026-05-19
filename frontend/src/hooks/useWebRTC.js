import { useState, useEffect, useRef, useCallback } from 'react';
import Peer from 'peerjs';

export function useWebRTC(meetingId, isInterviewer, localStream) {
  const [peer, setPeer] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const connectionRef = useRef(null);
  const callRef = useRef(null);

  useEffect(() => {
    if (!meetingId) return;

    // Deterministic IDs so peers can find each other based on meeting ID.
    // E.g., meeting 5: interviewer = peer_5_host, interviewee = peer_5_guest
    const myId = `peer_${meetingId}_${isInterviewer ? 'host' : 'guest'}`;
    const targetId = `peer_${meetingId}_${isInterviewer ? 'guest' : 'host'}`;

    const newPeer = new Peer(myId, {
      debug: 1,
      // Uses the free public PeerJS cloud server
    });

    newPeer.on('open', (id) => {
      console.log('My WebRTC ID is: ' + id);
      setConnectionStatus('ready');
      setPeer(newPeer);

      // If we are the interviewer, let's try calling the guest immediately if we both join exact same time.
      // But usually better to wait for incoming calls or a manual 'call' action.
    });

    // Handle incoming calls (Interviewee calling Interviewer, or vice-versa)
    newPeer.on('call', (call) => {
      console.log('Receiving incoming call from', call.peer);
      call.answer(localStream); // Answer with our local stream (if any)
      
      call.on('stream', (incomingStream) => {
        console.log('Received remote stream');
        setRemoteStream(incomingStream);
        setConnectionStatus('connected');
      });

      call.on('close', () => {
        setRemoteStream(null);
        setConnectionStatus('disconnected');
      });

      callRef.current = call;
    });

    newPeer.on('error', (err) => {
      console.error('PeerJS error:', err);
      if (err.type === 'peer-unavailable') {
         // The other party hasn't joined yet
         setConnectionStatus('waiting_for_peer');
      } else {
         setConnectionStatus('error');
      }
    });

    return () => {
      if (callRef.current) callRef.current.close();
      newPeer.destroy();
    };
  }, [meetingId, isInterviewer, localStream]);

  // Method to actively initiate a call to the other peer
  const callPeer = useCallback(() => {
    if (!peer || !localStream) {
      console.warn("Cannot call: peer or stream not ready.");
      return;
    }
    const targetId = `peer_${meetingId}_${isInterviewer ? 'guest' : 'host'}`;
    console.log("Calling peer: ", targetId);
    
    const call = peer.call(targetId, localStream);
    
    call.on('stream', (incomingStream) => {
      console.log('Received remote stream (we called)');
      setRemoteStream(incomingStream);
      setConnectionStatus('connected');
    });

    call.on('close', () => {
      setRemoteStream(null);
      setConnectionStatus('disconnected');
    });

    call.on('error', (err) => {
       console.error("Call error", err);
    });

    callRef.current = call;
  }, [peer, meetingId, isInterviewer, localStream]);

  return { peer, remoteStream, connectionStatus, callPeer };
}
