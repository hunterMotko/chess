import { useEffect, useState, useRef } from "react";

type SocketProps = {
	gameId: string
}

export function useSocket({ gameId }: SocketProps) {
	const [data, setData] = useState(null)
	const [isConnected, setIsConnected] = useState(false)
	const ws = useRef<WebSocket | null>(null)
	const url = import.meta.env.VITE_WS_URL

	useEffect(() => {
		ws.current = new WebSocket(`${url}/${gameId}`)
		console.log(ws.current)

		ws.current.onopen = () => {
			console.log('WS CONNECTED')
			setIsConnected(true)
		}

		ws.current.onmessage = (e: MessageEvent) => {
			try {
				const msg = JSON.parse(e.data)
				setData(msg)
			} catch (e) {
				console.error(e);
			}
		}

		ws.current.onclose = () => {
			console.log("WS CLOSED")
			setIsConnected(false)
		}

		ws.current.onerror = (e) => {
			console.error(e)
		}

		return () => {
			ws.current?.close()
		}
	}, [gameId])

	// TODO: add enum of payload types with the backend
	function sendMsg(type: string, payload: any) {
		if (ws.current && isConnected) {
			const msg = {
				type, payload
			}
			ws.current.send(JSON.stringify(msg))
		}
	}

	return { data, isConnected, sendMsg }
}
