// Wasteland: Scrap & Glory - Chat & Raid Real-time Service
// Port 3003 — Socket.io mini-service
// Caddy path "/" ile forward (XTransformPort=3003)

import { createServer } from 'http'
import { Server } from 'socket.io'

const httpServer = createServer()
const io = new Server(httpServer, {
  path: '/',
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  },
  pingTimeout: 60000,
  pingInterval: 25000,
})

// ============================================================
// ROOM YAPISI
// ============================================================
// clan:<clanId>     — klan sohbet odası
// raid:<raidId>     — raid odası (boss HP yayın)
// global-boss       — haftalık global boss odası

interface ConnectedUser {
  socketId: string
  playerId: string
  playerName: string
  faction: string
  clanId: string | null
}

const users = new Map<string, ConnectedUser>() // socketId → user

// ============================================================
// CONNECTION HANDLER
// ============================================================

io.on('connection', (socket) => {
  console.log(`[WS] Connected: ${socket.id}`)

  // --- AUTHENTICATE ---
  socket.on('auth', (data: { playerId: string; playerName: string; faction: string; clanId?: string | null }) => {
    const user: ConnectedUser = {
      socketId: socket.id,
      playerId: data.playerId,
      playerName: data.playerName,
      faction: data.faction,
      clanId: data.clanId ?? null,
    }
    users.set(socket.id, user)
    console.log(`[WS] Auth: ${data.playerName} (${data.playerId})`)

    // Klan odasına otomatik katıl
    if (user.clanId) {
      socket.join(`clan:${user.clanId}`)
      socket.to(`clan:${user.clanId}`).emit('clan-user-joined', { playerName: user.playerName })
    }

    socket.emit('auth-ok', { socketId: socket.id })
  })

  // --- CLAN CHAT ---
  socket.on('clan-join', (data: { clanId: string }) => {
    const user = users.get(socket.id)
    if (!user) return
    // Önce eski klan odasından çık
    if (user.clanId) {
      socket.leave(`clan:${user.clanId}`)
    }
    user.clanId = data.clanId
    socket.join(`clan:${data.clanId}`)
    console.log(`[WS] ${user.playerName} joined clan room: ${data.clanId}`)
  })

  socket.on('clan-leave', () => {
    const user = users.get(socket.id)
    if (!user || !user.clanId) return
    socket.leave(`clan:${user.clanId}`)
    socket.to(`clan:${user.clanId}`).emit('clan-user-left', { playerName: user.playerName })
    user.clanId = null
  })

  socket.on('clan-message', (data: { content: string }) => {
    const user = users.get(socket.id)
    if (!user || !user.clanId) return
    if (!data.content || data.content.trim().length === 0) return
    if (data.content.length > 500) return

    const message = {
      id: Math.random().toString(36).substring(2, 11),
      senderId: user.playerId,
      senderName: user.playerName,
      senderFaction: user.faction,
      content: data.content.trim(),
      timestamp: new Date().toISOString(),
    }
    // Klan odasına yayın (sender hariç — kendi UI'ı API ile zaten günceller)
    socket.to(`clan:${user.clanId}`).emit('clan-message', message)
    // Sender'a da echo (optimistic update için confirmation)
    socket.emit('clan-message-echo', message)
  })

  // --- RAID REAL-TIME ---
  socket.on('raid-join', (data: { raidId: string }) => {
    socket.join(`raid:${data.raidId}`)
    console.log(`[WS] ${socket.id} joined raid room: ${data.raidId}`)
  })

  socket.on('raid-attack', (data: { raidId: string; damage: number; playerName: string }) => {
    // Boss HP güncellemesi API üzerinden DB'ye yazılır; socket sadece yayın yapar
    const attackInfo = {
      raidId: data.raidId,
      playerName: data.playerName,
      damage: data.damage,
      timestamp: new Date().toISOString(),
    }
    socket.to(`raid:${data.raidId}`).emit('raid-attack', attackInfo)
  })

  socket.on('raid-boss-update', (data: { raidId: string; currentHp: number; maxHp: number; defeated: boolean }) => {
    // Boss HP güncellemesi — tüm raid odasına yayın
    io.to(`raid:${data.raidId}`).emit('raid-boss-update', data)
  })

  // --- GLOBAL BOSS ---
  socket.on('global-boss-join', () => {
    socket.join('global-boss')
  })

  socket.on('global-boss-attack', (data: { damage: number; playerName: string }) => {
    socket.to('global-boss').emit('global-boss-attack', {
      playerName: data.playerName,
      damage: data.damage,
      timestamp: new Date().toISOString(),
    })
  })

  socket.on('global-boss-update', (data: { currentHp: number; maxHp: number; defeated: boolean }) => {
    io.to('global-boss').emit('global-boss-update', data)
  })

  // --- DISCONNECT ---
  socket.on('disconnect', () => {
    const user = users.get(socket.id)
    if (user) {
      if (user.clanId) {
        socket.to(`clan:${user.clanId}`).emit('clan-user-left', { playerName: user.playerName })
      }
      users.delete(socket.id)
      console.log(`[WS] Disconnected: ${user.playerName}`)
    }
  })

  socket.on('error', (error) => {
    console.error(`[WS] Socket error (${socket.id}):`, error)
  })
})

// ============================================================
// HEALTH CHECK
// ============================================================
httpServer.on('request', (req, res) => {
  if (req.url === '/health' || req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ ok: true, service: 'wasteland-chat', connectedUsers: users.size }))
  }
})

const PORT = 3003
httpServer.listen(PORT, () => {
  console.log(`[WS] Wasteland chat service running on port ${PORT}`)
  console.log(`[WS] Ready for clan/raid/global-boss rooms`)
})

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[WS] SIGTERM received, shutting down...')
  io.close(() => {
    httpServer.close(() => process.exit(0))
  })
})

process.on('SIGINT', () => {
  console.log('[WS] SIGINT received, shutting down...')
  io.close(() => {
    httpServer.close(() => process.exit(0))
  })
})
