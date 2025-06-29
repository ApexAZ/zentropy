# Server Issue Troubleshooting & Prevention Guide

**Last Updated**: 2025-06-29 - After resolving 4+ hour server hanging issue

---

## 🚨 **WHEN THINGS ARE BROKEN** (Troubleshooting)

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
# Just use this - includes all safety checks
npm run dev:full
```

**What `dev:full` does automatically:**
1. ✅ **Port cleanup** - Kills existing processes if port in use
2. ✅ **Clean build** - Removes corrupted artifacts
3. ✅ **Safety test** - 10-second startup verification
4. ✅ **Full environment** - Database + server

### **Prevention Checklist**

#### **Before Starting Development**
- [ ] Use `npm run dev:full` (includes all safety checks)
- [ ] After system restarts: Always use clean builds
- [ ] Verify database is running: `docker ps`

#### **When Making Changes**
- [ ] Adding dependencies? Use `npm run build:clean`
- [ ] Modifying imports? Test startup with `npm run dev:full`
- [ ] Server acting weird? Run `npm run emergency`

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

#### **Level 2: Full Recovery** (`./scripts/emergency-recovery.sh`)  
```bash
./scripts/emergency-recovery.sh
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
| `./scripts/emergency-recovery.sh` | Full recovery | Everything broken |

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