# Performance Testing

This directory contains performance testing tools and configurations for Zentropy.

## Available Tools

### 1. Test Performance (Development)
Fast, reliable test execution for rapid development:

```bash
# High-performance backend tests (8x faster with parallel execution)
npm run test:backend        # 11.4s for 606 tests

# Frontend tests (already optimized)
npm run test:frontend       # 7.4s for 1306 tests

# Full test suite (backend + frontend)
npm run test               # ~19s total
```

**Performance Metrics:**
- **Backend Tests**: 18.8ms per test (vs 156ms baseline)
- **Parallel Execution**: 8 workers by default
- **Zero Regressions**: All 606 tests pass with no changes required

### 2. Bundle Analysis (Frontend)
Analyze React bundle size and dependencies:

```bash
# Build and analyze bundle
npm run perf:build-analyze

# Just analyze existing build
npm run analyze:bundle
```

**What it shows:**
- Bundle size breakdown
- Largest dependencies
- Duplicate modules
- Import analysis

### 3. Test Performance Analysis (Development)
Analyze test performance patterns:

```bash
# Run tests with timing information
python3 -m pytest --durations=10 -v

# Run with coverage and performance analysis
npm run test:python:coverage

# Single worker for debugging slow tests
python3 -m pytest -n 1 --durations=0
```

**Test Performance Targets:**
- Backend tests: < 20ms per test
- Frontend tests: < 10ms per test
- Total test suite: < 30 seconds
- Parallel efficiency: 70%+ CPU utilization

### 4. Lighthouse CI (Frontend)
Automated web performance auditing:

```bash
# Run Lighthouse audit
npm run analyze:lighthouse
```

**What it measures:**
- Performance score (targeting 70%+)
- Accessibility (targeting 90%+)
- Best practices (targeting 80%+)
- SEO (targeting 80%+)

### 5. Locust Load Testing (Backend)
API load testing with Python:

```bash
# Start your development server first
npm run dev

# In another terminal, run load testing
locust -f performance/locustfile.py --host=http://localhost:3000

# Open web UI at http://localhost:8089
```

**Test scenarios:**
- Light load: 1-10 concurrent users
- Medium load: 10-50 concurrent users  
- Heavy load: 50+ concurrent users

## When to Use

### During Development
- **Test performance**: Every code change, essential for rapid development
- **Bundle analysis**: Before major releases or when adding new dependencies
- **Lighthouse**: Before demos or when optimizing user experience

### Before Production
- **All tools**: Run complete performance audit
- **Load testing**: Validate API can handle expected traffic

### Performance Budgets

#### Frontend Targets
- Bundle size: < 1MB initial load
- Performance score: > 70%
- First Contentful Paint: < 2s
- Largest Contentful Paint: < 4s

#### Backend Targets
- API response time: < 200ms (95th percentile)
- Test execution time: < 20ms per test
- Concurrent users: 50+ without degradation
- Database queries: < 50ms average

## Quick Performance Checks

```bash
# Quick test performance check
npm run test:backend        # Should complete in ~11s

# Quick bundle size check
npm run build && du -sh dist/

# Quick API response time check
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:3000/health

# Quick load test (10 users for 30 seconds)
locust -f performance/locustfile.py --host=http://localhost:3000 -u 10 -r 2 -t 30s --headless
```

## Troubleshooting

### Bundle Analyzer Issues
- Ensure you've run `npm run build` first
- Check that `dist/` directory exists

### Lighthouse Issues
- Ensure dev server is running on port 5173
- Check that all services start properly with `npm run dev`

### Locust Issues
- Ensure API server is running on port 3000
- Check database connection is working
- Verify `/health` endpoint responds

## Related Documentation

### Core Testing Strategy
- **[Unit & Integration Testing](../tests/README.md)** - Functional testing with pytest and vitest
- **[End-to-End Testing](../tests-e2e/README.md)** - User workflow testing with Playwright
- **[Test Coverage Matrix](../docs/testing/TestCoverage.md)** - Comprehensive test coverage across all layers

### Architecture & Development
- **[Main Project Guide](../README.md)** - Getting started and development workflow
- **[Architecture Overview](../docs/architecture/README.md)** - System architecture and performance considerations