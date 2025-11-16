package websockets

import (
	"encoding/json"
	"log"

	"github.com/corentings/chess/v2"
	"github.com/gorilla/websocket"
)

type Clients map[*Client]bool

type ClientType string

const (
	ClientTypePlayer    ClientType = "player"
	ClientTypeSpectator ClientType = "spectator"
)

type Client struct {
	conn    *websocket.Conn
	manager *Manager
	// egress is used to avoid concurrent writes on the websocket conn
	egress     chan Event
	gameState  *chess.Game
	gameId     string
	clientId   string
	userName   string
	clientType ClientType
}

func NewClient(
	conn *websocket.Conn,
	manager *Manager,
	gameId, clientId,
	userName string,
	clientType ClientType,
) *Client {
	return &Client{
		conn:       conn,
		manager:    manager,
		egress:     make(chan Event, 16), // Increased buffer for better performance
		gameState:  &chess.Game{},
		gameId:     gameId,
		clientId:   clientId,
		userName:   userName,
		clientType: clientType,
	}
}

func (c *Client) readMessages() {
	defer func() {
		// cleanup connection
		c.manager.removeClient(c)
	}()

	for {
		_, payload, err := c.conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(
				err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure,
			) {
				// WARN: Do we potentially need to handle this with reconnection?
				log.Printf("Error Reading Message: %v\n", err)
			}
			break
		}
		log.Printf("Received message from client %s: %s", c.clientId, string(payload))

		var req Event
		if err := json.Unmarshal(payload, &req); err != nil {
			log.Printf("ERROR UNMARSHALLING EVENT: %v\n", err)
			break
		}

		if err := c.manager.routeEvent(req, c); err != nil {
			log.Printf("ERROR ROUTING EVENT: %v\n", err)
		}
	}
}

func (c *Client) writeMessages() {
	defer func() {
		c.manager.removeClient(c)
	}()
	for {
		select {
		case message, ok := <-c.egress:
			if !ok {
				if err := c.conn.WriteMessage(websocket.CloseMessage, nil); err != nil {
					log.Printf("connection closed: %v\n", err)
				}
				return
			}

			log.Printf("🚀 Client %s preparing to send message type: %s", c.clientId, message.Type)

			data, err := json.Marshal(message)
			if err != nil {
				log.Printf("❌ ERROR MARSHALLING EVENT: %v\n", err)
				continue
			}

			if err := c.conn.WriteMessage(websocket.TextMessage, data); err != nil {
				log.Printf("❌ failed to send message to client %s: %v\n", c.clientId, err)
				continue
			}

			log.Printf("✅ Message sent successfully to client %s: %s", c.clientId, message.Type)
		}
	}
}
