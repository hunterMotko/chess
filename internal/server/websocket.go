package server

import (
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/gorilla/websocket"
	"github.com/labstack/echo/v4"
)

var (
	upgrader = websocket.Upgrader{
		ReadBufferSize:  1024,
		WriteBufferSize: 1024,
		CheckOrigin: func(r *http.Request) bool {
			// Allow specific origins
			allowed := "http://localhost:5173"
			origin := r.Header.Get("Origin")
			if origin == allowed {
				return true
			}
			return false
		},
	}
)

type Message struct {
	Type    string `json:"type"`
	Payload string `json:"payload"`
}

func hello(c echo.Context) error {
	ws, err := upgrader.Upgrade(c.Response(), c.Request(), nil)
	if err != nil {
		return err
	}
	defer ws.Close()

	send := Message{
		Type:    "action",
		Payload: "fen string or something",
	}

	b, err := json.Marshal(send)
	if err != nil {
		return err
	}

	for {
		// Write
		err := ws.WriteMessage(websocket.TextMessage, b)
		if err != nil {
			c.Logger().Error(err)
		}

		// Read
		_, msg, err := ws.ReadMessage()
		if err != nil {
			c.Logger().Error(err)
		}
		fmt.Printf("%s\n", msg)
	}
}
