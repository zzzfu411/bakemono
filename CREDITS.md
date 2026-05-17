# 资产署名 / Asset Credits

本游戏所有美术资产均由生成式 AI 模型创作；代码由人类作者撰写并在 LLM 辅助下完善。本文档列出每类资产的来源以保障比赛合规与第三方权属透明。

---

## 1. 代码 / Code

| 部分 | 作者 | 说明 |
|---|---|---|
| 游戏主体（TypeScript） | Zhi Fu (zzzfu411@gmail.com) | 设计与实现，~3500 行 |
| 实现辅助 | Claude (Anthropic) | 在作者指挥下生成 / 修改部分模块，作者审阅与集成 |

无第三方代码库（除 Vite + TypeScript 工具链外，运行时零依赖）。

---

## 2. 美术资产 / Visual Assets

所有 PNG 资产均由生成式 AI 出图、再经作者裁切 / chroma key 透明化 / 切帧后落地。

### 2.1 角色精灵 / Character Sprites

| 文件 | 用途 | 帧布局 |
|---|---|---|
| `assets/sprites/generated/player-noir-spritesheet.png` | 玩家角色 | 4×2 = 8 帧（idle / walk×3 / attack×3 / dash） |
| `assets/sprites/generated/crab-yokai-spritesheet.png` | 蟹妖 | 4×2 |
| `assets/sprites/generated/claw-yokai-spritesheet.png` | 爪妖 | 4×2 |
| `assets/sprites/generated/snake-yokai-spritesheet.png` | 蛇妖 | 4×2 |
| `assets/sprites/generated/stagking-boss-spritesheet.png` | 鹿王（区 1 Boss） | 4×2 = 600×600 / 帧 |
| `assets/sprites/generated/chimekeeper-boss-spritesheet.png` | 钟守（区 2 Boss） | 4×2 |
| `assets/sprites/generated/mourner-boss-spritesheet.png` | 哀悼者（区 3 Boss） | 4×2 |
| `assets/sprites/generated/cathedra-boss-spritesheet.png` | 圣座（区 4 Boss） | 4×2 |
| `assets/shop/shopkeeper-spritesheet.png` | 余墨堂店主 NPC | 4×2 |

### 2.2 武器特效 / Weapon FX

| 文件 | 用途 |
|---|---|
| `assets/effects/generated/weapon-sword-spritesheet.png` | 墨刃挥砍 |
| `assets/effects/generated/weapon-spear-spritesheet.png` | 骨矛刺击 |
| `assets/effects/generated/weapon-bow-spritesheet.png` | 言灵弓射出 |
| `assets/effects/generated/weapon-staff-spritesheet.png` | 冥府法杖法弹 |
| `assets/effects/generated/weapon-chakram-spritesheet.png` | 回旋墨刃 |
| `assets/effects/generated/weapon-bell-spritesheet.png` | 镇魂圣铃音波 |
| `assets/effects/generated/yokai-attack-effects-spritesheet.png` | 通用怪物攻击特效 |
| `assets/effects/fold-open-spritesheet.png` | 妖纹展开过场 (1920×1080 × 8) |
| `assets/effects/fold-close-spritesheet.png` | 妖纹坍缩过场 |
| `assets/effects/resurrect-success-spritesheet.png` | 原地重生成功粒子 |
| `assets/effects/resurrect-fail-spritesheet.png` | 复生失败粒子 |

### 2.3 场景背景 / Backgrounds

| 文件 | 用途 |
|---|---|
| `assets/backgrounds/bg-01-grey-city.png` | 区 1 巨木薄林 / 默认 |
| `assets/backgrounds/bg-02-sunset-city.png` | 区 2 失重钟楼 |
| `assets/backgrounds/bg-03-noir-city.png` | 横平面展开背景 |
| `assets/backgrounds/bg-04-cathedral-vertical.png` | 区 4 教会圣城 - 纵 |
| `assets/backgrounds/bg-04-cathedral-noir.png` | 区 4 教会圣城 - 横 |
| `assets/backgrounds/bg-05-shop-night.png` | 余墨堂商店房 |

### 2.4 障碍物 / Obstacles

`assets/obstacles/` 下 10 张 PNG，对应 4 区主题（torii / stump×3 / clocktower-slab / clocktower-pillar / cathedral-chain / graveyard-stone×3）。

### 2.5 UI / HUD

| 路径 | 内容 |
|---|---|
| `assets/hud/*.png` | 14 个 HUD 图标 + 镇魂蛇圣痕条 3 帧 + 重生坛 + 破损锚 |
| `assets/cards/levelup-*.png` | 升级三选一的 4 类卡背景图 |
| `assets/weapons/*.png` | 6 把武器图标 |
| `assets/items/*.png` | 14 件道具图标 |
| `assets/treasure/*.png` | 7 个宝藏选项图标 |
| `assets/potions/*.png` | 2 种商店药水图 |
| `assets/charms/*.png` | 8 种商店符箓图 |
| `assets/shop/shop-banner.png` | 商店招幌 |

### 2.6 标题画面 / Title Screen

| 路径 | 内容 |
|---|---|
| `assets/title-ink-frame-*.png` | 「怪物物语」标题水墨动画（6 帧 + 1 base） |
| `assets/start-ink-frame-*.png` | START 按钮水墨动画（6 帧 + 1 base） |

---

## 3. 字体 / Fonts

游戏 UI 使用系统字体栈，未打包第三方字体：
- 中文：`"PingFang SC"`, `"Microsoft YaHei"`, `"Yu Gothic"`, `"Meiryo"`
- 西文：`-apple-system`, `BlinkMacSystemFont`, `"Segoe UI"`, `Roboto`, `Helvetica`
- 等宽（kbd 元素）：`"SF Mono"`, `Consolas`, `Menlo`

---

## 4. 音频 / Audio

本提交版本不含音频资产。

---

## 5. 生成时间线 / Generation Timeline

| 日期 | 批次 | 内容 |
|---|---|---|
| 2026-05-17 | 主美术批次 | 4 Boss + 6 武器特效 + 4 区背景 + 7 妖怪 + 玩家 + 升级卡 + 14 道具 + 7 宝藏 + 6 武器图标 + HUD 图标 + 镇魂蛇 + 妖纹过场 |
| 2026-05-17-shop | 商店扩展批次 | 店主 NPC + 商店招幌 + 夜市背景 + 2 药水 + 8 符箓 + 重生坛 + 破损锚 + 重生成功/失败粒子 |

详见 `public/assets/generated-art-manifest.json` 与 `generated-sources/*/batch-summary.json`。

---

## 6. 第三方依赖 / Third-party Dependencies

仅构建期依赖，运行时无外部库：

| 包 | 版本 | License |
|---|---|---|
| typescript | ~6.0.2 | Apache-2.0 |
| vite | ^8.0.12 | MIT |

---

## 7. 鸣谢 / Acknowledgements

- 世界观参考：日本「物の怪」「妖怪」民俗 + 西尾维新《物语》系列氛围（仅参考调性，无直接元素）
- 玩法参考：Hades / Dead Cells / Hollow Knight 的 roguelike 房间循环
- 代码协作：Claude (Anthropic) — 提供模块重构 / 数值平衡 / 文档生成的辅助
