#!/usr/bin/env python3
"""
Reset rate limit counter for development.

This script allows developers to quickly reset their rate limit counter
without waiting for the 15-minute window to expire.

Usage:
    python3 scripts/reset-rate-limit.py
    python3 scripts/reset-rate-limit.py --ip 192.168.1.100
    python3 scripts/reset-rate-limit.py --type oauth
"""

import sys
import os
import subprocess
import argparse
from pathlib import Path

# Add the project root to Python path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from api.rate_limiter import rate_limiter, RateLimitType


def get_local_ip():
    """Get the local IP address."""
    try:
        result = subprocess.run(['hostname', '-I'], capture_output=True, text=True)
        ip = result.stdout.strip().split()[0] if result.stdout.strip() else 'localhost'
        return ip
    except:
        return '127.0.0.1'


def main():
    parser = argparse.ArgumentParser(description='Reset rate limit counter for development')
    parser.add_argument('--ip', help='IP address to reset (defaults to your local IP)')
    parser.add_argument('--type', choices=['auth', 'oauth', 'api', 'email'], 
                       default='auth', help='Rate limit type to reset (default: auth)')
    parser.add_argument('--status', action='store_true', 
                       help='Show current status without resetting')
    
    args = parser.parse_args()
    
    # Determine IP address
    ip = args.ip or get_local_ip()
    
    # Map string to enum
    limit_type_map = {
        'auth': RateLimitType.AUTH,
        'oauth': RateLimitType.OAUTH,
        'api': RateLimitType.API,
        'email': RateLimitType.EMAIL
    }
    limit_type = limit_type_map[args.type]
    
    print(f"🔍 Checking rate limit for IP: {ip} (type: {args.type})")
    
    try:
        # Check current status
        status = rate_limiter.get_rate_limit_status(ip, limit_type)
        print(f"📊 Current status:")
        print(f"   • Requests used: {status['current_requests']}/{status['max_requests']}")
        print(f"   • Reset in: {status['reset_in_seconds']} seconds")
        print(f"   • Window: {status['window_minutes']} minutes")
        
        if args.status:
            return
        
        if status['current_requests'] == 0:
            print("✨ Rate limit already at 0 requests - no reset needed!")
            return
        
        # Reset the rate limit
        rate_limiter.reset_rate_limit(ip, limit_type)
        print(f"✅ Rate limit reset for IP: {ip}")
        
        # Verify reset
        new_status = rate_limiter.get_rate_limit_status(ip, limit_type)
        print(f"📊 New status:")
        print(f"   • Requests used: {new_status['current_requests']}/{new_status['max_requests']}")
        print(f"   • You now have {new_status['max_requests']} fresh requests!")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return 1
    
    return 0


if __name__ == "__main__":
    sys.exit(main())