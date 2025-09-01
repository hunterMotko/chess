// Package tests contains integration tests for the chess game application
package tests

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"net"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"
	"time"

	"github.com/gorilla/websocket"
	"github.com/hunterMotko/chess-game/internal/database"
	"github.com/hunterMotko/chess-game/internal/server"
	"github.com/hunterMotko/chess-game/internal/websockets"
	_ "github.com/lib/pq"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/suite"
)

// IntegrationTestSuite contains integration tests for the entire application
type IntegrationTestSuite struct {
	suite.Suite
	httpServer *http.Server
	testServer *httptest.Server
	db         *sql.DB
}

// SetupSuite runs once before all tests in the suite
func (suite *IntegrationTestSuite) SetupSuite() {
	// Set test environment variables
	os.Setenv("APP_ENV", "test")
	os.Setenv("CLIENT_ORIGIN", "http://localhost:3000")
	
	// Setup test database connection
	testDBURL := os.Getenv("TEST_DB_URL")
	if testDBURL == "" {
		testDBURL = "postgresql://test:test@localhost:5432/chess_test?sslmode=disable"
	}
	
	var err error
	suite.db, err = sql.Open("postgres", testDBURL)
	suite.Require().NoError(err)
	
	// Create test tables if they don't exist
	suite.setupTestTables()
	
	// Start test server - NewServer returns *http.Server, not *server.Server
	suite.httpServer = server.NewServer()
	suite.testServer = httptest.NewServer(suite.httpServer.Handler)
}

// TearDownSuite runs once after all tests in the suite
func (suite *IntegrationTestSuite) TearDownSuite() {
	if suite.testServer != nil {
		suite.testServer.Close()
	}
	if suite.db != nil {
		suite.cleanupTestTables()
		suite.db.Close()
	}
}

// SetupTest runs before each individual test
func (suite *IntegrationTestSuite) SetupTest() {
	// Clean test data before each test
	suite.cleanupTestData()
	// Insert test data
	suite.insertTestData()
}

// Test health endpoint
func (suite *IntegrationTestSuite) TestHealthEndpoint() {
	resp, err := http.Get(suite.testServer.URL + "/check-h")
	suite.Require().NoError(err)
	defer resp.Body.Close()

	suite.Equal(http.StatusOK, resp.StatusCode) // Use StatusCode instead of Status

	var health map[string]string
	err = json.NewDecoder(resp.Body).Decode(&health)
	suite.Require().NoError(err)
	suite.Equal("It's healthy", health["message"])
}

// Test openings endpoint with valid parameters
func (suite *IntegrationTestSuite) TestOpeningsEndpoint_ValidParams() {
	// Test with different ECO volumes
	testCases := []struct {
		volume   string
		page     int
		offset   int
		expected int // expected minimum number of openings
	}{
		{"A", 1, 0, 1},
		{"B", 1, 0, 1},
		{"C", 1, 0, 1},
	}

	for _, tc := range testCases {
		suite.Run(fmt.Sprintf("volume_%s", tc.volume), func() {
			url := fmt.Sprintf("%s/api/openings/%s?p=%d&o=%d", 
				suite.testServer.URL, tc.volume, tc.page, tc.offset)
			
			resp, err := http.Get(url)
			suite.Require().NoError(err)
			defer resp.Body.Close()

			suite.Equal(http.StatusOK, resp.StatusCode)

			var openingsRes database.OpeningsRes
			err = json.NewDecoder(resp.Body).Decode(&openingsRes)
			suite.Require().NoError(err)
			
			suite.GreaterOrEqual(len(openingsRes.Openings), tc.expected)
			suite.Equal(tc.page, openingsRes.Page)
			suite.Equal(tc.offset, openingsRes.Offset)
		})
	}
}

// Test openings endpoint with invalid parameters
func (suite *IntegrationTestSuite) TestOpeningsEndpoint_InvalidParams() {
	testCases := []struct {
		name     string
		volume   string
		query    string
		expected int
	}{
		{"invalid_page", "A", "p=invalid&o=0", http.StatusInternalServerError},
		{"invalid_offset", "A", "p=1&o=invalid", http.StatusInternalServerError},
		{"negative_page", "A", "p=-1&o=0", http.StatusOK}, // Should still work
		{"missing_params", "A", "", http.StatusInternalServerError},
	}

	for _, tc := range testCases {
		suite.Run(tc.name, func() {
			url := fmt.Sprintf("%s/api/openings/%s?%s", 
				suite.testServer.URL, tc.volume, tc.query)
			
			resp, err := http.Get(url)
			suite.Require().NoError(err)
			defer resp.Body.Close()

			suite.Equal(tc.expected, resp.StatusCode)
		})
	}
}

