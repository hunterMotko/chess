package websockets

import (
	"time"
)

// WebSocketConnection defines the interface for WebSocket connections
// This allows us to mock WebSocket connections in tests
type WebSocketConnection interface {
	Close() error
	WriteMessage(messageType int, data []byte) error
	ReadMessage() (messageType int, p []byte, err error)
	SetReadDeadline(t time.Time) error
	SetWriteDeadline(t time.Time) error
	SetPongHandler(h func(string) error)
	WriteControl(messageType int, data []byte, deadline time.Time) error
}

// ManagerInterface defines the interface for the Manager
// This allows us to mock the Manager in tests
type ManagerInterface interface {
	routeEvent(e Event, c *Client) error
	removeClient(c *Client)
	addClient(c *Client)
}