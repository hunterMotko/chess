package server

import (
	"net/http"
	"strconv"

	"github.com/hunterMotko/chess-game/internal/database"
	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
)

func (s *Server) RegisterRoutes() http.Handler {
	e := echo.New()
	e.Use(middleware.Logger())
	e.Use(middleware.Recover())

	e.GET("/ws/:gameId", s.manager.ServeWS)
	e.GET("/check-h", s.healthHandler)
	e.GET("/api/openings/:id", s.openingsHandler)

	e.Logger.Fatal(e.Start(s.addr))
	return e
}

func (s *Server) healthHandler(c echo.Context) error {
	return c.JSON(http.StatusOK, s.db.Health())
}

func (s *Server) openingsHandler(c echo.Context) error {
	f
	page := c.QueryParam("p")
	offset := c.QueryParam("o")
	p, err := strconv.Atoi(page)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"message": err.Error(),
		})
	}
	o, err := strconv.Atoi(offset)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"message": err.Error(),
		})
	}

	params := database.OpeningParams{
		Vol:    id,
		Page:   p,
		Offset: o,
	}

	res, err := s.db.GetOpeningsByVolume(c.Request().Context(), params)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"message": err.Error(),
		})
	}

	return c.JSON(http.StatusOK, res)
}
