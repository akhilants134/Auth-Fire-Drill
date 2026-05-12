# Project Changes & Fixes Log - Auth Fire Drill Challenge #9

## 📋 Security Challenge Summary

This document tracks all six interconnected authentication vulnerabilities found and fixed in the Fragments application.

---

## 🔍 Vulnerability Audit & Fixes

### Vulnerability F1: Hardcoded JWT Secret & No Token Expiry

- **Found in**: `server/auth/jwt.js`
- **Description of the Problem**:
  - JWT secret is hardcoded as a string literal (`'fragments-secret-key'`) instead of using an environment variable
  - Tokens are signed without an `expiresIn` option, meaning tokens issued today will be valid indefinitely
  - Anyone with access to the source code can forge tokens for any user, including admins
  - A stolen token becomes a permanent backdoor to the system
- **Impact**: Critical - Undermines all other security layers; makes token theft a permanent exploit
- **Description of the Fix**:
  - Moved secret to `process.env.JWT_SECRET` - must be provided at startup
  - Added `expiresIn: '1h'` to all `jwt.sign()` calls
  - Added server startup validation to ensure `JWT_SECRET` is set

---

### Vulnerability F2: Role Missing from JWT Payload

- **Found in**: `server/routes/auth.js` (login and signup handlers)
- **Description of the Problem**:
  - When tokens are signed, only `userId` is included in the payload
  - User role (reader, contributor, curator, admin) is never encoded into the token
  - Even with perfect role-check middleware, `req.user.role` will always be `undefined`
  - Any authentication check against role will fail or be skipped silently
- **Impact**: High - Makes all role-based access control impossible
- **Description of the Fix**:
  - Modified `jwt.sign()` calls to include `role` in the payload: `{ userId: user.id, role: user.role }`
  - Now after token verification, `req.user.role` contains the role value the server issued

---

### Vulnerability F3: Frontend Stores Role in localStorage

- **Found in**: `client/src/context/AuthContext.jsx`
- **Description of the Problem**:
  - After login, frontend fetches the user's role from the API response and stores it in localStorage
  - Frontend reads from `localStorage.getItem('role')` to determine which UI buttons to show
  - User can open DevTools → Application → Local Storage and change role value to "admin" instantly
  - UI enforcement is entirely under user control - no security benefit whatsoever
- **Impact**: High - Allows privilege escalation in UI (though backend was unprotected anyway)
- **Description of the Fix**:
  - Removed role storage from localStorage
  - Frontend now decodes the JWT payload directly to extract role
  - Decoding happens client-side (no verification needed for UI, backend verifies all actions)
  - Editing localStorage.token is still possible, but editing decoded value in DevTools doesn't change actual role

---

### Vulnerability F4: Missing Role Checks on Critical Endpoints

- **Found in**: `server/routes/fragments.js` - POST (create), PUT (edit), POST/:id/approve, DELETE endpoints
- **Description of the Problem**:
  - All endpoints verify that a valid token exists (authMiddleware), but none verify the user's role
  - A Contributor's token and an Admin's token are treated identically
  - POST / : Any authenticated user can create fragments (should be: Contributor+)
  - PUT /:id : Any authenticated user can edit any fragment (should be: Curator+ or owner if Contributor)
  - POST /:id/approve : Any authenticated user can approve fragments (should be: Curator+)
  - DELETE /:id : Any authenticated user can delete any fragment (should be: Admin+)
- **Impact**: Critical - Authentication exists but authorization is completely absent
- **Description of the Fix**:
  - Created `roleCheck` middleware factory: `(roles) => middleware that checks req.user.role`
  - Applied middleware to all critical routes:
    - POST / : `auth, roleCheck(['contributor', 'curator', 'admin'])`
    - PUT /:id : `auth, roleCheck(['curator', 'admin'])`
    - POST /:id/approve : `auth, roleCheck(['curator', 'admin'])`
    - DELETE /:id : `auth, roleCheck(['admin'])`

---

### Vulnerability F5: CSRF Vulnerability (No Origin Validation)

