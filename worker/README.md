# 🚀 Vivly Worker - Quick Reference

## 📂 File Structure at a Glance

```
worker/
├── src/
│   ├── index.ts              ← Start here (main entry point)
│   ├── config/
│   │   └── constants.ts      ← App configuration
│   ├── middleware/
│   │   ├── auth.ts          ← User authentication
│   │   └── admin.ts         ← Admin checks
│   ├── routes/              ← API endpoints (8 files)
│   │   ├── health.ts
│   │   ├── tasks.ts
│   │   ├── focus.ts
│   │   ├── riva.ts
│   │   ├── orb.ts
│   │   ├── insights.ts
│   │   ├── admin.ts
│   │   └── waitlist.ts
│   ├── services/
│   │   ├── supabase.ts      ← Database client
│   │   └── ai/              ← AI integrations
│   │       ├── grok.ts
│   │       ├── groq.ts
│   │       └── sarvam.ts
│   ├── types/
│   │   └── index.ts         ← TypeScript types
│   └── utils/
│       └── heuristic-parser.ts  ← Command parsing
│
├── ARCHITECTURE.md           ← Visual diagrams
├── STRUCTURE.md              ← Detailed documentation
└── REORGANIZATION_SUMMARY.md ← What changed

Old file: src/index.ts.backup (1255 lines - monolithic)
New file: src/index.ts (40 lines - organized)
```

## 🔍 Quick Navigation

### Need to...?

**Add a new API endpoint?**
→ Create file in `routes/` → Import in `src/index.ts`

**Add AI integration?**
→ Create file in `services/ai/` → Use in routes

**Modify authentication?**
→ Edit `middleware/auth.ts`

**Change admin emails?**
→ Edit `config/constants.ts`

**Add new types?**
→ Edit `types/index.ts`

**Update command parsing?**
→ Edit `utils/heuristic-parser.ts`

## 📍 Common Tasks

### 1. Add New Route
```typescript
// routes/newfeature.ts
import { Hono } from 'hono';
import { Bindings, Variables } from '../types';

const newRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>();

newRoutes.get('/', async (c) => {
  return c.json({ message: 'Hello!' });
});

export default newRoutes;
```

Then add to `index.ts`:
```typescript
import newRoutes from './routes/newfeature';
app.route('/api/newfeature', newRoutes);
```

### 2. Add New Type
```typescript
// types/index.ts
export interface NewType {
  id: string;
  name: string;
}
```

### 3. Add New Service
```typescript
// services/myservice.ts
export async function myFunction(param: string) {
  // Your logic here
  return result;
}
```

## 🛠️ Commands

```bash
# Start development server
npm run dev

# Deploy to Cloudflare
npm run deploy
```

## 📊 Module Summary

| Module | Lines | Purpose |
|--------|-------|---------|
| `index.ts` | 40 | Main entry point |
| `routes/admin.ts` | 250 | Admin analytics |
| `utils/heuristic-parser.ts` | 400 | Command parsing |
| `routes/insights.ts` | 130 | AI insights |
| `services/ai/groq.ts` | 120 | Groq AI |
| `services/ai/grok.ts` | 100 | Grok AI |
| Other route files | 50-100 | Specific features |

## 🔐 Security Checklist

- ✅ Auth middleware on all `/api/*` routes
- ✅ Public endpoints: `/health`, `/waitlist`
- ✅ Admin checks on `/admin/*` routes
- ✅ User ID from auth context (not body)
- ✅ Service role key for database access

## 🎯 API Endpoints Quick Reference

### Public (No Auth)
- `GET  /api/health` - Health check
- `POST /api/waitlist` - Waitlist signup

### Authenticated
- `GET    /api/tasks` - List tasks
- `POST   /api/tasks` - Create task
- `PATCH  /api/tasks/:id` - Update task
- `DELETE /api/tasks/:id` - Delete task
- `POST   /api/focus` - Create focus session
- `POST   /api/riva/plan` - AI command
- `POST   /api/riva/speak` - TTS
- `POST   /api/riva/morning-briefing` - AI briefing
- `POST   /api/orb-guide` - Rhythm insights
- `POST   /api/insights/memory` - Pattern analysis

### Admin Only
- `GET /api/admin/stats` - Platform metrics
- `GET /api/admin/user-timeline` - Activity timeline
- `GET /api/admin/feature-adoption` - Feature usage

## 📚 Documentation Files

- **ARCHITECTURE.md** - Visual diagrams and data flow
- **STRUCTURE.md** - Detailed module documentation
- **REORGANIZATION_SUMMARY.md** - Before/after comparison
- **README.md** - This quick reference

## 💡 Tips

1. **Follow the pattern**: Look at existing route files for examples
2. **Use types**: Import from `types/index.ts` for type safety
3. **Reuse services**: Don't duplicate Supabase client creation
4. **Keep routes thin**: Move complex logic to services
5. **Test locally**: Run `npm run dev` before deploying

## 🚨 Important Notes

- Original monolithic file backed up as `src/index.ts.backup`
- All functionality preserved, just reorganized
- Server starts successfully (tested with `npm run dev`)
- No breaking changes to API endpoints
- Environment variables unchanged (`.dev.vars`)

## ✨ Benefits

🎯 **Maintainable** - Easy to find and update code
⚡ **Scalable** - Add features without complexity
🧪 **Testable** - Isolated modules for testing
👥 **Collaborative** - Multiple devs can work together
🔒 **Secure** - Clear authentication boundaries
📖 **Documented** - Self-documenting structure

---

**Questions?** Check the detailed docs:
- Architecture → `ARCHITECTURE.md`
- Structure → `STRUCTURE.md`
- Summary → `REORGANIZATION_SUMMARY.md`