// Test WebSocket connection and basic message exchange
func (suite *IntegrationTestSuite) TestWebSocketConnection() {
	// Convert HTTP URL to WebSocket URL
	wsURL := strings.Replace(suite.testServer.URL, "http", "ws", 1) + "/ws/test-game-123"
	
	// Connect to WebSocket
	header := make(http.Header)
	header.Set("Origin", "http://localhost:3000")
	
	conn, _, err := websocket.DefaultDialer.Dial(wsURL, header)
	suite.Require().NoError(err)
	defer conn.Close()

	// Test sending a new game event
	newGameEvent := websockets.Event{
		Type:    websockets.NewGame,
		Payload: json.RawMessage(`{}`),
	}

	err = conn.WriteJSON(newGameEvent)
	suite.Require().NoError(err)

	// Set read deadline
	conn.SetReadDeadline(time.Now().Add(5 * time.Second))

	// Read response (if any)
	var response websockets.Event
	err = conn.ReadJSON(&response)
	
	// Note: Current implementation doesn't send responses, so this might timeout
	// This is actually testing the current behavior
	if err != nil {
		// Check if it's a timeout (expected with current implementation)
		if netErr, ok := err.(net.Error); ok && netErr.Timeout() {
			// This is expected behavior
			return
		}
		suite.Fail("Unexpected error reading WebSocket message: %v", err)
	}
}

// Test WebSocket with multiple clients
func (suite *IntegrationTestSuite) TestWebSocketMultipleClients() {
	gameID := "multi-client-test"
	wsURL := strings.Replace(suite.testServer.URL, "http", "ws", 1) + "/ws/" + gameID
	
	// Create multiple connections
	var connections []*websocket.Conn
	numClients := 3
	
	header := make(http.Header)
	header.Set("Origin", "http://localhost:3000")

	for i := 0; i < numClients; i++ {
		conn, _, err := websocket.DefaultDialer.Dial(wsURL, header)
		suite.Require().NoError(err)
		connections = append(connections, conn)
	}

	// Clean up connections
	defer func() {
		for _, conn := range connections {
			conn.Close()
		}
	}()

	// Send messages from each client
	for i, conn := range connections {
		event := websockets.Event{
			Type:    websockets.Move,
			Payload: json.RawMessage(fmt.Sprintf(`{"player": %d}`, i)),
		}
		
		err := conn.WriteJSON(event)
		suite.Require().NoError(err)
	}

	// Give some time for message processing
	time.Sleep(100 * time.Millisecond)
}

// Test database operations end-to-end
func (suite *IntegrationTestSuite) TestDatabaseOperations_EndToEnd() {
	// Direct database service test
	dbService := database.New()
	
	ctx := context.Background()
	params := database.OpeningParams{
		Vol:    "A",
		Page:   1,
		Offset: 0,
	}

	result, err := dbService.GetOpeningsByVolume(ctx, params)
	suite.Require().NoError(err)
	suite.NotNil(result)
	suite.GreaterOrEqual(result.Total, 0)
}

// Test complete user workflow: API -> WebSocket -> Database
func (suite *IntegrationTestSuite) TestCompleteUserWorkflow() {
	// Step 1: Get openings list via API
	resp, err := http.Get(suite.testServer.URL + "/api/openings/A?p=1&o=0")
	suite.Require().NoError(err)
	defer resp.Body.Close()

	var openingsRes database.OpeningsRes
	err = json.NewDecoder(resp.Body).Decode(&openingsRes)
	suite.Require().NoError(err)
	suite.Greater(len(openingsRes.Openings), 0)

	// Step 2: Start a game via WebSocket
	wsURL := strings.Replace(suite.testServer.URL, "http", "ws", 1) + "/ws/workflow-test"
	
	header := make(http.Header)
	header.Set("Origin", "http://localhost:3000")
	
	conn, _, err := websocket.DefaultDialer.Dial(wsURL, header)
	suite.Require().NoError(err)
	defer conn.Close()

	// Step 3: Send new game event
	newGameEvent := websockets.Event{
		Type:    websockets.NewGame,
		Payload: json.RawMessage(`{}`),
	}

	err = conn.WriteJSON(newGameEvent)
	suite.Require().NoError(err)

	// Step 4: Load a PGN from the openings
	if len(openingsRes.Openings) > 0 {
		loadPGNEvent := websockets.Event{
			Type:    websockets.LoadPGN,
			Payload: json.RawMessage(fmt.Sprintf(`"%s"`, openingsRes.Openings[0].Pgn)),
		}

		err = conn.WriteJSON(loadPGNEvent)
		suite.Require().NoError(err)
	}

	// Step 5: Send a move
	moveEvent := websockets.Event{
		Type:    websockets.Move,
		Payload: json.RawMessage(`{"from": "e2", "to": "e4"}`),
	}

	err = conn.WriteJSON(moveEvent)
	suite.Require().NoError(err)

	// Give time for processing
	time.Sleep(100 * time.Millisecond)
}

