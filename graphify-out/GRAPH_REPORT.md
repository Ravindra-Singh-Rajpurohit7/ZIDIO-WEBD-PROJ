# Graph Report - .  (2026-06-22)

## Corpus Check
- 15 files · ~22,920 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 49 nodes · 41 edges · 14 communities (8 shown, 6 thin omitted)
- Extraction: 54% EXTRACTED · 46% INFERRED · 0% AMBIGUOUS · INFERRED: 19 edges (avg confidence: 0.87)
- Token cost: 1,000 input · 500 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Backend Controllers & Models|Backend Controllers & Models]]
- [[_COMMUNITY_Frontend Router & Pages|Frontend Router & Pages]]
- [[_COMMUNITY_WebRTC & Realtime Socket System|WebRTC & Realtime Socket System]]
- [[_COMMUNITY_React Providers & Entry|React Providers & Entry]]
- [[_COMMUNITY_Project Entry & Overview Docs|Project Entry & Overview Docs]]
- [[_COMMUNITY_Tailwind UI & Visual Assets|Tailwind UI & Visual Assets]]
- [[_COMMUNITY_User Authentication Services|User Authentication Services]]
- [[_COMMUNITY_Real-Time Comms Design Concepts|Real-Time Comms Design Concepts]]
- [[_COMMUNITY_React Brand Asset|React Brand Asset]]
- [[_COMMUNITY_Vite Brand Asset|Vite Brand Asset]]
- [[_COMMUNITY_AI Summarization Concept|AI Summarization Concept]]
- [[_COMMUNITY_JWT Authentication Concept|JWT Authentication Concept]]
- [[_COMMUNITY_MERN Stack Concept|MERN Stack Concept]]
- [[_COMMUNITY_Team Collaboration Concept|Team Collaboration Concept]]

## God Nodes (most connected - your core abstractions)
1. `AppContent (Router Shell)` - 9 edges
2. `Express HTTP Server` - 7 edges
3. `App (Root Component)` - 4 edges
4. `IntellMeet Platform` - 3 edges
5. `MeetingRoom Page (WebRTC)` - 3 edges
6. `useWebRTC Hook (Peer Connections)` - 3 edges
7. `Socket Handler (WebRTC Signaling)` - 3 edges
8. `Auth Controller (JWT Logic)` - 3 edges
9. `AI Controller (Summary Generation)` - 3 edges
10. `WebRTC Video Conference` - 2 edges

## Surprising Connections (you probably didn't know these)
- `IntellMeet Brand Favicon (SVG)` --conceptually_related_to--> `IntellMeet Platform`  [INFERRED]
  frontend/client/public/favicon.svg → frontend/README.md
- `Hero Section Image` --conceptually_related_to--> `Tailwind CSS Glassmorphic UI`  [INFERRED]
  frontend/client/src/assets/hero.png → frontend/README.md
- `UI Icon Set (SVG)` --conceptually_related_to--> `Tailwind CSS Glassmorphic UI`  [INFERRED]
  frontend/client/public/icons.svg → frontend/README.md
- `React App Entry Point (index.html)` --references--> `IntellMeet Platform`  [INFERRED]
  frontend/client/index.html → frontend/README.md
- `Vite + React Template` --conceptually_related_to--> `IntellMeet Platform`  [INFERRED]
  frontend/client/README.md → frontend/README.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Real-Time Communication Stack** — root_readme_webrtc_video, root_readme_socketio_chat [EXTRACTED 0.95]

## Communities (14 total, 6 thin omitted)

### Community 0 - "Backend Controllers & Models"
Cohesion: 0.20
Nodes (10): MongoDB Connection (connectDB), AI Controller (Summary Generation), Meeting Controller, Team Controller, Error Handler Middleware, Meeting Model (Mongoose Schema), Summary Model (AI Output Schema), Team Model (Mongoose Schema) (+2 more)

### Community 1 - "Frontend Router & Pages"
Cohesion: 0.22
Nodes (9): Navbar Component, Dashboard Page, Login Page, Profile Page, Register Page, Teams Page (Collaboration), AI Service (OpenAI Client), API Service (Fetch Wrapper) (+1 more)

### Community 2 - "WebRTC & Realtime Socket System"
Cohesion: 0.40
Nodes (6): useSocket Hook (Socket.io), useWebRTC Hook (Peer Connections), Message Model (Mongoose Schema), MeetingRoom Page (WebRTC), Socket.io Server Instance, Socket Handler (WebRTC Signaling)

### Community 3 - "React Providers & Entry"
Cohesion: 0.40
Nodes (5): AuthProvider (Auth Context), ThemeProvider (Dark Mode), ToastProvider (Notifications), App (Root Component), ProtectedRoute (Auth Guard)

### Community 4 - "Project Entry & Overview Docs"
Cohesion: 0.50
Nodes (4): React App Entry Point (index.html), Vite + React Template, IntellMeet Brand Favicon (SVG), IntellMeet Platform

### Community 5 - "Tailwind UI & Visual Assets"
Cohesion: 0.67
Nodes (3): Hero Section Image, UI Icon Set (SVG), Tailwind CSS Glassmorphic UI

### Community 6 - "User Authentication Services"
Cohesion: 0.67
Nodes (3): Auth Controller (JWT Logic), Auth Middleware (JWT Verify), User Model (Mongoose Schema)

### Community 7 - "Real-Time Comms Design Concepts"
Cohesion: 0.67
Nodes (3): WebRTC Mesh Topology, Socket.io Real-Time Chat, WebRTC Video Conference

## Knowledge Gaps
- **29 isolated node(s):** `Socket.io Real-Time Chat`, `JWT Authentication`, `AI Meeting Summary (OpenAI GPT-3.5)`, `Team Collaboration Workspace`, `MERN Full-Stack Architecture` (+24 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `AppContent (Router Shell)` connect `Frontend Router & Pages` to `WebRTC & Realtime Socket System`, `React Providers & Entry`?**
  _High betweenness centrality (0.278) - this node is a cross-community bridge._
- **Why does `Express HTTP Server` connect `Backend Controllers & Models` to `WebRTC & Realtime Socket System`, `User Authentication Services`?**
  _High betweenness centrality (0.264) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `IntellMeet Platform` (e.g. with `React App Entry Point (index.html)` and `Vite + React Template`) actually correct?**
  _`IntellMeet Platform` has 3 INFERRED edges - model-reasoned connections that need verification._
- **Are the 2 inferred relationships involving `MeetingRoom Page (WebRTC)` (e.g. with `useSocket Hook (Socket.io)` and `useWebRTC Hook (Peer Connections)`) actually correct?**
  _`MeetingRoom Page (WebRTC)` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Socket.io Real-Time Chat`, `JWT Authentication`, `AI Meeting Summary (OpenAI GPT-3.5)` to the rest of the system?**
  _30 weakly-connected nodes found - possible documentation gaps or missing edges._