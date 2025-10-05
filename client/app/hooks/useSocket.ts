import { useEffect, useState, useRef, useCallback } from "react";

type SocketProps = {
	gameId: string
}

const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY = 2000; // Start with 2 seconds

export function useSocket({ gameId }: SocketProps) {
	const [data, setData] = useState<{ type: string; payload: any } | null>(null)
	const [isConnected, setIsConnected] = useState(false)
	const [isReconnecting, setIsReconnecting] = useState(false)
	const [reconnectAttempts, setReconnectAttempts] = useState(0)
	const ws = useRef<WebSocket | null>(null)
	const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
	const shouldConnect = useRef(true)
	const url = import.meta.env.VITE_WS_URL

	const connect = useCallback(() => {
		if (!shouldConnect.current) return

		// Generate a unique client ID for this session
		const clientId = crypto.randomUUID()
		const userName = "Player" // TODO: Get from user auth/profile
		const type = "player"

		const wsUrl = `${url}/${gameId}?clientId=${clientId}&userName=${encodeURIComponent(userName)}&type=${type}`
		console.log(`🔗 Creating WebSocket connection to: ${wsUrl}`)

		ws.current = new WebSocket(wsUrl)

		ws.current.onopen = () => {
			console.log('✅ WEBSOCKET CONNECTED SUCCESSFULLY')
			console.log(`📡 Connection URL: ${wsUrl}`)
			setIsConnected(true)
			setIsReconnecting(false)
			setReconnectAttempts(0)
		}

		ws.current.onmessage = (e: MessageEvent) => {
			console.log(`📥 WEBSOCKET MESSAGE RECEIVED:`)
			console.log(`  - Raw data: ${e.data}`)
			try {
				const msg = JSON.parse(e.data)
				console.log(`  - Parsed message:`)
				console.log(`    - Type: "${msg.type}"`)
				console.log(`    - Payload:`, msg.payload)
				setData(msg)
				console.log(`✅ Message processed and data state updated`)
			} catch (error) {
				console.error('❌ Failed to parse WebSocket message:', error)
				console.error('Raw message data:', e.data)
			}
		}

		ws.current.onclose = (e) => {
			console.log(`❌ WEBSOCKET CONNECTION CLOSED`)
			console.log(`  - Code: ${e.code}`)
			console.log(`  - Reason: ${e.reason}`)
			console.log(`  - Was clean: ${e.wasClean}`)
			setIsConnected(false)

			// Only attempt reconnection if it wasn't a clean close and we should still be connected
			// Use current reconnectAttempts value directly instead of relying on closure
			setReconnectAttempts(currentAttempts => {
				if (!e.wasClean && shouldConnect.current && currentAttempts < MAX_RECONNECT_ATTEMPTS) {
					const delay = RECONNECT_DELAY * Math.pow(2, currentAttempts) // Exponential backoff
					console.log(`🔄 Attempting reconnection ${currentAttempts + 1}/${MAX_RECONNECT_ATTEMPTS} in ${delay}ms`)
					setIsReconnecting(true)

					reconnectTimeoutRef.current = setTimeout(() => {
						if (shouldConnect.current) {
							connect()
						}
					}, delay)

					return currentAttempts + 1
				} else if (currentAttempts >= MAX_RECONNECT_ATTEMPTS) {
					console.error(`❌ Max reconnection attempts (${MAX_RECONNECT_ATTEMPTS}) reached. Giving up.`)
					setIsReconnecting(false)
				}
				return currentAttempts
			})
		}

		ws.current.onerror = (error) => {
			console.error('❌ WEBSOCKET ERROR:', error)
			console.error(`Connection URL was: ${wsUrl}`)
		}
	}, [gameId, url])

	useEffect(() => {
		console.log(`🔌 WEBSOCKET INIT`)
		console.log(`📋 Connection details:`)
		console.log(`  - gameId: "${gameId}"`)
		console.log(`  - VITE_WS_URL: "${url}"`)

		shouldConnect.current = true
		connect()

		return () => {
			console.log(`🔌 Cleaning up WebSocket connection for gameId: ${gameId}`)
			shouldConnect.current = false
			if (reconnectTimeoutRef.current) {
				clearTimeout(reconnectTimeoutRef.current)
				reconnectTimeoutRef.current = null
			}
			ws.current?.close()
		}
	}, [gameId, connect])

	// TODO: add enum of payload types with the backend
	function sendMsg(type: string, payload: any) {
		console.log('🚀 sendMsg called:', { type, payload, isConnected, wsExists: !!ws.current })
		if (ws.current && isConnected) {
			const msg = {
				type, payload
			}
			console.log('📤 Sending WebSocket message:', msg)
			ws.current.send(JSON.stringify(msg))
			console.log('✅ Message sent successfully')
		} else {
			console.warn('❌ Cannot send message - WebSocket not ready:', { 
				wsExists: !!ws.current, 
				isConnected 
			})
		}
	}

	const reconnect = useCallback(() => {
		console.log('🔄 Manual reconnection triggered')
		setReconnectAttempts(0)
		if (ws.current) {
			ws.current.close()
		}
		connect()
	}, [connect])

	return {
		data,
		isConnected,
		isReconnecting,
		reconnectAttempts,
		maxReconnectAttempts: MAX_RECONNECT_ATTEMPTS,
		sendMsg,
		reconnect
	}
}