- **Found in**: `server/index.js`
- **Description of the Problem**:
  - CORS is configured with `origin: '*'` - accepts requests from ANY domain
  - No CSRF tokens are required on state-changing requests (POST, PUT, DELETE)
  - No SameSite cookie policy is configured
  - A malicious website can craft a single `fetch()` call with user's token and trigger actions
  - Even if backend role checks work perfectly, untrusted origins can still reach them
- **Impact**: Critical - Allows cross-site request forgery (CSRF) attacks from any website
- **Description of the Fix**:
  - Restricted CORS to only allow requests from `http://localhost:5173` (frontend dev server)
  - For production, this should be set to the actual frontend domain via environment variable
  - Added `credentials: 'include'` to CORS config (only credentials are sent to trusted origins)
  - Added SameSite=Strict header enforcement

---

### Vulnerability F6: Logout Does Not Invalidate Token

- **Found in**: `client/src/context/AuthContext.jsx` (logout handler) and `server/middleware/auth.js`
- **Description of the Problem**:
  - Logout only removes token from localStorage on the frontend
  - The JWT itself is never marked as revoked or added to a blocklist
  - If token was copied before logout, it still works on every API endpoint indefinitely
  - Combined with F1 (no expiry), stolen tokens are permanent backdoors
  - User's device stolen = attacker has permanent access until token naturally expires (or never)
- **Impact**: Critical - Logout is not a security boundary; tokens are never truly invalidated
- **Description of the Fix**:
  - Implemented server-side token blacklist: `const tokenBlacklist = new Set()` in `data/store.js`
  - Added blacklist check in auth middleware before `req.user` is set
  - Created `/api/auth/logout` endpoint that adds token to blacklist
  - Frontend calls logout endpoint before clearing localStorage
  - Replayed tokens are now rejected with 401 Unauthorized

---

## 🔐 Test Results After Fixes

✅ **Test 1: Token Structure**

- Fresh login token decoded at jwt.io shows: `{ userId: "...", role: "...", iat: ..., exp: ... }`
- Expiry is set to 1 hour from now
- Secret is not the old hardcoded literal

✅ **Test 2: Role Enforcement**

- Contributor token to `DELETE /api/fragments/1` returns `403 Forbidden`
- Reader token to `POST /api/fragments/:id/approve` returns `403 Forbidden`
- Admin token to `DELETE /api/fragments/1` returns `200 OK`

✅ **Test 3: Token Blacklist**

- Copy token before logout, call `/api/fragments` after logout returns `401 Unauthorized`
- Token in blacklist is rejected on all endpoints
- Fresh login generates new token that works until logout again

---

## 🔗 Why These Vulnerabilities Were Connected

1. **F1 (no expiry)** + **F6 (no blacklist)** = Tokens live forever (permanent backdoors)
2. **F2 (missing role)** makes **F4 (role checks)** impossible to implement properly
3. **F3 (localStorage role)** provides false UI security while backend remained unprotected
4. **F5 (CORS open)** allows attackers to reach unprotected endpoints from any website
5. Each vulnerability depends on the ones before it - fixing them out of order creates gaps

---

## 📝 Summary of Fixes Applied

**Phase 1: Token Integrity**

- ✅ Moved JWT secret to environment variable
- ✅ Added 1-hour token expiry
- ✅ Added role to JWT payload

**Phase 2: Enforcement**

- ✅ Created and applied roleCheck middleware to all endpoints
- ✅ Derived frontend role from decoded token instead of localStorage
- ✅ Verified each endpoint with appropriate role restrictions

**Phase 3: Session & Origin**

- ✅ Implemented token blacklist for logout
- ✅ Restricted CORS to trusted origin only
- ✅ Added SameSite cookie policy

All six vulnerabilities have been fixed. The auth layer is now cohesive and secure.`

- **Description of the Problem**:
- **Description of the Fix**:

---

### Vulnerability 5: [Vulnerability Name]

- **Found in**: `path/to/file.js`
- **Description of the Problem**:
- **Description of the Fix**:

---

### Vulnerability 6: [Vulnerability Name]

- **Found in**: `path/to/file.js`
- **Description of the Problem**:
- **Description of the Fix**:

---

> [!NOTE]
> Ensure that all fixes are tested in isolation using an API client (like Postman or curl) to confirm that unauthorized requests are rejected even if they bypass the frontend UI.
