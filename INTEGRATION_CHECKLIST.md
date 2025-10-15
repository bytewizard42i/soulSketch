# SoulSketch × MyAlice × Notion Integration Checklist

**For Cassie** 👋  
This checklist guides you through implementing the integration in phases.

## ✅ Phase 1: GitHub-First Foundation (Completed)

### Configuration & Schemas
- [x] Create `config/.soulmeta.json` - Main configuration
- [x] Create `config/policies.myalice.json` - Role permissions
- [x] Create `schemas/memory_packet.schema.json` - Packet structure

### API Layer
- [x] Create `api/types.ts` - TypeScript interfaces
- [x] Create `api/index.ts` - Memory API gateway
- [x] Create `api/storage.ts` - Hash, sanitize, projection utilities
- [x] Create `api/auth_myalice.ts` - Auth hooks (placeholder)

### Sync Layer
- [x] Create `sync/github_sync.ts` - GitHub read/write (canonical)
- [x] Create `sync/notion_sync.ts` - Notion placeholders (no-op)
- [x] Create `sync/transforms/markdown_to_notion.ts` - Transform stubs
- [x] Create `sync/transforms/notion_to_markdown.ts` - Transform stubs

### Scripts & Tools
- [x] Create `scripts/import_md.ts` - Import markdown files
- [x] Create `scripts/export_md.ts` - Export with filters
- [x] Create `scripts/backfill_to_notion.ts` - Batch sync script

### CI/CD
- [x] Create `.github/workflows/soulsketch-sync.yml` - Auto-sync workflow

### Documentation
- [x] Create `NOTION_INTEGRATION.md` - Comprehensive guide
- [x] Create `memory_packs/README.md` - Directory documentation
- [x] Create `templates/memory_packet_template.md` - Packet template
- [x] Create this checklist

## 🔄 Phase 2: Notion Integration (Next Steps)

### Prerequisites
- [ ] Create Notion integration at https://www.notion.so/my-integrations
- [ ] Create three Notion databases:
  - [ ] Memory database (main storage)
  - [ ] Projects database (project metadata)
  - [ ] Entities database (people/AIs/orgs)
- [ ] Share databases with integration
- [ ] Get database IDs (copy from URL or API)

### Environment Setup
- [ ] Set environment variables:
  ```bash
  export NOTION_TOKEN="secret_..."
  export NOTION_DB_MEMORY_ID="..."
  export NOTION_DB_PROJECTS_ID="..."
  export NOTION_DB_ENTITIES_ID="..."
  ```
- [ ] Add to GitHub Actions secrets (if using CI/CD)
- [ ] Set repository variable `NOTION_ENABLED='true'`

### Configuration Updates
- [ ] Update `config/.soulmeta.json`:
  - [ ] Set `notion.enabled: true`
  - [ ] Set `features.notion_sync: true`
  - [ ] Update database IDs in `notion.databases`

### Implementation
- [ ] Install Notion SDK: `npm install @notionhq/client`
- [ ] Implement `sync/notion_sync.ts`:
  - [ ] `upsertToNotion()` - Create/update pages
  - [ ] `readFromNotion()` - Fetch pages
  - [ ] `deleteFromNotion()` - Archive pages
  - [ ] `batchSyncToNotion()` - Batch operations
- [ ] Implement `sync/transforms/markdown_to_notion.ts`:
  - [ ] Parse markdown to Notion blocks
  - [ ] Handle headings, paragraphs, lists
  - [ ] Handle code blocks
  - [ ] Map packet fields to database properties
- [ ] Implement `sync/transforms/notion_to_markdown.ts`:
  - [ ] Convert Notion blocks to markdown
  - [ ] Extract database properties
  - [ ] Preserve formatting

### Testing
- [ ] Test single packet sync:
  ```bash
  node -e "import('./api/index.js').then(m => m.memoryAPI.upsertPacket({...}, 'owner'))"
  ```
- [ ] Test backfill:
  ```bash
  pnpm ts-node scripts/backfill_to_notion.ts --dry-run
  pnpm ts-node scripts/backfill_to_notion.ts --since 2025-10-01
  ```
- [ ] Verify in Notion:
  - [ ] Pages created correctly
  - [ ] Properties mapped properly
  - [ ] Content formatted well
  - [ ] Tags and relationships work

### Debugging
- [ ] Add logging to sync operations
- [ ] Handle rate limiting (3 requests/second)
- [ ] Implement retry logic with exponential backoff
- [ ] Track sync status (last sync time, errors)

## 🎯 Phase 3: Bidirectional Sync (Future)

