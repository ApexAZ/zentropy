"""
Locust Load Testing Configuration for Zentropy API

Basic load testing scenarios for FastAPI backend.
Run with: locust -f performance/locustfile.py --host=http://localhost:3000

Usage:
- Start your dev server first: npm run dev
- Run load test: locust -f performance/locustfile.py --host=http://localhost:3000
- Open web UI at: http://localhost:8089
"""

import random
from locust import HttpUser, task, between


class ZentropyAPIUser(HttpUser):
    """Simulates a typical API user for load testing."""
    
    wait_time = between(1, 3)  # Wait 1-3 seconds between requests
    
    def on_start(self):
        """Called when a user starts - setup authentication if needed."""
        # Test health endpoint first
        self.client.get("/health")
    
    @task(3)
    def health_check(self):
        """Test health endpoint - most frequent operation."""
        self.client.get("/health")
    
    @task(2)
    def api_docs(self):
        """Test API documentation endpoint."""
        self.client.get("/docs")
    
    @task(1)
    def root_endpoint(self):
        """Test root endpoint."""
        self.client.get("/")


class AuthenticatedAPIUser(HttpUser):
    """Simulates authenticated API operations (for future use)."""
    
    wait_time = between(2, 5)
    
    def on_start(self):
        """Setup authentication for authenticated endpoints."""
        # For now, just test public endpoints
        # Future: Add login flow here
        pass
    
    @task(2)
    def health_check(self):
        """Test health endpoint."""
        self.client.get("/health")
    
    @task(1)
    def teams_endpoint(self):
        """Test teams endpoint (will need auth in future)."""
        # For now, expect 401/403 responses
        with self.client.get("/api/teams", catch_response=True) as response:
            if response.status_code in [401, 403]:
                response.success()  # Expected for unauthenticated requests


# Load Testing Scenarios
class LightLoadTest(HttpUser):
    """Light load testing - simulates 1-10 concurrent users."""
    tasks = [ZentropyAPIUser]
    wait_time = between(2, 5)


class MediumLoadTest(HttpUser):
    """Medium load testing - simulates 10-50 concurrent users."""
    tasks = [ZentropyAPIUser, AuthenticatedAPIUser]
    wait_time = between(1, 3)


class HeavyLoadTest(HttpUser):
    """Heavy load testing - simulates 50+ concurrent users."""
    tasks = [ZentropyAPIUser, AuthenticatedAPIUser]
    wait_time = between(0.5, 2)