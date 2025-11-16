import { useEffect, useState, useRef, useCallback } from "react";
import { MAX_RECONNECT_ATTEMPTS, RECONNECT_DELAY_MS } from "~/constants/game";

type UseSocketProps = {
	gameId: string
}

export function useSocket({ gameId }: UseSocketProps) {
	const [data, setData] = useState<{ type: string; payload: any } | null>(null)
	const [isConnected, setIsConnected] = useState(false)
	const [isConnecting, setIsConnecting] = useState(false)
	const [isReconnecting, setIsReconnecting] = useState(false)
	const [reconnectAttempts, setReconnectAttempts] = useState(0)
	const ws = useRef<WebSocket | null>(null)
	const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
	const shouldConnect = useRef(true)
	const url = import.meta.env.VITE_WS_URL

	const connect = useCallback(() => {
		if (!shouldConnect.current) return
		setIsConnecting(true)
		setIsConnected(false)
		// Generate a unique client ID for this session
		const clientId = crypto.randomUUID()
		const userName = "Player" // TODO: Get from user auth/profile
		const type = "player"

		const wsUrl = `${url}/${gameId}?clientId=${clientId}&userName=${encodeURIComponent(userName)}&type=${type}`
		ws.current = new WebSocket(wsUrl)

		ws.current.onopen = () => {
			setIsConnected(true)
			setIsConnecting(false)
			setIsReconnecting(false)
			setReconnectAttempts(0)
		}

		ws.current.onmessage = (e: MessageEvent) => {
			try {
				const msg = JSON.parse(e.data)
				setData(msg)
			} catch (error) {
				console.error('Failed to parse WebSocket message:', error)
				console.error('Raw message data:', e.data)
			}
		}

		ws.current.onclose = (e) => {
			setIsConnected(false)
			setIsConnecting(false)
			setReconnectAttempts(currentAttempts => {
				if (!e.wasClean && shouldConnect.current && currentAttempts < MAX_RECONNECT_ATTEMPTS) {
					const baseDelay = RECONNECT_DELAY_MS * Math.pow(2, currentAttempts)
					const randomOffset = Math.random() * 0.5
					const delay = baseDelay * (1 + randomOffset)

					setIsReconnecting(true)

					reconnectTimeoutRef.current = setTimeout(() => {
						if (shouldConnect.current) connect()
					}, delay)

					return currentAttempts + 1
				} else if (currentAttempts >= MAX_RECONNECT_ATTEMPTS) {
					setIsReconnecting(false)
				}
				return currentAttempts
			})
		}

		ws.current.onerror = (error) => {
			console.error('WEBSOCKET ERROR:', error)
			console.error(`Connection URL was: ${wsUrl}`)
		}
	}, [gameId, url])

	useEffect(() => {
		shouldConnect.current = true
		connect()
		return () => {
			shouldConnect.current = false
			if (reconnectTimeoutRef.current) {
				clearTimeout(reconnectTimeoutRef.current)
				reconnectTimeoutRef.current = null
			}
			ws.current?.close(1000, "UNMOUNT")
		}
	}, [gameId, connect])

	// TODO: add enum of payload types with the backend
	function sendMsg(type: string, payload: any) {
		if (ws.current && isConnected) {
			const msg = {
				type, payload
			}
			ws.current.send(JSON.stringify(msg))
		} else {
			console.warn('Cannot send message - WebSocket not ready:', {
				wsExists: !!ws.current,
				isConnected,
				isConnecting,
				readyState: ws.current?.readyState
			})
		}
	}

	const reconnect = useCallback(() => {
		setReconnectAttempts(0)
		if (ws.current) {
			ws.current.close(1000, "RECONNECT")
		}
		connect()
	}, [connect])

	return {
		data,
		isConnected,
		isConnecting,
		isReconnecting,
		reconnectAttempts,
		maxReconnectAttempts: MAX_RECONNECT_ATTEMPTS,
		sendMsg,
		reconnect
	}
}
