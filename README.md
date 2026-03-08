# 🔮 Loki Office

> Multi-Agent Workflow UI for [Loki-Oracle](https://github.com/zirz1911/Loki-Oracle)
> ควบคุม tmux agents ผ่าน Web UI — Norse-themed, real-time, local-first

---

## ภาพรวม

Loki Office คือ Web UI สำหรับดูและส่งคำสั่งไปยัง tmux sessions ที่รัน Norse agents
แต่ละ agent จะแสดงเป็น avatar พร้อม emoji badge และ status แบบ real-time

| Session | Realm | สี |
|---------|-------|----|
| `loki-oracle` | **Asgard** | Gold |
| `midgard` | Midgard | Green |
| `jotunheim` | Jotunheim | Blue |
| `niflheim` | Niflheim | Ice Blue |
| `muspelheim` | Muspelheim | Red |
| `vanaheim` | Vanaheim | Teal |
| `alfheim` | Alfheim | Purple |

| Window name | Agent | Emoji | สี |
|-------------|-------|-------|----|
| `odin` | Orchestrator | 👁️ | Gold |
| `thor` | Code Brain | ⚡ | Blue |
| `loki` | Quick Explorer | 🔮 | Purple |
| `heimdall` | Researcher | 🌈 | Teal |
| `tyr` | Strategic Coder | ⚔️ | Red |
| `ymir` | Master Builder | 🏔️ | Gray |

---

## Requirements

- **OS**: Linux / macOS
- **Bun** ≥ 1.0 — JavaScript runtime
- **tmux** — terminal multiplexer
- **PM2** (optional) — สำหรับ production deployment

---

## การติดตั้ง

### 1. Clone repository

```bash
git clone https://github.com/zirz1911/Loki-Office.git ~/Project/Loki-Office
cd ~/Project/Loki-Office
```

### 2. ติดตั้ง Bun

```bash
curl -fsSL https://bun.sh/install | bash
source ~/.bashrc   # หรือ source ~/.zshrc
bun --version      # ตรวจสอบ: ควรเห็น 1.x.x
```

### 3. ติดตั้ง dependencies

```bash
bun install
```

### 4. Build frontend

```bash
cd office && bunx vite build && cd ..
```

> ไฟล์ที่ build จะอยู่ที่ `dist-office/`

### 5. Setup tmux sessions

Script นี้จะสร้าง session `loki-oracle` (6 windows) และ `loki-office` (server) ให้อัตโนมัติ:

```bash
bash scripts/setup.sh
```

ผลลัพธ์ที่ได้:

```
tmux sessions:
  loki-oracle
    0: odin       👁️  Oracle Orchestrator
    1: thor       ⚡  Code Brain
    2: loki       🔮  Quick Explorer
    3: heimdall   🌈  Researcher
    4: tyr        ⚔️  Strategic Coder
    5: ymir       🏔️  Master Builder

  loki-office
    0: server     → http://localhost:3456
```

### 6. เปิด Web UI

```
http://localhost:3456/office
```

---

## การใช้งาน

### Web UI

| Route | หน้า |
|-------|------|
| `/office` | Office view — rooms + agent avatars |
| `/office#mission` | Mission Control — timeline view |

**คลิก agent** → เปิด terminal modal → พิมพ์คำสั่งส่งไปยัง tmux โดยตรง

**Shortcuts:**

| Key | Action |
|-----|--------|
| `?` | แสดง shortcut overlay |
| `Esc` | ปิด modal |
| `←` `→` | navigate ระหว่าง agents ในห้องเดียวกัน |

### CLI

```bash
# list sessions
MAW_HOST=local bun src/cli.ts ls

# ดูหน้าจอ agent
MAW_HOST=local bun src/cli.ts peek odin

# ส่งคำสั่ง
MAW_HOST=local bun src/cli.ts hey thor "สร้าง quicksort ใน Python"

# start server
MAW_HOST=local bun src/server.ts
```

---

## Configuration

### Environment variables

| Variable | Default | คำอธิบาย |
|----------|---------|----------|
| `MAW_HOST` | `white.local` | tmux host (`local` = localhost) |
| `MAW_PORT` | `3456` | port สำหรับ server |

### ใช้บนเครื่อง local

```bash
export MAW_HOST=local
bun src/server.ts
```

### ใช้กับ remote host (SSH)

```bash
export MAW_HOST=my-server.local
bun src/server.ts
```

---

## Development

### Start dev server (hot reload)

```bash
# Terminal 1 — backend
MAW_HOST=local bun --watch src/server.ts

# Terminal 2 — frontend HMR
cd office && bunx vite
```

เปิด `http://localhost:5173` สำหรับ Vite HMR

### PM2 (production)

```bash
# Start
pm2 start ecosystem.config.cjs

# Restart
pm2 restart loki-office

# Logs
pm2 logs loki-office

# Stop
pm2 delete loki-office
```

---

## เพิ่ม session ใหม่

สร้าง tmux session ชื่อตาม Norse realms เพื่อให้ UI แสดง room theme อัตโนมัติ:

```bash
# สร้าง session ใหม่
tmux new-session -d -s midgard -n agent1
tmux new-window -t midgard -n agent2

# reload หน้าเว็บ — room "Midgard" จะปรากฏขึ้นเอง
```

Session ที่ไม่ตรงกับชื่อ Norse realm จะแสดงเป็น "Realm" สีสุ่มตามชื่อ

---

## Project Structure

```
Loki-Office/
├── src/
│   ├── server.ts          # Hono HTTP + WebSocket server
│   ├── ssh.ts             # tmux control (local/SSH)
│   ├── cli.ts             # CLI entry point
│   └── ui.html            # Simple HTML UI (fallback)
├── office/                # React frontend (Vite)
│   └── src/
│       ├── App.tsx
│       ├── components/
│       │   ├── AgentAvatar.tsx    # Norse avatar + emoji badge
│       │   ├── RoomGrid.tsx       # Norse realm grid
│       │   ├── MissionControl.tsx
│       │   ├── TerminalModal.tsx
│       │   └── ...
│       └── lib/
│           ├── constants.ts   # Norse rooms + agent colors
│           └── types.ts
├── scripts/
│   └── setup.sh           # tmux session bootstrap
├── dist-office/           # Built frontend (gitignored)
├── ecosystem.config.cjs   # PM2 config
└── package.json
```

---

## Troubleshooting

### `bunx: command not found`

```bash
export PATH="$HOME/.bun/bin:$PATH"
echo 'export PATH="$HOME/.bun/bin:$PATH"' >> ~/.bashrc
```

### หน้า UI ว่าง / ไม่เห็น agents

1. ตรวจว่า tmux sessions ทำงานอยู่: `tmux list-sessions`
2. ตรวจว่า `MAW_HOST=local` ถูก set
3. ดู server logs: `pm2 logs loki-office` หรือดู terminal ที่รัน server

### Server ไม่ start

```bash
# ตรวจ port
lsof -i :3456

# Kill แล้ว restart
kill $(lsof -ti :3456)
MAW_HOST=local bun src/server.ts
```

### tmux session หายหลัง reboot

```bash
bash scripts/setup.sh
```

---

## License

MIT — fork และ customize ได้เลย

---

*Loki Office — forked from [maw-js](https://github.com/Soul-Brews-Studio/maw-js) by Soul Brews Studio*
