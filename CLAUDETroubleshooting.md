# Server Issue Troubleshooting & Prevention Guide

**Last Updated**: 2025-06-29 - After resolving 4+ hour server hanging issue

---

## 🚨 **WHEN THINGS ARE BROKEN** (Troubleshooting)

### **Test CPU Pegging (100%+ CPU Usage)**

#### **Symptoms**
- Vitest processes consuming 100%+ CPU in `ps aux | grep vitest`
- Tests hang indefinitely or take much longer than normal
- System becomes unresponsive during test execution

#### **Quick Fix (30 seconds)**
```bash
# 1. Kill all vitest processes immediately
pkill -f vitest

# 2. Check for accumulating timeout handlers in integration tests
grep -r "setTimeout.*reject" src/__tests__/integration/ --include="*.ts"

# 3. Run tests with infrastructure exclusion
npm test  # Should exclude infrastructure tests automatically
```

#### **Root Cause & Fix**
**Problem**: Accumulating `setTimeout` handlers in Promise.race timeout patterns
**Location**: Integration tests with retry loops using shared timeout promises

**Fix Pattern**:
```typescript
// ❌ BAD: Shared timeout creates handler accumulation
const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error("timeout")), 5000);
});
await Promise.race([operation1, timeoutPromise]);
await Promise.race([operation2, timeoutPromise]); // Reusing same timeout!

// ✅ GOOD: Individual timeouts with cleanup
const withTimeout = async <T>(operation: Promise<T>, ms: number): Promise<T> => {
    let timeoutId: NodeJS.Timeout;
    const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error("timeout")), ms);
    });
    try {
        const result = await Promise.race([operation, timeoutPromise]);
        clearTimeout(timeoutId); // Cleanup on success
        return result;
    } catch (error) {
        clearTimeout(timeoutId); // Cleanup on error
        throw error;
    }
};
```

**Fixed in**: `src/__tests__/integration/i-protected-user-routes.test.ts` (2025-06-30)

### **Server Won't Start (ERR_CONNECTION_REFUSED)**

#### **Quick Fix (2 minutes)**
```bash
# 1. Try the full startup (includes auto port-cleanup + safety check)
npm run dev:full

# 2. If that fails, emergency recovery
npm run emergency

# 3. If still failing, full recovery
./scripts/emergency-recovery.sh
```

#### **Manual Diagnosis** (if quick fix doesn't work)

**Step 1: Check if server is actually running**
```bash
# Check processes
ps aux | grep "node dist/server"

# Check port binding  
ss -tlnp | grep :3000

# Expected: Should see a process bound to port 3000
# Problem: If no process or no port binding → Server hanging during startup
```

**Step 2: Clean build and test**
```bash
# Force clean build
npm run build:clean

# Test port cleanup
npm run port:check
```

**Step 3: Test minimal server** (if still broken)
```bash
# Edit src/server/index.ts - comment out complex route imports
# Test with minimal routes, add back incrementally
```

### **Common Problems & Solutions**

| **Symptom** | **Cause** | **Solution** |
|-------------|-----------|--------------|
| Server logs "running" but connection refused | Import dependency deadlock | `npm run build:clean` |
| "Port already in use" error | Previous server didn't shut down | `npm run port:check` (auto-fixes) |
| Database connection errors | PostgreSQL container not running | `docker-compose up -d` |
| Hanging after PC restart/reboot | Corrupted build artifacts | `npm run build:clean` |

---

## 🛡️ **PREVENTION STRATEGIES** (How to Avoid Issues)

### **Daily Development Workflow**
```bash
# Recommended for daily development
npm run dev                            # Normal development with auto-restart (most common)
npm run dev:full                       # Full environment with database startup (comprehensive)
npm run dev:clean                      # Emergency recovery + start (when issues occur)
```

**What `dev` does automatically:**
1. ✅ **Port cleanup** - Kills existing processes if port in use
2. ✅ **Clean build** - Lint + compile + static files
3. ✅ **Auto-restart** - Watches for changes with nodemon

**What `dev:full` adds:**
1. ✅ **Database startup** - Automatically starts PostgreSQL container
2. ✅ **Complete environment** - Database + server + auto-restart

### **Prevention Checklist**