### Notion → GitHub Pull
- [ ] Implement periodic polling (every 15 minutes)
- [ ] Detect changes in Notion (compare `last_edited_time`)
- [ ] Pull changed pages and convert to packets
- [ ] Write to GitHub if newer than local version

### Conflict Resolution
- [ ] Implement timestamp comparison
- [ ] Newest `updated_at` wins
- [ ] Log conflicts to audit trail
- [ ] Optional: Create conflict markers in content

### Audit Trail
- [ ] Track all changes with timestamps
- [ ] Log user/AI who made changes
- [ ] Store in `memory_packs/.audit.jsonl`
- [ ] Add to Git commits

## 🔐 Phase 4: MyAlice DID Integration (Future)

### Authentication
- [ ] Research DID verification libraries
- [ ] Implement `auth_myalice.ts` with real DID checks
- [ ] Replace header auth with signature verification
- [ ] Map DIDs to roles via policy engine

### Authorization
- [ ] Notion page sharing based on role
- [ ] Dynamic permission updates
- [ ] "Request access" workflow
- [ ] Access logging and auditing

### Identity Tracking
- [ ] Add DID fields to memory packets
- [ ] Track authors by DID
- [ ] Entity references use DIDs
- [ ] Cross-reference with MyAlice identity graph

## ✨ Phase 5: UX & Polish (Future)

### Notion Dashboards
- [ ] Create project overview dashboard
- [ ] Build memory timeline view
- [ ] Entity relationship map
- [ ] Tag cloud and filtering

### Search & Discovery
- [ ] Full-text search in Notion
- [ ] Search by tags, entities, projects
- [ ] Related memories suggestions
- [ ] Memory graph visualization

### Rich Content
- [ ] Embed Mermaid diagrams
- [ ] Support PlantUML
- [ ] Handle binary assets (images)
- [ ] File attachments sync

### Automation
- [ ] Auto-tagging based on content
- [ ] Suggested entity extraction
- [ ] Memory clustering
- [ ] Duplicate detection

## 📊 Testing & Validation

### Unit Tests
- [ ] Test `github_sync.ts` functions
- [ ] Test `storage.ts` utilities (hash, sanitize, project)
- [ ] Test role-based access control
- [ ] Test markdown ↔ packet conversion

### Integration Tests
- [ ] Test API gateway end-to-end
- [ ] Test GitHub write → read cycle
- [ ] Test Notion sync (when implemented)
- [ ] Test error handling and retries

### End-to-End Tests
- [ ] Create memory via CLI → verify in GitHub
- [ ] Enable Notion → verify sync
- [ ] Modify in Notion → pull back to GitHub
- [ ] Test with different roles

## 📝 Documentation Updates

- [ ] Add examples to `NOTION_INTEGRATION.md`
- [ ] Document Notion database schema
- [ ] Create video walkthrough
- [ ] Update main `README.md` with integration info
- [ ] Add troubleshooting section

## 🚀 Deployment

### Development
- [ ] Test locally with all features
- [ ] Verify environment variables
- [ ] Check logs for errors

### Staging
- [ ] Deploy to test environment
- [ ] Run backfill on subset of data
- [ ] Monitor for issues

### Production
- [ ] Enable Notion sync gradually
- [ ] Monitor sync performance
- [ ] Set up alerts for failures
- [ ] Document rollback procedure

## 💡 Optional Enhancements

### Performance
- [ ] Implement caching layer
- [ ] Batch operations for efficiency
- [ ] Lazy loading for large memory sets
- [ ] Incremental sync (only changed packets)

### Monitoring
- [ ] Sync success/failure metrics
- [ ] Performance dashboards
- [ ] Error rate tracking
- [ ] Usage analytics

### Collaboration
- [ ] Comment threads in Notion
- [ ] Notification system
- [ ] Review/approval workflow
- [ ] Version comparison view

---

## 🎓 Learning Resources

- [Notion API Docs](https://developers.notion.com/)
- [Notion SDK](https://github.com/makenotion/notion-sdk-js)
- [MyAlice Protocol Spec](../myAlice/README.md)
- [SoulSketch Protocol Spec](./protocol/SPECIFICATION.md)

## 🤝 Getting Help

- Ask Alice or Casey (they reviewed this design!)
- Check `NOTION_INTEGRATION.md` for detailed guide
- Review example memory packets in `memory_packs/`
- Run scripts with `--help` flag

---

**Current Status**: ✅ Phase 1 Complete  
**Next Action**: Start Phase 2 when ready for Notion integration

**Note**: Phase 1 is fully functional! You can use the GitHub-backed memory system immediately. Notion is purely optional enhancement for human-readable UI.

*Good luck, Cassie! You've got this!* 💜✨
