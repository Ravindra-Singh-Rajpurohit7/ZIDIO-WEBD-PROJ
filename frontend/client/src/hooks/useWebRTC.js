import { useEffect, useRef, useState } from 'react';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19002' },
    { urls: 'stun:stun1.l.google.com:19002' },
    { urls: 'stun:stun2.l.google.com:19002' },
  ],
};

/**
 * Custom hook for WebRTC mesh peer-to-peer connections.
 */
export const useWebRTC = (meetingId, socket, user) => {
  const [localStream, setLocalStream] = useState(null);
  const [peers, setPeers] = useState([]); // List of active peers: { socketId, userName, stream }
  const peerConnections = useRef({}); // RTCPeerConnections mapped by socketId
  const localStreamRef = useRef(null);

  // Audio/Video/Screen share states
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const screenStreamRef = useRef(null);

  useEffect(() => {
    if (!socket || !meetingId || !user) return;

    const setupRTC = async () => {
      try {
        // 1. Get video and audio tracks
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        setLocalStream(stream);
        localStreamRef.current = stream;

        // 2. Emit room join trigger
        socket.emit('join-room', {
          meetingId,
          userId: user._id,
          userName: user.name,
        });

        // 3. Socket Event Handlers
        socket.on('get-all-users', async (usersInRoom) => {
          for (const peer of usersInRoom) {
            const pc = createPeerConnection(peer.socketId, peer.userName, stream);
            peerConnections.current[peer.socketId] = pc;

            // Create and send WebRTC offer
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            socket.emit('offer', { target: peer.socketId, offer });
          }
        });

        socket.on('offer', async ({ sender, offer }) => {
          const pc = createPeerConnection(sender, 'Remote Peer', localStreamRef.current);
          peerConnections.current[sender] = pc;

          await pc.setRemoteDescription(new RTCSessionDescription(offer));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket.emit('answer', { target: sender, answer });
        });

        socket.on('answer', async ({ sender, answer }) => {
          const pc = peerConnections.current[sender];
          if (pc) {
            await pc.setRemoteDescription(new RTCSessionDescription(answer));
          }
        });

        socket.on('ice-candidate', async ({ sender, candidate }) => {
          const pc = peerConnections.current[sender];
          if (pc && candidate) {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(candidate));
            } catch (err) {
              console.error('Error adding ICE candidate:', err);
            }
          }
        });

        socket.on('user-connected', ({ socketId, userName }) => {
          console.log(`Peer user connected: ${userName} (${socketId})`);
        });

        socket.on('user-disconnected', ({ socketId }) => {
          closePeer(socketId);
        });

      } catch (err) {
        console.error('WebRTC capturing stream error:', err.message);
      }
    };

    setupRTC();

    return () => {
      // Stop media track activities
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      // Shutdown peer socket tunnels
      Object.keys(peerConnections.current).forEach(closePeer);
      
      socket.off('get-all-users');
      socket.off('offer');
      socket.off('answer');
      socket.off('ice-candidate');
      socket.off('user-connected');
      socket.off('user-disconnected');
    };
  }, [meetingId, socket, user]);

  const createPeerConnection = (peerSocketId, peerName, stream) => {
    const pc = new RTCPeerConnection(ICE_SERVERS);

    // Relay candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('ice-candidate', {
          target: peerSocketId,
          candidate: event.candidate,
        });
      }
    };

    // Feed tracks to output interface
    if (stream) {
      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });
    }

    // Collect remote tracks
    pc.ontrack = (event) => {
      setPeers((prev) => {
        const exists = prev.some((p) => p.socketId === peerSocketId);
        if (exists) {
          return prev.map((p) =>
            p.socketId === peerSocketId ? { ...p, stream: event.streams[0] } : p
          );
        }
        return [...prev, { socketId: peerSocketId, userName: peerName, stream: event.streams[0] }];
      });
    };

    return pc;
  };

  const closePeer = (socketId) => {
    const pc = peerConnections.current[socketId];
    if (pc) {
      pc.close();
      delete peerConnections.current[socketId];
    }
    setPeers((prev) => prev.filter((p) => p.socketId !== socketId));
  };

  // Toggle Mute Audio
  const toggleAudio = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioMuted(!audioTrack.enabled);
      }
    }
  };

  // Toggle Video Off/On
  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoMuted(!videoTrack.enabled);
      }
    }
  };

  // Screen Share Toggle
  const toggleScreenShare = async () => {
    if (isScreenSharing) {
      // Stop display share tracks
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((t) => t.stop());
        screenStreamRef.current = null;
      }

      // Reconnect default camera feed
      try {
        const camStream = await navigator.mediaDevices.getUserMedia({ video: true });
        const cameraTrack = camStream.getVideoTracks()[0];

        const updatedStream = localStreamRef.current;
        const currentVideoTrack = updatedStream.getVideoTracks()[0];
        if (currentVideoTrack) {
          updatedStream.removeTrack(currentVideoTrack);
          currentVideoTrack.stop();
        }
        updatedStream.addTrack(cameraTrack);
        setLocalStream(new MediaStream(updatedStream.getTracks()));

        // Update tracks in active connections
        Object.values(peerConnections.current).forEach((pc) => {
          const sender = pc.getSenders().find((s) => s.track && s.track.kind === 'video');
          if (sender) {
            sender.replaceTrack(cameraTrack);
          }
        });

        setIsScreenSharing(false);
      } catch (err) {
        console.error('Error restoring camera stream:', err);
      }
    } else {
      // Turn on screenshare
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        screenStreamRef.current = stream;
        const screenTrack = stream.getVideoTracks()[0];

        // Replace track across connections
        Object.values(peerConnections.current).forEach((pc) => {
          const sender = pc.getSenders().find((s) => s.track && s.track.kind === 'video');
          if (sender) {
            sender.replaceTrack(screenTrack);
          }
        });

        // Set local capture stream reference
        const updatedStream = localStreamRef.current;
        const currentVideoTrack = updatedStream.getVideoTracks()[0];
        if (currentVideoTrack) {
          updatedStream.removeTrack(currentVideoTrack);
        }
        updatedStream.addTrack(screenTrack);
        setLocalStream(new MediaStream(updatedStream.getTracks()));

        // Catch stop click on browser native bar
        screenTrack.onended = () => {
          toggleScreenShare();
        };

        setIsScreenSharing(true);
      } catch (err) {
        console.error('Error acquiring display capture:', err);
      }
    }
  };

  return {
    localStream,
    peers,
    isAudioMuted,
    isVideoMuted,
    isScreenSharing,
    toggleAudio,
    toggleVideo,
    toggleScreenShare,
  };
};