#### **Before Starting Development**
- [ ] Use `npm run dev` (normal development) or `npm run dev:full` (with database)
- [ ] After system restarts: Use `npm run dev:clean` for clean start
- [ ] Verify database is running: `docker ps` or use `npm run dev:full`

#### **When Making Changes**
- [ ] Adding dependencies? Use `npm run build:clean`
- [ ] Modifying imports? Test startup with `npm run dev`
- [ ] Server acting weird? Run `npm run emergency` or `npm run dev:clean`

#### **Weekly Maintenance**
- [ ] Clean build artifacts: `npm run clean`
- [ ] Check for circular dependencies: `npx madge --circular src/`
- [ ] Monitor utility file count (target: under 30 files)

### **Architecture Health**

**Current Status**: 29 utils files (6,293 lines)
**Long-term Goal**: Consolidate to 8-10 core modules

**Consolidation Priority:**
1. **auth-core.ts** ← Merge: auth-utils, navigation-auth, login-validation  
2. **team-core.ts** ← Merge: teams-business-logic, team-validation
3. **permission-core.ts** ← Merge: permission-controls, frontend-permissions
4. **validation-core.ts** ← Merge: scattered validation utilities

---

## 🚀 **EMERGENCY PROCEDURES**

### **Emergency Recovery Levels**

#### **Level 1: Quick Fix** (`npm run emergency`)
```bash
npm run emergency
# Kills processes + restarts database + clean build
```

#### **Level 2: Full Recovery** (`npm run emergency:full`)  
```bash
npm run emergency:full
# Complete environment reset with validation
```

#### **Level 3: Manual Recovery** (if scripts fail)
```bash
# Nuclear option - reset everything
pkill -9 -f node
docker-compose down
docker system prune -f
rm -rf dist/ node_modules/.cache
npm install
docker-compose up -d
npm run build:clean
```

### **Available Recovery Scripts**

| **Command** | **Purpose** | **Use When** |
|-------------|-------------|--------------|
| `npm run port:check` | Check/cleanup port 3000 | Port conflicts |
| `npm run build:clean` | Clean rebuild | Corrupted builds |
| `npm run emergency` | Quick recovery | General issues |
| `npm run emergency:full` | Complete environment reset | Everything broken |
| `npm run db:setup` | Database schema setup | Database issues |

---

## 🔧 **IMPLEMENTED SOLUTIONS**

### **What We Built to Prevent 4+ Hour Debug Sessions:**

1. **✅ Auto Port Cleanup** - `scripts/check-port.js`
   - Automatically kills existing processes
   - Integrated into all dev commands

2. **✅ Safety Checks** - Built into `dev:full`
   - 10-second startup verification
   - Fails fast instead of hanging

3. **✅ Clean Builds** - Always start fresh
   - Prevents corrupted artifact issues
   - Clears import dependency problems

4. **✅ Emergency Scripts** - One-command recovery
   - `npm run emergency` for quick fixes
   - Full recovery script for complete reset

5. **✅ Streamlined Commands** - Reduced from 12 to 5 dev commands
   - Less confusion about which command to use
   - Clear purpose for each remaining command

6. **✅ Test Infrastructure Exclusion** - CPU pegging prevention
   - Infrastructure tests excluded from normal runs
   - Fixed timeout handler accumulation in integration tests
   - Tests complete in ~8 seconds instead of hanging indefinitely

### **Key Insight: Fail Fast Philosophy**

**Before**: Silent failures that waste hours  
**After**: Loud, fast failures that guide you to solutions

---

## 📚 **ROOT CAUSE ANALYSIS**

**What Caused the 4+ Hour Issue:**
1. **Corrupted build artifacts** after PC reboot
2. **Complex import web** (29 utils, 6,293 lines) caused deadlocks
3. **Misleading symptoms** - server logged "running" but never bound to port
4. **No timeout detection** - hung indefinitely with no error

**How We Solved It:**
1. **Systematic debugging** - isolated components incrementally  
2. **Multiple clean rebuilds** - forced module resolution refresh
3. **Built prevention into workflow** - auto-cleanup and safety checks

**Result**: Similar issues now resolve in **2 minutes instead of 4+ hours**! 🎉

### **Test CPU Pegging Issue (Resolved 2025-06-30)**

**What Caused the CPU Pegging:**
1. **Timeout handler accumulation** in integration test retry loops
2. **Shared timeout promises** reused across multiple Promise.race operations  
3. **No timeout cleanup** - setTimeout handlers accumulated indefinitely
4. **Parallel test execution** amplified the resource consumption

