package database

import (
	"context"
	"fmt"

	"github.com/google/uuid"
)

type Opening struct {
	Id   uuid.UUID `json:"id"`
	Eco  string    `json:"eco"`
	Name string    `json:"name"`
	Pgn  string    `json:"pgn"`
}

type OpeningParams struct {
	Vol   string
	Start int
	End   int
}

type OpeningsRes struct {
	Openings []Opening
	Prev     int
	Next     int
}

const getOpeningsByVolume = `
	SELECT * FROM openings 
	WHERE eco LIKE $1
	LIMIT 20
	OFFSET $2;
	`

func (s *Service) GetOpeningsByVolume(ctx context.Context, params OpeningParams) (*OpeningsRes, error) {
	rows, err := s.db.QueryContext(ctx, getOpeningsByVolume, params.Vol+"%", params.End)
	if err != nil {
		return nil, err
	}

	defer rows.Close()
	var openings []Opening
	for rows.Next() {
		var o Opening
		if err := rows.Scan(&o.Id, &o.Eco, &o.Name, &o.Pgn); err != nil {
			return nil, err
		}
		openings = append(openings, o)
	}

	fmt.Println(openings)

	return &OpeningsRes{
		Openings: openings,
		Prev:     params.Start,
		Next:     params.End,
	}, nil
}
