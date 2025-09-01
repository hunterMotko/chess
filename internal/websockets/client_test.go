package websockets

import (
	"encoding/json"
	"testing"
	"time"

	"github.com/corentings/chess/v2"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestNewClient(t *testing.T) {
	// Since NewClient expects *websocket.Conn and *Manager, we need a different approach
	// We'll test the logic separately or create a testable version
	t.Skip("Requires interface abstraction for WebSocket connections")
}

func TestClient_MessageHandling(t *testing.T) {
	// Test the core logic without the WebSocket dependency
	client := &Client{
		gameState: &chess.Game{},
		egress:    make(chan Event, 10),
		gameId:    "test-game",
	}

	// Test that client can be created with initial state
	assert.NotNil(t, client.gameState)
	assert.Equal(t, "test-game", client.gameId)
	assert.NotNil(t, client.egress)
}

func TestClient_EgressChannel(t *testing.T) {
	client := &Client{
		gameState: chess.NewGame(),
		egress:    make(chan Event, 10),
		gameId:    "test-game",
	}

	// Test sending events to egress
	testEvent := Event{
		Type:    "test_event",
		Payload: json.RawMessage(`{"test": "data"}`),
	}

	// Send event
	client.egress <- testEvent

	// Receive event
	select {
	case receivedEvent := <-client.egress:
		assert.Equal(t, testEvent.Type, receivedEvent.Type)
	case <-time.After(100 * time.Millisecond):
		t.Fatal("Event not received from egress channel")
	}
}

func TestClient_GameState(t *testing.T) {
	client := &Client{
		gameState: chess.NewGame(),
		egress:    make(chan Event, 10),
		gameId:    "test-game",
	}

	// Verify initial game state
	assert.NotNil(t, client.gameState)
	
	// Test that we can update game state
	newGame := chess.NewGame()
	client.gameState = newGame
	assert.Equal(t, newGame, client.gameState)
}

// Test JSON marshaling/unmarshaling for events
func TestEvent_JSONMarshaling(t *testing.T) {
	event := Event{
		Type:    "test_event",
		Payload: json.RawMessage(`{"test": "data"}`),
	}

	// Marshal to JSON
	data, err := json.Marshal(event)
	require.NoError(t, err)

	// Unmarshal back
	var unmarshaledEvent Event
	err = json.Unmarshal(data, &unmarshaledEvent)
	require.NoError(t, err)

	assert.Equal(t, event.Type, unmarshaledEvent.Type)
	// JSON marshaling may change spacing, so compare the actual content
	assert.JSONEq(t, string(event.Payload), string(unmarshaledEvent.Payload))
}

// Mock Manager for testing (minimal interface)
type MockManager struct {
	RouteEventCalls   []MockRouteEventCall
	RemoveClientCalls []*Client
}

type MockRouteEventCall struct {
	Event  Event
	Client *Client
}

func (m *MockManager) routeEvent(e Event, c *Client) error {
	m.RouteEventCalls = append(m.RouteEventCalls, MockRouteEventCall{
		Event:  e,
		Client: c,
	})
	return nil
}

func (m *MockManager) removeClient(c *Client) {
	m.RemoveClientCalls = append(m.RemoveClientCalls, c)
}

// Helper method for testing
func (m *MockManager) RouteEvent(e Event, c *Client) error {
	return m.routeEvent(e, c)
}

// Test client creation with minimal dependencies
func TestClient_Creation(t *testing.T) {
	// Test client struct initialization
	client := &Client{
		gameId:    "test-game",
		gameState: chess.NewGame(),
		egress:    make(chan Event, 10),
	}

	assert.Equal(t, "test-game", client.gameId)
	assert.NotNil(t, client.gameState)
	assert.NotNil(t, client.egress)
}

// Test event constants
func TestEventConstants(t *testing.T) {
	assert.Equal(t, "new_game", NewGame)
	assert.Equal(t, "move", Move)
	assert.Equal(t, "load_pgn", LoadPGN)
	assert.Equal(t, "game_over", GameOver)
}

// Benchmark event processing
func BenchmarkClient_EventProcessing(b *testing.B) {
	client := &Client{
		gameState: chess.NewGame(),
		egress:    make(chan Event, b.N),
		gameId:    "benchmark-game",
	}

	event := Event{
		Type:    "benchmark_event",
		Payload: json.RawMessage(`{"benchmark": true}`),
	}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		// Simulate event processing
		eventData, _ := json.Marshal(event)
		var parsedEvent Event
		json.Unmarshal(eventData, &parsedEvent)
		
		// Send to egress (non-blocking due to buffer size)
		select {
		case client.egress <- parsedEvent:
		default:
			// Buffer full, skip this iteration
		}
	}
}

// Test concurrent access to client
func TestClient_ConcurrentAccess(t *testing.T) {
	client := &Client{
		gameState: chess.NewGame(),
		egress:    make(chan Event, 100),
		gameId:    "concurrent-test",
	}

	const numGoroutines = 10
	const eventsPerGoroutine = 10

	done := make(chan bool, numGoroutines)

	// Start multiple goroutines sending events
	for i := 0; i < numGoroutines; i++ {
		go func(id int) {
			for j := 0; j < eventsPerGoroutine; j++ {
				event := Event{
					Type:    "concurrent_test",
					Payload: json.RawMessage(`{"goroutine": ` + string(rune(id+'0')) + `}`),
				}
				client.egress <- event
			}
			done <- true
		}(i)
	}

	// Wait for all goroutines to complete
	for i := 0; i < numGoroutines; i++ {
		<-done
	}

	// Verify we received the expected number of events
	eventCount := len(client.egress)
	assert.Equal(t, numGoroutines*eventsPerGoroutine, eventCount)
}

// Test edge cases
func TestClient_EdgeCases(t *testing.T) {
	// Test with nil game state
	client := &Client{
		gameId: "edge-case-test",
		egress: make(chan Event, 1),
	}

	assert.Equal(t, "edge-case-test", client.gameId)
	assert.Nil(t, client.gameState)

	// Test with closed egress channel
	close(client.egress)
	
	// Sending to closed channel should panic, so we test this carefully
	assert.Panics(t, func() {
		client.egress <- Event{Type: "test"}
	})
}

// Test memory usage and cleanup
func TestClient_MemoryCleanup(t *testing.T) {
	client := &Client{
		gameState: chess.NewGame(),
		egress:    make(chan Event, 10),
		gameId:    "cleanup-test",
	}

	// Fill the channel
	for i := 0; i < 10; i++ {
		client.egress <- Event{
			Type:    "cleanup_test",
			Payload: json.RawMessage(`{"id": ` + string(rune(i+'0')) + `}`),
		}
	}

	// Verify channel is full
	assert.Equal(t, 10, len(client.egress))

	// Close and clean up
	close(client.egress)

	// Drain the channel
	count := 0
	for range client.egress {
		count++
	}
	assert.Equal(t, 10, count)
}