export const dynamic = "force-dynamic"
import { NextResponse } from "next/server"
import { pool } from "@/lib/drizzle"
import { writeFileSync } from "fs"
import { join } from "path"

export async function POST() {
  try {
    // Fetch all columns
    const { rows } = await pool.query(`
      SELECT table_schema, table_name, column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_schema IN ('ops', 'memory', 'kb')
      ORDER BY table_schema, table_name, ordinal_position
    `)

    // Build schema object
    const schemaData: Record<string, Array<{name: string, type: string, nullable: boolean}>> = {}
    for (const row of rows) {
      const key = `${row.table_schema}.${row.table_name}`
      if (!schemaData[key]) schemaData[key] = []
      schemaData[key].push({
        name: row.column_name,
        type: row.data_type,
        nullable: row.is_nullable === 'YES'
      })
    }

    // Count tables per schema
    const counts = { ops: 0, memory: 0, kb: 0 }
    Object.keys(schemaData).forEach(key => {
      const schema = key.split('.')[0] as keyof typeof counts
      if (counts[schema] !== undefined) counts[schema]++
    })
    const total = counts.ops + counts.memory + counts.kb

    const now = new Date().toISOString().slice(0, 16).replace('T', ' ')

    const html = generateHTML(schemaData, counts, total, now)
    
    const publicPath = join(process.cwd(), 'public', 'db-schema.html')
    writeFileSync(publicPath, html)

    return NextResponse.json({ success: true, tables: total, updated: now })
  } catch (error) {
    console.error('Failed to rebuild schema:', error)
    return NextResponse.json({ error: 'Failed to rebuild schema' }, { status: 500 })
  }
}

