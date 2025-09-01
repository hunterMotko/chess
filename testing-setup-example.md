# Testing Dependencies to Add

## Go Backend Dependencies
```bash
# Add to go.mod for testing
go mod tidy
go get github.com/stretchr/testify/assert
go get github.com/stretchr/testify/mock
go get github.com/stretchr/testify/suite
go get github.com/DATA-DOG/go-sqlmock
go get github.com/gorilla/websocket/test
```

## Frontend Dependencies
```bash
# Navigate to client directory
cd client/

# Add testing dependencies
npm install --save-dev vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
```