**How We Solved It:**
1. **Identified specific pattern** - Promise.race with shared timeouts in while loops
2. **Created cleanup helper** - `withTimeout` function with automatic clearTimeout
3. **Fixed accumulation** - Each operation gets its own timeout with cleanup
4. **Verified exclusions** - Ensured infrastructure tests properly excluded

**Result**: Tests complete in **8 seconds instead of hanging with 100%+ CPU usage**! 🎉

---

## 🔄 **SERVER STARTUP RELIABILITY ISSUES** (Resolved 2025-06-30)

### **Recurring Startup Failures**

#### **Symptoms**
- `npm run dev` or `npm run dev:full` hanging or failing
- Server appears to start but returns connection refused  
- Requires `npm run emergency` to recover
- Occurred multiple times in single day

#### **Quick Fix (30 seconds)**
```bash
# Use simplified, reliable commands
npm run dev:simple      # Single-run server (most reliable)
npm run dev:clean       # Emergency recovery + start
npm run dev             # Normal development with auto-restart
```

#### **Root Causes & Solutions**

**1. Script Complexity → Simplified Commands**
- **Problem**: `dev:full` had 10-second timeout safety check creating orphaned processes
- **Solution**: Removed timeout, separated concerns into distinct commands

**2. Port Management Race Conditions → Better Verification**
- **Problem**: 3-second cleanup delays, processes not fully terminated before restart
- **Solution**: 1-second timeout + port availability verification after cleanup

**3. Nodemon Misconfiguration → Proper File Watching**
- **Problem**: `watch: false` disabled file watching while using nodemon
- **Solution**: `watch: ["dist/"], delay: 500ms, verbose: false`

### **Implemented Solutions**

#### **Development Scripts (package.json)**
```bash
# Reliable development commands
"dev": "npm run port:check && npm run build && nodemon dist/server/index.js"           # Normal dev with auto-restart
"dev:simple": "npm run build && node dist/server/index.js"                            # Single-run server  
"dev:clean": "npm run emergency && npm run dev:simple"                                # Emergency recovery + start
"dev:full": "npm run port:check && npm run clean && npm run build && docker-compose up -d && nodemon dist/server/index.js"  # Full environment
```

#### **Improved Port Cleanup (scripts/check-port.js)**
```javascript
// Added cleanup verification (reduced timeout 3000ms → 1000ms)
setTimeout(() => {
  const verifyServer = net.createServer();
  verifyServer.listen(PORT, () => {
    verifyServer.close(() => {
      console.log("✅ Process cleanup complete - port now available");
      resolve(false);
    });
  });
  verifyServer.on("error", () => {
    console.log("⚠️  Port still in use after cleanup - may need emergency recovery");
    resolve(false);
  });
}, 1000);
```

#### **Optimized Nodemon Config (nodemon.json)**
```json
{
  "watch": ["dist/"],        // Enable file watching
  "ext": "js",
  "ignore": ["node_modules"],
  "delay": 500,              // Reduced from 1000ms
  "env": { "NODE_ENV": "development" },
  "verbose": false,          // Reduced noise
  "restartable": "rs"
}
```

### **Diagnostic Commands for Future Issues**
```bash
# Check server status
curl -s http://localhost:3000/health

# Find processes on port 3000
ss -tlnp | grep :3000

# Identify server processes  
ps aux | grep "node dist/server"

# Check recent server logs
tail -20 server.log
```

### **Common Failure Patterns & Solutions**
1. **Orphaned timeout processes** → Remove timeout safety checks from normal development
2. **Port cleanup race conditions** → Add verification after kill commands  
3. **Nodemon misconfiguration** → Enable proper file watching, reduce delays
4. **Complex script chaining** → Separate concerns into distinct commands

### **Prevention Principles**
1. **Keep scripts simple** - Single responsibility per command
2. **Verify cleanup completion** - Don't assume kill commands worked
3. **Use emergency recovery** - When normal startup fails consistently  
4. **Test startup reliability** - Regularly verify development workflow
5. **Monitor process lifecycle** - Track startup/shutdown events

**Result**: Startup reliability improved from **frequent failures requiring emergency recovery** to **consistent, reliable startup** in under 10 seconds! 🎉