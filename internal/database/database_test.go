package database

import (
	"context"
	"strings"
	"testing"
	"time"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestService_GetOpeningsByVolume(t *testing.T) {
	// Create mock database
	db, mock, err := sqlmock.New()
	require.NoError(t, err)
	defer db.Close()

	service := &Service{db: db}

	tests := []struct {
		name     string
		params   OpeningParams
		setupMock func()
		want     *OpeningsRes
		wantErr  bool
	}{
		{
			name: "successful query",
			params: OpeningParams{
				Vol:    "A",
				Page:   1,
				Offset: 0,
			},
			setupMock: func() {
				// Mock count query
				mock.ExpectQuery("SELECT COUNT\\(\\*\\) FROM openings WHERE eco LIKE \\$1").
					WithArgs("A%").
					WillReturnRows(sqlmock.NewRows([]string{"count"}).AddRow(100))

				// Mock main query
				rows := sqlmock.NewRows([]string{"id", "eco", "name", "pgn"}).
					AddRow(uuid.New(), "A00", "Test Opening", "1. e4")
				mock.ExpectQuery("SELECT \\* FROM openings WHERE eco LIKE \\$1 ORDER BY eco LIMIT 50 OFFSET \\$2").
					WithArgs("A%", 0).
					WillReturnRows(rows)
			},
			want: &OpeningsRes{
				Openings: []Opening{{
					Eco:  "A00",
					Name: "Test Opening",
					Pgn:  "1. e4",
				}},
				Page:   1,
				Offset: 0,
				Total:  100,
			},
			wantErr: false,
		},
		{
			name: "database error",
			params: OpeningParams{
				Vol:    "B",
				Page:   1,
				Offset: 0,
			},
			setupMock: func() {
				mock.ExpectQuery("SELECT COUNT\\(\\*\\) FROM openings WHERE eco LIKE \\$1").
					WithArgs("B%").
					WillReturnError(assert.AnError)
			},
			want:    nil,
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			tt.setupMock()

			ctx := context.Background()
			got, err := service.GetOpeningsByVolume(ctx, tt.params)

			if tt.wantErr {
				assert.Error(t, err)
				assert.Nil(t, got)
			} else {
				assert.NoError(t, err)
				assert.Equal(t, tt.want.Page, got.Page)
				assert.Equal(t, tt.want.Offset, got.Offset)
				assert.Equal(t, tt.want.Total, got.Total)
				assert.Len(t, got.Openings, len(tt.want.Openings))
			}

			// Ensure all expectations were met
			assert.NoError(t, mock.ExpectationsWereMet())
		})
	}
}

func TestService_Health(t *testing.T) {
	// This test requires proper database mocking setup
	t.Skip("Requires database service interface refactoring for proper mocking")
}

// Benchmark test for database performance
func BenchmarkService_GetOpeningsByVolume(b *testing.B) {
	db, mock, err := sqlmock.New()
	require.NoError(b, err)
	defer db.Close()

	service := &Service{db: db}

	// Setup mock for all benchmark iterations
	for i := 0; i < b.N; i++ {
		mock.ExpectQuery("SELECT COUNT\\(\\*\\) FROM openings WHERE eco LIKE \\$1").
			WithArgs("A%").
			WillReturnRows(sqlmock.NewRows([]string{"count"}).AddRow(100))

		rows := sqlmock.NewRows([]string{"id", "eco", "name", "pgn"}).
			AddRow(uuid.New(), "A00", "Test Opening", "1. e4")
		mock.ExpectQuery("SELECT \\* FROM openings WHERE eco LIKE \\$1 ORDER BY eco LIMIT 50 OFFSET \\$2").
			WithArgs("A%", 0).
			WillReturnRows(rows)
	}

	params := OpeningParams{Vol: "A", Page: 1, Offset: 0}
	ctx := context.Background()

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_, err := service.GetOpeningsByVolume(ctx, params)
		require.NoError(b, err)
	}
}

// Test helper functions
func createMockService(t *testing.T) (*Service, sqlmock.Sqlmock, func()) {
	db, mock, err := sqlmock.New()
	require.NoError(t, err)
	cleanup := func() { db.Close() }
	return &Service{db: db}, mock, cleanup
}

func TestService_WithTimeout(t *testing.T) {
	db, mock, err := sqlmock.New()
	require.NoError(t, err)
	defer db.Close()

	service := &Service{db: db}

	// Simulate slow query
	mock.ExpectQuery("SELECT COUNT\\(\\*\\) FROM openings WHERE eco LIKE \\$1").
		WithArgs("A%").
		WillDelayFor(2 * time.Second).
		WillReturnRows(sqlmock.NewRows([]string{"count"}).AddRow(100))

	ctx, cancel := context.WithTimeout(context.Background(), 1*time.Second)
	defer cancel()

	params := OpeningParams{Vol: "A", Page: 1, Offset: 0}
	_, err = service.GetOpeningsByVolume(ctx, params)
	
	assert.Error(t, err)
	// The error message can vary depending on the database driver implementation
	assert.True(t, strings.Contains(err.Error(), "context deadline exceeded") || 
		strings.Contains(err.Error(), "canceling query due to user request") ||
		strings.Contains(err.Error(), "timeout"))
}