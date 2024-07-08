# Vircadia World

This project must be small (fewer lines of code, though no code golf). The scale MUST be balanced: more complexity = less lines of code to allow for that, OR if you want more lines of code, it must be less complex by an order of magnitude, but even then the lines of code must be minimal.

Stack:

1. Node.js (runtime)
1. tRPC with Express (router)

## Install

To get started, clone the repository and install the dependencies:

```sh
npm install
```

## Develop

To run all apps and packages in development mode, run the following command:

```sh
npm run dev
```

## Architecture


### 1. Overview
This document outlines the design for a flexible, scalable, and secure game framework that supports peer-to-peer interactions with central server validation. The framework is built on a foundation of Conflict-free Replicated Data Types (CRDTs) to manage distributed state and uses glTF files for world representation.

### 2. Architecture
The framework is structured in layers:
- Network Layer
- CRDT Layer
- Store (Actions/Mutations)
- Game Logic Layer
- Management Layer

#### 2.1 Network Layer
Handles peer-to-peer connections and communication with the central server.

#### 2.2 CRDT Layer
Manages distributed state using CRDTs to ensure eventual consistency across all peers.

#### 2.3 Store
Combines storage and actions (mutations) into a single layer, similar to Vuex in Vue 2.

#### 2.4 Game Logic Layer
Implements game-specific logic and rules.

#### 2.5 Management Layer
Handles higher-level concerns such as interest management, connection management, and permissions.

### 3. Key Components
#### 3.1 Store
The central component for state management and mutations.

#### 3.2 World Representation
The game world is represented using glTF files, which are managed and segmented for efficient loading and rendering.

#### 3.3 Server-side Culling
Implements visibility checks on the server to prevent cheating.

### 4. Key Features
#### 4.1 Peer-to-Peer with Central Validation
- Clients connect peer-to-peer and to a central server
- All changes are validated by the central server

#### 4.2 Action-based State Changes
- State changes are defined as "actions" with associated rules
- Actions are validated against rulesets before application

#### 4.3 CRDT-based State Management
- Ensures eventual consistency across all peers
- Handles concurrent edits without central coordination

#### 4.4 Interest Management
- Implemented in the Management Layer
- Determines which game objects each client needs to know about

#### 4.5 Permissions System
- Controls access to different parts of the game world
- Integrated with the interest management system

### 5. Optimizations
#### 5.1 Delta CRDTs
Use delta-based CRDTs to reduce bandwidth usage by only sending changes.

#### 5.2 Batching
Group multiple CRDT operations into a single network message to reduce overhead.

#### 5.3 Compression
Apply compression techniques to CRDT messages to further reduce bandwidth usage.

#### 5.4 Adaptive Update Rates
Adjust update frequency based on network conditions and game requirements.

### 6. Security Measures
#### 6.1 Server-side Validation
All critical game logic and state changes are validated on the server.

#### 6.2 Cryptographic Signing
Actions are cryptographically signed to prevent tampering.

#### 6.3 Periodic Full State Validation
The server periodically validates the full game state to detect any inconsistencies.

### 7. Challenges and Solutions
#### 7.1 Latency
- Challenge: P2P connections can introduce variable latency.
- Solution: Implement client-side prediction and server reconciliation.

#### 7.2 Scalability
- Challenge: Increased network traffic and processing load with many peers.
- Solution: Use interest management and spatial partitioning to limit update scope.

#### 7.3 Synchronization Complexity
- Challenge: Ensuring consistent world state across all peers.
- Solution: Use CRDTs for eventual consistency, with server as final arbiter.

#### 7.4 Cheating Prevention
- Challenge: Malicious clients modifying local code or state.
- Solution: Server-side validation, obfuscation, and cryptographic signing of actions.

### 8. Future Considerations
- Implement a versioning system for world segments
- Develop tools for content creation and world editing
- Explore integration with existing game engines
- Investigate machine learning for dynamic interest management and anti-cheat systems

### 9. Conclusion

This framework provides a flexible and secure foundation for building multiplayer games with distributed state management. By leveraging CRDTs, peer-to-peer networking, and central server validation, it offers a balance of responsiveness and consistency. The layered architecture allows for easy extension and modification to suit various game types and requirements.
