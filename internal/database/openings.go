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
	Vol    string
	Page   int
	Offset int
}

type OpeningsRes struct {
	Openings []Opening `json:"openings"`
	Page     int       `json:"page"`
	Offset   int       `json:"offset"`
	Total    int       `json:"total"`
}

const getTotalOpeningsCount = `
	SELECT COUNT(*) FROM openings 
	WHERE eco LIKE $1
	`

const getOpeningsByVolume = `
	SELECT * FROM openings 
	WHERE eco LIKE $1
	ORDER BY eco
	LIMIT 50
	OFFSET $2;
	`

func (s *Service) GetOpeningsByVolume(ctx context.Context, params OpeningParams) (*OpeningsRes, error) {
	eco := fmt.Sprintf("%s%%", params.Vol)
	var total int
	if err := s.db.QueryRowContext(ctx, getTotalOpeningsCount, eco).Scan(&total); err != nil {
		return nil, err
	}

	rows, err := s.db.QueryContext(ctx, getOpeningsByVolume, eco, params.Offset)
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

	return &OpeningsRes{
		Openings: openings,
		Page:     params.Page,
		Offset:   params.Offset,
		Total:    total,
	}, nil
}
