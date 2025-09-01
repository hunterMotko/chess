#!/bin/bash

# Test runner script for local development
# Usage: ./scripts/run-tests.sh [unit|integration|frontend|all|watch]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
GO_TEST_FLAGS="-v -race"
TEST_TIMEOUT="5m"
COVERAGE_THRESHOLD=80

# Functions
print_header() {
    echo -e "${BLUE}===========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}===========================================${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

check_dependencies() {
    print_header "Checking Dependencies"
    
    # Check Go
    if ! command -v go &> /dev/null; then
        print_error "Go is not installed"
        exit 1
    fi
    print_success "Go $(go version | cut -d' ' -f3)"
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed"
        exit 1
    fi
    print_success "Node.js $(node --version)"
    
    # Check PostgreSQL (for integration tests)
    if ! command -v psql &> /dev/null; then
        print_warning "PostgreSQL client not found - integration tests may fail"
    fi
}

setup_test_env() {
    print_header "Setting up Test Environment"
    
    # Set test environment variables
    export APP_ENV=test
    
    # Require environment variables to be set externally for security
    if [ -z "$CLIENT_ORIGIN" ]; then
        print_error "CLIENT_ORIGIN environment variable must be set for integration tests"
        print_info "Example: export CLIENT_ORIGIN=http://localhost:3000"
        exit 1
    fi
    
    if [ -z "$TEST_DB_URL" ]; then
        print_error "TEST_DB_URL environment variable must be set for integration tests"
        print_info "Example: export TEST_DB_URL=postgresql://user:pass@localhost:5432/chess_test?sslmode=disable"
        exit 1
    fi
    
    # Create test database if it doesn't exist (requires createdb command)
    if command -v createdb &> /dev/null; then
        createdb chess_test 2>/dev/null || true
        print_success "Test database ready"
    fi
}

run_go_unit_tests() {
    print_header "Running Go Unit Tests"
    
    # Create coverage directory
    mkdir -p coverage
    
    # Run tests with coverage
    go test $GO_TEST_FLAGS \
        -timeout=$TEST_TIMEOUT \
        -coverprofile=coverage/unit.out \
        -covermode=atomic \
        ./internal/...
    
    if [ $? -eq 0 ]; then
        print_success "Go unit tests passed"
        
        # Generate coverage report
        go tool cover -html=coverage/unit.out -o coverage/unit.html
        
        # Check coverage threshold
        local coverage=$(go tool cover -func=coverage/unit.out | grep total | awk '{print $3}' | sed 's/%//')
        local coverage_int=${coverage%.*}
        
        if [ "$coverage_int" -ge "$COVERAGE_THRESHOLD" ]; then
            print_success "Coverage: $coverage% (meets threshold of $COVERAGE_THRESHOLD%)"
        else
            print_warning "Coverage: $coverage% (below threshold of $COVERAGE_THRESHOLD%)"
        fi
    else
        print_error "Go unit tests failed"
        exit 1
    fi
}

run_go_integration_tests() {
    print_header "Running Go Integration Tests"
    
    # Check if test database is accessible
    if ! pg_isready -d "$TEST_DB_URL" &> /dev/null; then
        print_warning "Test database not accessible, skipping integration tests"
        return
    fi
    
    go test $GO_TEST_FLAGS \
        -timeout=$TEST_TIMEOUT \
        -tags=integration \
        ./tests/...
    
    if [ $? -eq 0 ]; then
        print_success "Go integration tests passed"
    else
        print_error "Go integration tests failed"
        exit 1
    fi
}

run_go_benchmarks() {
    print_header "Running Go Benchmarks"
    
    mkdir -p benchmarks
    
    go test -bench=. -benchmem -run=^Benchmark \
        ./internal/... > benchmarks/results.txt
    
    if [ $? -eq 0 ]; then
        print_success "Benchmarks completed"
        echo "Results saved to benchmarks/results.txt"
    else
        print_warning "Some benchmarks failed"
    fi
}

run_frontend_tests() {
    print_header "Running Frontend Tests"
    
    cd client
    
    # Install dependencies if needed
    if [ ! -d "node_modules" ] || [ "package-lock.json" -nt "node_modules" ]; then
        print_header "Installing frontend dependencies"
        npm ci
    fi
    
    # Run type checking
    print_header "Type Checking"
    npm run typecheck
    if [ $? -eq 0 ]; then
        print_success "Type checking passed"
    else
        print_error "Type checking failed"
        cd ..
        exit 1
    fi
    
    # Run tests
    npm test -- --coverage
    if [ $? -eq 0 ]; then
        print_success "Frontend tests passed"
    else
        print_error "Frontend tests failed"
        cd ..
        exit 1
    fi
    
    cd ..
}

run_linting() {
    print_header "Running Code Quality Checks"
    
    # Go linting
    print_header "Go Linting"
    
    # gofmt check
    if [ "$(gofmt -l . | wc -l)" -gt 0 ]; then
        print_error "Go code is not properly formatted"
        echo "Run: gofmt -w ."
        exit 1
    fi
    print_success "Go formatting OK"
    
    # go vet
    go vet ./...
    if [ $? -eq 0 ]; then
        print_success "go vet passed"
    else
        print_error "go vet failed"
        exit 1
    fi
    
    # Check for Go linters
    if command -v staticcheck &> /dev/null; then
        staticcheck ./...
        if [ $? -eq 0 ]; then
            print_success "staticcheck passed"
        else
            print_error "staticcheck failed"
            exit 1
        fi
    else
        print_warning "staticcheck not installed, install with: go install honnef.co/go/tools/cmd/staticcheck@latest"
    fi
    
    # Frontend linting
    print_header "Frontend Linting"
    cd client
    
    npm run build
    if [ $? -eq 0 ]; then
        print_success "Frontend build passed"
    else
        print_error "Frontend build failed"
        cd ..
        exit 1
    fi
    
    cd ..
}

run_security_checks() {
    print_header "Running Security Checks"
    
    # Go security check
    if command -v gosec &> /dev/null; then
        gosec ./...
        if [ $? -eq 0 ]; then
            print_success "gosec security check passed"
        else
            print_warning "gosec found potential security issues"
        fi
    else
        print_warning "gosec not installed, install with: go install github.com/securecodewarrior/gosec/v2/cmd/gosec@latest"
    fi
    
    # Frontend security check
    cd client
    npm audit --audit-level moderate
    if [ $? -eq 0 ]; then
        print_success "npm audit passed"
    else
        print_warning "npm audit found vulnerabilities"
    fi
    cd ..
}

watch_tests() {
    print_header "Starting Test Watcher"
    
    if ! command -v fswatch &> /dev/null; then
        print_error "fswatch not installed. Install with: brew install fswatch (macOS) or apt-get install fswatch (Linux)"
        exit 1
    fi
    
    print_success "Watching for file changes..."
    print_success "Press Ctrl+C to stop"
    
    fswatch -o . -e ".*" -i "\.go$" -i "\.ts$" -i "\.tsx$" | while read f; do
        clear
        echo -e "${BLUE}Files changed, running tests...${NC}"
        run_go_unit_tests
        run_frontend_tests
    done
}

cleanup() {
    print_header "Cleanup"
    
    # Remove temporary files
    find . -name "*.tmp" -delete 2>/dev/null || true
    
    # Clean up test artifacts older than 7 days
    find coverage benchmarks -name "*" -type f -mtime +7 -delete 2>/dev/null || true
    
    print_success "Cleanup completed"
}

show_help() {
    cat << EOF
Chess Game Test Runner

Usage: $0 [COMMAND] [OPTIONS]

COMMANDS:
    unit         Run Go unit tests only
    integration  Run Go integration tests only
    frontend     Run frontend tests only
    bench        Run Go benchmarks
    lint         Run linting and code quality checks
    security     Run security checks
    all          Run all tests (default)
    watch        Run tests in watch mode
    clean        Clean up test artifacts
    help         Show this help message

OPTIONS:
    --no-coverage    Skip coverage reporting
    --fast          Skip slower tests (benchmarks, integration)
    --verbose       Enable verbose output

EXAMPLES:
    $0                    # Run all tests
    $0 unit              # Run only unit tests
    $0 all --fast        # Run all tests except benchmarks/integration
    $0 watch             # Watch files and run tests on changes

ENVIRONMENT VARIABLES:
    TEST_DB_URL          Database URL for integration tests
    COVERAGE_THRESHOLD   Minimum coverage percentage (default: 80)
EOF
}

# Parse command line arguments
COMMAND=${1:-all}
SKIP_COVERAGE=false
FAST_MODE=false
VERBOSE=false

shift || true
while [[ $# -gt 0 ]]; do
    case $1 in
        --no-coverage)
            SKIP_COVERAGE=true
            shift
            ;;
        --fast)
            FAST_MODE=true
            shift
            ;;
        --verbose)
            VERBOSE=true
            GO_TEST_FLAGS="$GO_TEST_FLAGS -v"
            shift
            ;;
        *)
            print_error "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Main execution
case $COMMAND in
    unit)
        check_dependencies
        setup_test_env
        run_go_unit_tests
        ;;
    integration)
        check_dependencies
        setup_test_env
        run_go_integration_tests
        ;;
    frontend)
        check_dependencies
        run_frontend_tests
        ;;
    bench)
        check_dependencies
        setup_test_env
        run_go_benchmarks
        ;;
    lint)
        check_dependencies
        run_linting
        ;;
    security)
        check_dependencies
        run_security_checks
        ;;
    watch)
        check_dependencies
        setup_test_env
        watch_tests
        ;;
    clean)
        cleanup
        ;;
    all)
        check_dependencies
        setup_test_env
        run_go_unit_tests
        
        if [ "$FAST_MODE" = false ]; then
            run_go_integration_tests
            run_go_benchmarks
        fi
        
        run_frontend_tests
        run_linting
        run_security_checks
        
        print_header "All Tests Completed Successfully!"
        ;;
    help)
        show_help
        ;;
    *)
        print_error "Unknown command: $COMMAND"
        show_help
        exit 1
        ;;
esac