function generateHTML(
  schemaData: Record<string, Array<{name: string, type: string, nullable: boolean}>>,
  counts: { ops: number, memory: number, kb: number },
  total: number,
  timestamp: string
) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>OpenClaw DB Schema</title>
    <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
    <style>
        * { box-sizing: border-box; }
        body { font-family: system-ui, sans-serif; margin: 0; padding: 20px; background: #1a1a2e; color: #eee; }
        h1 { color: #00d4ff; margin-bottom: 5px; }
        h2 { color: #aaa; font-size: 16px; margin: 30px 0 10px; }
        .header-row { display: flex; align-items: center; gap: 15px; flex-wrap: wrap; }
        .meta { color: #888; font-size: 14px; }
        .rebuild-btn { background: #16213e; border: 1px solid #00d4ff; color: #00d4ff; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 13px; transition: all 0.2s; }
        .rebuild-btn:hover { background: #00d4ff; color: #1a1a2e; }
        .rebuild-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .stats { display: flex; gap: 15px; margin: 20px 0 30px; flex-wrap: wrap; }
        .stat { background: #16213e; padding: 15px 25px; border-radius: 8px; text-align: center; }
        .stat-num { font-size: 28px; font-weight: bold; color: #00d4ff; }
        .stat-label { font-size: 12px; color: #888; }
        .diagram-box { background: #fff; border-radius: 10px; padding: 20px; margin: 20px 0; overflow-x: auto; }
        .mermaid { background: #fff; }
        .table-list { background: #16213e; padding: 15px; border-radius: 8px; margin: 20px 0; }
        .table-list h3 { margin-top: 0; color: #00d4ff; }
        .table-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 8px; }
        .table-item { background: #1f3460; padding: 8px 12px; border-radius: 4px; font-family: monospace; font-size: 13px; cursor: pointer; transition: all 0.2s; }
        .table-item:hover { background: #2a4a7f; }
        .table-item.expanded { background: #2a4a7f; border-radius: 4px 4px 0 0; }
        .schema-ops { border-left: 3px solid #4CAF50; }
        .schema-memory { border-left: 3px solid #2196F3; }
        .schema-kb { border-left: 3px solid #FF9800; }
        .columns-panel { display: none; background: #0d1b2a; padding: 10px 12px; margin-top: -8px; margin-bottom: 8px; border-radius: 0 0 4px 4px; font-size: 12px; grid-column: 1 / -1; }
        .columns-panel.show { display: block; }
        .col-row { display: flex; padding: 3px 0; border-bottom: 1px solid #1f3460; }
        .col-row:last-child { border-bottom: none; }
        .col-name { flex: 1; color: #00d4ff; font-family: monospace; }
        .col-type { flex: 1; color: #888; font-family: monospace; }
        .col-null { width: 60px; color: #666; font-size: 10px; text-align: right; }
        .expand-icon { float: right; color: #666; transition: transform 0.2s; }
        .table-item.expanded .expand-icon { transform: rotate(90deg); }
    </style>
</head>
<body>
    <div class="header-row">
        <h1>🗄️ OpenClaw Database Schema</h1>
        <button class="rebuild-btn" onclick="rebuildSchema()">🔄 Rebuild</button>
    </div>
    <p class="meta">Generated ${timestamp} · ${total} tables · Click table names to see columns</p>
    
    <div class="stats">
        <div class="stat"><div class="stat-num">${total}</div><div class="stat-label">Total Tables</div></div>
        <div class="stat"><div class="stat-num">${counts.ops}</div><div class="stat-label">ops</div></div>
        <div class="stat"><div class="stat-num">${counts.memory}</div><div class="stat-label">memory</div></div>
        <div class="stat"><div class="stat-num">${counts.kb}</div><div class="stat-label">kb</div></div>
    </div>

    <h2>📊 Core Relationships (Task Management)</h2>
    <div class="diagram-box">
        <pre class="mermaid">
erDiagram
    TASK_QUEUE { bigint id PK string title string status bigint parent_id FK }
    TASK_COMMENTS { bigint id PK bigint task_id FK text content }
    TASK_CHECKLIST { bigint id PK bigint task_id FK }
    TASK_EVENTS { bigint id PK bigint task_id FK }
    AGENT_EVENTS { bigint id PK bigint task_id FK string agent_id }
    TASK_QUEUE ||--o{ TASK_COMMENTS : has
    TASK_QUEUE ||--o{ TASK_CHECKLIST : has
    TASK_QUEUE ||--o{ TASK_EVENTS : logs
    TASK_QUEUE ||--o{ AGENT_EVENTS : triggers
        </pre>
    </div>

    <h2>⚙️ Workflow Engine</h2>
    <div class="diagram-box">
        <pre class="mermaid">
erDiagram
    WORKFLOWS { bigint id PK string name }
    RUNS { bigint id PK bigint workflow_id FK }
    STEPS { bigint id PK bigint run_id FK }
    TASKS { bigint id PK bigint run_id FK bigint step_id FK }
    WORKFLOWS ||--o{ RUNS : executes
    RUNS ||--o{ STEPS : has
    RUNS ||--o{ TASKS : spawns
    STEPS ||--o{ TASKS : contains
        </pre>
    </div>

    <h2>🔖 X Bookmarks</h2>
    <div class="diagram-box">
        <pre class="mermaid">
erDiagram
    X_BOOKMARKS { bigint id PK string tweet_id string author }
    BOOKMARK_FOLDERS { int id PK string name int parent_id FK }
    BOOKMARK_FOLDER_ITEMS { int folder_id FK int bookmark_id FK }
    KB_PROCESSING_QUEUE { bigint id PK bigint bookmark_id FK }
    X_BOOKMARKS ||--o{ BOOKMARK_FOLDER_ITEMS : categorized
    BOOKMARK_FOLDERS ||--o{ BOOKMARK_FOLDER_ITEMS : contains
    X_BOOKMARKS ||--o{ KB_PROCESSING_QUEUE : queued
        </pre>
    </div>

    <h2>🧠 Memory System</h2>
    <div class="diagram-box">
        <pre class="mermaid">
erDiagram
    ENTITIES { bigint id PK string name string type }
    ENTITY_RELATIONS { bigint id PK bigint source_id FK bigint target_id FK string relation }
    AGENT_PROFILES { int id PK string agent_id string reports_to FK }
    MEMORIES { bigint id PK text content string agent_id }
    ENTITIES ||--o{ ENTITY_RELATIONS : source
    ENTITIES ||--o{ ENTITY_RELATIONS : target
        </pre>
    </div>

    <h2>💰 Cost Tracking</h2>
    <div class="diagram-box">
        <pre class="mermaid">
erDiagram
    TASK_RUNS { bigint id PK }
    COST_ESTIMATES { bigint id PK bigint task_run_id FK decimal cost }
    API_USAGE { bigint id PK string service decimal cost_usd }
    COST_SNAPSHOTS { bigint id PK date snapshot_date }
    TASK_RUNS ||--o{ COST_ESTIMATES : tracks
        </pre>
    </div>

    <div class="table-list">
        <h3>📋 All Tables by Schema</h3>
        <h4 style="color:#4CAF50">ops</h4>
        <div class="table-grid" id="ops-tables"></div>
        <h4 style="color:#2196F3; margin-top:15px">memory</h4>
        <div class="table-grid" id="memory-tables"></div>
        <h4 style="color:#FF9800; margin-top:15px">kb</h4>
        <div class="table-grid" id="kb-tables"></div>
    </div>

    <script>
        mermaid.initialize({ startOnLoad: true, theme: 'default', securityLevel: 'loose', er: { useMaxWidth: true } });

        const schemaData = ${JSON.stringify(schemaData)};

        const tables = { ops: [], memory: [], kb: [] };
        Object.keys(schemaData).forEach(key => {
            const [schema, table] = key.split('.');
            if (tables[schema]) tables[schema].push({ name: table, columns: schemaData[key] });
        });
        Object.keys(tables).forEach(schema => tables[schema].sort((a, b) => a.name.localeCompare(b.name)));

        function renderTables(schema, containerId, cssClass) {
            const container = document.getElementById(containerId);
            tables[schema].forEach(table => {
                const item = document.createElement('div');
                item.className = \`table-item \${cssClass}\`;
                item.innerHTML = \`\${table.name} <span class="expand-icon">▶</span>\`;
                item.onclick = () => toggleColumns(item, table);
                container.appendChild(item);
            });
        }

        function toggleColumns(item, table) {
            const existing = item.nextElementSibling;
            if (existing && existing.classList.contains('columns-panel')) {
                existing.remove();
                item.classList.remove('expanded');
                return;
            }
            document.querySelectorAll('.columns-panel').forEach(p => p.remove());
            document.querySelectorAll('.table-item.expanded').forEach(i => i.classList.remove('expanded'));
            item.classList.add('expanded');
            const panel = document.createElement('div');
            panel.className = 'columns-panel show';
            let html = '';
            table.columns.forEach(col => {
                html += \`<div class="col-row"><span class="col-name">\${col.name}</span><span class="col-type">\${col.type}</span><span class="col-null">\${col.nullable ? 'NULL' : 'NOT NULL'}</span></div>\`;
            });
            panel.innerHTML = html;
            item.parentNode.insertBefore(panel, item.nextSibling);
        }

        async function rebuildSchema() {
            const btn = document.querySelector('.rebuild-btn');
            btn.disabled = true;
            btn.textContent = '⏳ Rebuilding...';
            try {
                const res = await fetch('/api/db-schema/rebuild', { method: 'POST' });
                if (res.ok) {
                    btn.textContent = '✅ Done!';
                    setTimeout(() => location.reload(), 500);
                } else {
                    btn.textContent = '❌ Failed';
                    setTimeout(() => { btn.textContent = '🔄 Rebuild'; btn.disabled = false; }, 2000);
                }
            } catch (e) {
                btn.textContent = '❌ Error';
                setTimeout(() => { btn.textContent = '🔄 Rebuild'; btn.disabled = false; }, 2000);
            }
        }

        renderTables('ops', 'ops-tables', 'schema-ops');
        renderTables('memory', 'memory-tables', 'schema-memory');
        renderTables('kb', 'kb-tables', 'schema-kb');
    </script>
</body>
</html>`
}
