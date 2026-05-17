# BK｜怪物物语 (Bakemono Monogatari)

> 双平面 · 妖纹展开 · 概率原地重生
> A Japanese-yokai-themed 2D action roguelike with a dual-plane mechanic.

---

## 关于本作 / About

《怪物物语》是一款日式妖怪题材的横版动作 roguelike：

- **双平面玩法** — 默认在「纵平面」（横版动作，可跳跃 / 重力）作战；按 `E` 触发「妖纹展开」切换到「横平面」（俯视 / 四向走位 / 弹幕躲避），20 秒后自动坍缩
- **圣痕热度** — 命中 / 受击都会积累热度，满 100 才能展开；展开会扣 1% **原地重生概率**，是核心博弈
- **概率原地重生机制** — 血量归零时摇骰，命中重生概率则原地满血复活，否则本局结束；初始仅 **30%**，靠堆道具 / 商店符箓往上拉
- **4 个区域 × 10 房 × 4 Boss** — 巨木薄林 → 失重钟楼 → 灰海墓原 → 教会圣城，每区有独立 Boss 与障碍主题
- **6 把武器 + 18 项属性 + 14 件道具 + 余墨堂商店** — 升级三选一 / 宝藏多操作 / 商店金币消费，构筑空间充足
- **怪物双轴成长** — 区域基础倍率 × 玩家等级 rubber-band，避免后期速通

---

## 操作 / Controls

| 键 | 动作 |
|---|---|
| `W` `A` `S` `D` | 移动（纵平面 W 跳跃 / 横平面四向） |
| `空格` | 冲刺，最多 2 段，附 0.2s 无敌帧 |
| 鼠标左键 | 普通攻击（按住连发） |
| 鼠标移动 | 瞄准方向 |
| `Q` | 当前武器的特殊技 |
| `R` | 切换武器（6 把循环） |
| `E` | 圣痕满后展开妖纹；展开中再按可主动坍缩 |
| `Esc` | 暂停 + 查看完整属性 / 已携带道具 |
| `H` | 在开始画面打开操作指南 |
| `1` ~ `6` | 在选项菜单 / 商店中快速选择对应槽位 |

---

## 玩法亮点 / Design Highlights

### 双平面 (Dual-plane Combat)
战斗在纵 / 横两个视角间切换，同一房间的障碍物在不同视角下分别担任「跳跃平台」与「掩体」。

### 妖纹展开 (Stigma Unfold)
20 秒强力时间，四向自由位移让走位空间倍增；但**任意受击立即坍缩**，且每次展开扣 1% 重生概率——强力但有代价。

### 原地重生 (Probability Resurrection)
取代传统的 game-over，死亡时按当前重生概率（默认 30%，受展开 / 道具 / 商店符箓影响）摇骰：
- 命中 → 原地满血复活 + 1 秒无敌（每次扣 2% 后续重生率，防无限）
- 失败 → 本局结束（重置属性，回主菜单）

### 怪物成长曲线
| 区域 | HP | 伤害 | 速度 | 奖励 |
|---|---|---|---|---|
| 巨木薄林 | ×1.00 | ×1.00 | ×1.00 | ×1.00 |
| 失重钟楼 | ×1.35 | ×1.15 | ×1.10 | ×1.20 |
| 灰海墓原 | ×1.80 | ×1.35 | ×1.20 | ×1.45 |
| 教会圣城 | ×2.40 | ×1.55 | ×1.30 | ×1.75 |

玩家 Lv>5 后再叠 +5% HP / +3% 伤害 / 级（封顶 +75% / +45%），避免单纯刷级压制。

---

## 技术栈 / Tech Stack

- **TypeScript 6** + **Vite 8** 构建链
- 纯 **Canvas 2D** 渲染（无 game engine 依赖）
- DOM 浮层 UI（HUD / 模态 / 商店 / 暂停 / 操作指南）
- SpriteSheet 帧动画 + 全屏过场 (fold open/close)
- 零运行时依赖，构建产物 ~80KB JS / ~27KB CSS

```
bg-poc/
├── src/
│   ├── main.ts             入口 + canvas 初始化
│   ├── game.ts             游戏主循环 + 房间流程
│   ├── start-screen.ts     开始画面 + 操作指南
│   ├── player.ts           玩家：物理 / 攻击 / 冲刺
│   ├── enemy.ts            7 种怪物 + 4 个 Boss
│   ├── weapon.ts           6 把武器 + Q 特殊技
│   ├── room.ts             房间生成 + 门 / 怪物 pack
│   ├── obstacle.ts         障碍物渲染（5 种 kind × 3 变体）
│   ├── obstacle-layouts.ts 每区独立障碍生成器
│   ├── treasure.ts         7 种宝藏操作
│   ├── shop.ts             余墨堂商店 6 槽生成
│   ├── items.ts            14 件可携带道具
│   ├── leveling.ts         16 种升级三选一
│   ├── state.ts            全局状态 + 怪物缩放函数
│   ├── ui.ts               所有 DOM 模态 / HUD 更新
│   ├── effect.ts           特效 + 妖纹过场
│   ├── projectile.ts       弹道 + HitArea
│   ├── spritesheet.ts      帧动画工具
│   ├── assets.ts           资产注册中心
│   ├── input.ts            键盘 / 鼠标输入
│   ├── math.ts             工具函数
│   └── types.ts            共享类型 / enum
├── public/assets/          所有美术资产
└── BG/                     世界观 / 设定 / 美术需求文档
```

---

## 构建与运行 / Build & Run

```bash
cd bg-poc
npm install
npm run dev     # 开发：http://localhost:5173
npm run build   # 生产构建：输出到 dist/
npm run preview # 本地预览生产构建
```

生产构建配置了 `base: './'`，可直接放进任何静态托管（itch.io / Vercel / Netlify / Nginx）。

直接 `npx serve dist` 也能本地预览（不能用 file:// 打开，浏览器会拒绝 ES module）。

---

## 美术资产署名 / Art Credits

游戏内所有美术资产均由 AI 模型生成，详见 [`CREDITS.md`](./CREDITS.md)。

---

## License

MIT — 代码部分。
美术资产为 AI 生成（无传统作者归属），自行承担二次使用合规风险。

---

## 制作 / Made by

**Zhi Fu** (zzzfu411@gmail.com)
代码主体在 Claude (Anthropic) 辅助下完成，美术资产由生成式 AI 产出，世界观与玩法设计由作者主导。