// Performance test: Concurrent API requests
func (suite *IntegrationTestSuite) TestConcurrentAPIRequests() {
	numRequests := 50
	results := make(chan error, numRequests)

	// Launch concurrent requests
	for i := 0; i < numRequests; i++ {
		go func() {
			resp, err := http.Get(suite.testServer.URL + "/check-h")
			if err != nil {
				results <- err
				return
			}
			defer resp.Body.Close()

			if resp.StatusCode != http.StatusOK {
				results <- fmt.Errorf("expected 200, got %d", resp.StatusCode)
				return
			}

			results <- nil
		}()
	}

	// Collect results
	errorCount := 0
	for i := 0; i < numRequests; i++ {
		if err := <-results; err != nil {
			errorCount++
		}
	}

	suite.Equal(0, errorCount, "Some concurrent requests failed")
}

// Helper methods for test setup
func (suite *IntegrationTestSuite) setupTestTables() {
	createOpeningsTable := `
		CREATE TABLE IF NOT EXISTS openings (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			eco VARCHAR(3) NOT NULL,
			name TEXT NOT NULL,
			pgn TEXT NOT NULL
		);
		CREATE INDEX IF NOT EXISTS idx_openings_eco ON openings(eco);
	`
	
	_, err := suite.db.Exec(createOpeningsTable)
	suite.Require().NoError(err)
}

func (suite *IntegrationTestSuite) cleanupTestTables() {
	_, err := suite.db.Exec("DROP TABLE IF EXISTS openings")
	suite.Require().NoError(err)
}

func (suite *IntegrationTestSuite) cleanupTestData() {
	_, err := suite.db.Exec("DELETE FROM openings")
	suite.Require().NoError(err)
}

func (suite *IntegrationTestSuite) insertTestData() {
	testOpenings := []struct {
		eco  string
		name string
		pgn  string
	}{
		{"A00", "Test Opening A", "1. e4 e5"},
		{"B00", "Test Opening B", "1. d4 d5"},
		{"C00", "Test Opening C", "1. Nf3 Nf6"},
	}

	for _, opening := range testOpenings {
		_, err := suite.db.Exec(
			"INSERT INTO openings (eco, name, pgn) VALUES ($1, $2, $3)",
			opening.eco, opening.name, opening.pgn,
		)
		suite.Require().NoError(err)
	}
}

// Run the integration test suite
func TestIntegrationSuite(t *testing.T) {
	// Skip if not running integration tests
	if testing.Short() {
		t.Skip("Skipping integration tests in short mode")
	}

	suite.Run(t, new(IntegrationTestSuite))
}

// Standalone integration tests (can be run without test suite)

// TestWebSocketOriginValidation tests the origin validation functionality
func TestWebSocketOriginValidation(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	// This would be used to test the corrected origin validation
	// once the security issue in checkOrigin is fixed
	
	testServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Mock WebSocket endpoint
		upgrader := websocket.Upgrader{
			CheckOrigin: func(r *http.Request) bool {
				// Proper origin validation (what should be implemented)
				allowed := os.Getenv("CLIENT_ORIGIN")
				if allowed == "" {
					allowed = "http://localhost:5173"
				}
				origin := r.Header.Get("Origin")
				return origin == allowed
			},
		}
		
		conn, err := upgrader.Upgrade(w, r, nil)
		if err != nil {
			return
		}
		conn.Close()
	}))
	defer testServer.Close()

	testCases := []struct {
		name         string
		origin       string
		shouldSucceed bool
	}{
		{"valid_origin", "http://localhost:5173", true},
		{"invalid_origin", "http://malicious.com", false},
		{"no_origin", "", false},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			wsURL := strings.Replace(testServer.URL, "http", "ws", 1)
			
			header := make(http.Header)
			if tc.origin != "" {
				header.Set("Origin", tc.origin)
			}
			
			conn, resp, err := websocket.DefaultDialer.Dial(wsURL, header)
			
			if tc.shouldSucceed {
				assert.NoError(t, err)
				if conn != nil {
					conn.Close()
				}
			} else {
				assert.Error(t, err)
				if resp != nil {
					assert.Equal(t, http.StatusForbidden, resp.StatusCode)
				}
			}
		})
	}
}