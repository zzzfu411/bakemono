/**
 * Start screen — sits above the game canvas until the player presses START.
 * Reuses the GameStart prototype's atmospheric look (parallax bg + scene picker)
 * and animates the title-ink / start-ink frame sequences for the title & button.
 */

const TITLE_FRAMES = [1, 2, 3, 4, 5, 6].map((i) => `/assets/title-ink-frame-${i}.png`);
const START_FRAMES = [1, 2, 3, 4, 5, 6].map((i) => `/assets/start-ink-frame-${i}.png`);
const TITLE_BASE = '/assets/title-ink-base.png';
const START_BASE = '/assets/start-ink-base.png';

const BACKGROUNDS = [
  { id: 'memory', src: '/assets/backgrounds/bg-01-grey-city.png', label: '记忆' },
  { id: 'sunset', src: '/assets/backgrounds/bg-02-sunset-city.png', label: '黄昏' },
  { id: 'noir', src: '/assets/backgrounds/bg-03-noir-city.png', label: '黑墨' },
] as const;

export function showStartScreen(): Promise<void> {
  return new Promise<void>((resolve) => {
    const stage = document.getElementById('stage')!;
    const bgImg = document.querySelector<HTMLImageElement>('#bg-vertical img')!;
    const screen = buildOverlay();
    stage.appendChild(screen);

    // Preload all frame images so the cycle doesn't pop.
    [...TITLE_FRAMES, ...START_FRAMES].forEach((src) => {
      const img = new Image();
      img.src = src;
    });

    let titleIdx = 0;
    let startIdx = 0;
    let startHovered = false;
    const titleImg = screen.querySelector<HTMLImageElement>('.start-title-img')!;
    const startImg = screen.querySelector<HTMLImageElement>('.start-btn-img')!;

    const titleTimer = window.setInterval(() => {
      titleIdx = (titleIdx + 1) % TITLE_FRAMES.length;
      titleImg.src = TITLE_FRAMES[titleIdx];
    }, 220);

    const startTimer = window.setInterval(() => {
      startIdx = (startIdx + 1) % START_FRAMES.length;
      startImg.src = startHovered ? START_FRAMES[startIdx] : START_BASE;
    }, 130);

    // Mouse parallax — same feel as GameStart/index.html.
    const onPointerMove = (e: PointerEvent) => {
      const rect = stage.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width - 0.5) * -18;
      const y = ((e.clientY - rect.top) / rect.height - 0.5) * -12;
      stage.style.setProperty('--pan-x', `${x.toFixed(2)}px`);
      stage.style.setProperty('--pan-y', `${y.toFixed(2)}px`);
    };
    const onPointerLeave = () => {
      stage.style.setProperty('--pan-x', '0px');
      stage.style.setProperty('--pan-y', '0px');
    };
    stage.addEventListener('pointermove', onPointerMove, { passive: true });
    stage.addEventListener('pointerleave', onPointerLeave);

    // Scene picker — cycles the background image of #bg-vertical (which is the
    // initial background the game uses, so the player's chosen mood carries in).
    let bgIdx = 0;
    screen.querySelectorAll<HTMLButtonElement>('.scene-button').forEach((btn) => {
      btn.addEventListener('click', () => {
        const target = btn.dataset.target!;
        bgIdx = BACKGROUNDS.findIndex((b) => b.id === target);
        if (bgIdx < 0) bgIdx = 0;
        bgImg.src = BACKGROUNDS[bgIdx].src;
        stage.dataset.current = target;
        screen
          .querySelectorAll('.scene-button')
          .forEach((b) => b.classList.toggle('is-active', (b as HTMLElement).dataset.target === target));
      });
    });

    // Help panel: open/close + tab switching + backdrop dismiss.
    const helpBtn = screen.querySelector<HTMLButtonElement>('.start-help-btn')!;
    const helpPanel = screen.querySelector<HTMLElement>('.start-help-panel')!;
    const helpBackdrop = screen.querySelector<HTMLElement>('.start-help-backdrop')!;
    const helpClose = screen.querySelector<HTMLButtonElement>('.start-help-close')!;

    const openHelp = () => {
      helpPanel.classList.add('open');
      helpBackdrop.classList.add('open');
    };
    const closeHelp = () => {
      helpPanel.classList.remove('open');
      helpBackdrop.classList.remove('open');
    };
    helpBtn.addEventListener('click', openHelp);
    helpClose.addEventListener('click', closeHelp);
    helpBackdrop.addEventListener('click', closeHelp);

    // Tab switching inside help panel.
    const tabs = screen.querySelectorAll<HTMLButtonElement>('.start-help-tabs button');
    const sections = screen.querySelectorAll<HTMLElement>('.start-help-body section');
    tabs.forEach((btn) => {
      btn.addEventListener('click', () => {
        const target = btn.dataset.tab!;
        tabs.forEach((b) => b.classList.toggle('is-active', b === btn));
        sections.forEach((s) => s.classList.toggle('is-active', s.dataset.tab === target));
      });
    });

    // Start hover state.
    const startBtn = screen.querySelector<HTMLButtonElement>('.start-btn')!;
    startBtn.addEventListener('pointerenter', () => {
      startHovered = true;
    });
    startBtn.addEventListener('pointerleave', () => {
      startHovered = false;
      startImg.src = START_BASE;
    });

    // Begin click → fade out & resolve.
    const beginGame = () => {
      cleanup();
      screen.classList.add('fade-out');
      setTimeout(() => {
        screen.remove();
        resolve();
      }, 600);
    };
    startBtn.addEventListener('click', beginGame);

    const onKey = (e: KeyboardEvent) => {
      const isHelpOpen = helpPanel.classList.contains('open');
      if (e.key === 'Escape' && isHelpOpen) {
        e.preventDefault();
        closeHelp();
        return;
      }
      if (isHelpOpen) return; // swallow other keys when help is up
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        beginGame();
      } else if (e.key.toLowerCase() === 'h') {
        openHelp();
      } else if (/^[1-3]$/.test(e.key)) {
        const btn = screen.querySelector<HTMLButtonElement>(
          `.scene-button[data-target="${BACKGROUNDS[Number(e.key) - 1].id}"]`,
        );
        btn?.click();
      }
    };
    window.addEventListener('keydown', onKey);

    function cleanup() {
      clearInterval(titleTimer);
      clearInterval(startTimer);
      stage.removeEventListener('pointermove', onPointerMove);
      stage.removeEventListener('pointerleave', onPointerLeave);
      window.removeEventListener('keydown', onKey);
    }
  });
}

function buildOverlay(): HTMLDivElement {
  const el = document.createElement('div');
  el.id = 'start-screen';
  el.innerHTML = `
    <div class="start-vignette"></div>

    <div class="start-content">
      <img class="start-title-img" src="${TITLE_BASE}" alt="怪物物语" />

      <button class="start-btn" type="button" aria-label="START">
        <img class="start-btn-img" src="${START_BASE}" alt="START" />
      </button>

      <div class="start-actions">
        <button class="start-help-btn" type="button">操作指南</button>
        <a class="start-credits" href="https://github.com" target="_blank" rel="noopener">致谢</a>
      </div>
    </div>

    <div class="start-help-backdrop"></div>
    <div class="start-help-panel">
      <header class="start-help-head">
        <h2>操作指南</h2>
        <button class="start-help-close" type="button" aria-label="关闭">×</button>
      </header>

      <nav class="start-help-tabs">
        <button type="button" class="is-active" data-tab="controls">基础操作</button>
        <button type="button" data-tab="planes">双平面 · 展开</button>
        <button type="button" data-tab="loop">区域 · 房间</button>
        <button type="button" data-tab="death">死亡判定</button>
        <button type="button" data-tab="weapon">武器 · 成长</button>
        <button type="button" data-tab="tips">实战小贴士</button>
      </nav>

      <div class="start-help-body">
        <section data-tab="controls" class="is-active">
          <h3>键位</h3>
          <table class="kb-table">
            <tr><td><kbd>W</kbd> <kbd>A</kbd> <kbd>S</kbd> <kbd>D</kbd></td><td>移动（纵平面 W 跳跃 / 横平面四向）</td></tr>
            <tr><td><kbd>空格</kbd></td><td>冲刺，最多 2 段，附 0.2s 无敌帧</td></tr>
            <tr><td><kbd>鼠标左键</kbd></td><td>普通攻击（按住连发）</td></tr>
            <tr><td><kbd>鼠标移动</kbd></td><td>瞄准方向</td></tr>
            <tr><td><kbd>Q</kbd></td><td>当前武器的特殊技</td></tr>
            <tr><td><kbd>R</kbd></td><td>切换武器（6 把循环）</td></tr>
            <tr><td><kbd>E</kbd></td><td>圣痕满后展开妖纹；展开中再按可主动坍缩</td></tr>
            <tr><td><kbd>Esc</kbd></td><td>暂停 + 查看完整属性 / 已携带道具</td></tr>
            <tr><td><kbd>1</kbd> <kbd>2</kbd> <kbd>3</kbd></td><td>在选项菜单中快速选择对应卡片</td></tr>
          </table>
        </section>

        <section data-tab="planes">
          <h3>纵平面（默认 · 横版动作）</h3>
          <ul>
            <li>受重力影响，W 跳跃，可踩鸟居 / 树桩 / 墓碑顶部</li>
            <li>攻击范围由武器决定；近战需要贴脸，远程穿过透明障碍</li>
          </ul>
          <h3>横平面（妖纹展开 · 俯视）</h3>
          <ul>
            <li>圣痕热度满 100 后按 <kbd>E</kbd> 触发，持续 <b>20 秒</b></li>
            <li>四向自由移动，走位空间显著扩大，弹道更易躲</li>
            <li><b>任意受击</b>立刻坍缩回纵平面</li>
            <li>主动按 <kbd>E</kbd> 退出可保留 50% 剩余热度（道具「折页刀鞘」可提升到 100%）</li>
            <li>展开每次 <b>-1%</b> 原地重生概率，是核心博弈点</li>
          </ul>
          <h3>圣痕热度怎么涨</h3>
          <ul>
            <li>命中敌人：<b>+4 ~ 5</b>（普攻 / AOE）</li>
            <li>击杀敌人：<b>+8</b></li>
            <li>受击：<b>+20</b>（劣势翻盘机制）</li>
            <li>道具「灼热骨钉」「灰铃碎片」可提升获取倍率</li>
          </ul>
        </section>

        <section data-tab="loop">
          <h3>一局结构</h3>
          <ul>
            <li>共 4 个区域，依次：<b>巨木薄林 → 失重钟楼 → 灰海墓原 → 教会圣城</b></li>
            <li>每区最多进入 <b>10 个房间</b>，未在此前击败 Boss 则区域坍塌（即死）</li>
            <li>每清完一房，弹出 2-3 扇门，门上标注房间类型 + 奖励</li>
          </ul>
          <h3>房间类型</h3>
          <table class="kb-table">
            <tr><td><b>怪物间</b></td><td>清场后获得货币 + 经验</td></tr>
            <tr><td><b>宝藏间</b></td><td>3 项操作可选：拾取道具 / 灵魂锚定 / 血肉契约 / 圣痕祭礼 / 焚毁拒绝 / 诅咒花开 / 血之试炼</td></tr>
            <tr><td><b>商店 · 余墨堂</b></td><td>6 槽：随机道具 / 血墨药水 / 玲珑佛骨 / 攻速·暴击·护甲·速度等符箓</td></tr>
            <tr><td><b>宝箱间</b></td><td>守卫怪 + 额外 <b>+15</b> 货币</td></tr>
            <tr><td><b>Boss 间</b></td><td>击败后通关本区域，进入下一区</td></tr>
          </table>
          <h3>Boss 房概率（按已通关房间数）</h3>
          <p class="kb-prose">第 2 房 8% → 第 3 房 12% → 第 4 房 16% → 第 5 房 20% → 第 6 房 25% → 第 7 房 30% → 第 8 房及之后 <b>33%</b>；第 9 房后必出强制 Boss。</p>
          <h3>怪物成长曲线</h3>
          <table class="kb-table">
            <tr><td>巨木薄林（区 1）</td><td>HP×1.00 · 伤害×1.00 · 速度×1.00 · 奖励×1.00</td></tr>
            <tr><td>失重钟楼（区 2）</td><td>HP×1.35 · 伤害×1.15 · 速度×1.10 · 奖励×1.20</td></tr>
            <tr><td>灰海墓原（区 3）</td><td>HP×1.80 · 伤害×1.35 · 速度×1.20 · 奖励×1.45</td></tr>
            <tr><td>教会圣城（区 4）</td><td>HP×2.40 · 伤害×1.55 · 速度×1.30 · 奖励×1.75</td></tr>
            <tr><td>玩家 Lv&gt;5</td><td>每多一级额外 <b>+5% HP / +3% 伤害</b>（封顶 +75%/+45%）</td></tr>
            <tr><td>Boss</td><td>区域不再叠乘（按区分型号），仅吃等级 +4%HP / +2%dmg（封顶 +50%/+30%）</td></tr>
            <tr><td>宝箱守卫</td><td>在区域乘基础上再 HP×1.2</td></tr>
            <tr><td>普通怪刷怪数</td><td>区 1→3, 区 2→4, 区 3→5, 区 4→6</td></tr>
          </table>
          <p class="kb-prose">XP 曲线 ×1.45 一级，配合区域奖励 ×1.0→1.75，越深越费经验但每只怪给的多。后期想速通必须靠堆构筑——单纯升级压不住怪物的扩张。</p>
        </section>

        <section data-tab="death">
          <h3>原地重生 vs 复生失败</h3>
          <ul>
            <li>角色血量归零 → 弹出 <b>原地重生判定</b>（骰子滚 1.5 秒）</li>
            <li>判定值 <b>&lt;</b> 当前重生概率：<b>原地重生</b>，回满血继续当前房间</li>
            <li>判定值 <b>≥</b> 当前重生概率：<b>复生失败</b>，本局结束、属性重置回基础</li>
            <li>每次成功重生本身会扣 <b>2%</b> 重生概率，避免无限复活</li>
          </ul>
          <h3>原地重生概率怎么变化</h3>
          <table class="kb-table">
            <tr><td>初始</td><td><b>30%</b>（多数死亡都是真死，需要堆道具）</td></tr>
            <tr><td>每次展开</td><td>-1%</td></tr>
            <tr><td>诅咒道具「裂痕之力」</td><td>-3%（换 +25% 伤害）</td></tr>
            <tr><td>宝藏「诅咒花开」</td><td>-5%（换随机增益）</td></tr>
            <tr><td>道具「破碎圣徽」</td><td><b>+3%</b></td></tr>
            <tr><td>宝藏「灵魂锚定」（耗 12 币）</td><td><b>+4%</b></td></tr>
            <tr><td>商店「玲珑佛骨」（耗 18 币）</td><td><b>+5%</b></td></tr>
          </table>
          <p class="kb-prose">HUD 顶部右侧实时显示当前重生概率。展开非常强，但每开一次都在透支重生坐标；何时展开、何时落袋为安，是这游戏的核心博弈。</p>
        </section>

        <section data-tab="weapon">
          <h3>6 把武器（按 <kbd>R</kbd> 循环）</h3>
          <table class="kb-table weapons">
            <tr><td><b>墨刃</b><span>近战</span></td><td>扇形挥砍 · Q <b>墨突斩</b>：突进 200px + 无敌帧 + AOE</td></tr>
            <tr><td><b>骨矛</b><span>近战</span></td><td>长距直刺 · Q <b>贯穿刺</b>：5 段直线连击</td></tr>
            <tr><td><b>言灵弓</b><span>远程</span></td><td>片假名中速箭 · Q <b>穿透神箭</b>：穿透 3 个目标 ×2.4 伤害</td></tr>
            <tr><td><b>冥府法杖</b><span>法术</span></td><td>慢速法弹 · Q <b>净魂法阵</b>：1.4s 持续 AOE 地面</td></tr>
            <tr><td><b>回旋墨刃</b><span>远程</span></td><td>多段弧线 · Q <b>悬停切割</b>：远端 8 次连击</td></tr>
            <tr><td><b>镇魂圣铃</b><span>法术</span></td><td>圆环音波 · Q <b>圆环震荡</b>：30→600 扩张冲击波</td></tr>
          </table>
          <h3>成长系统</h3>
          <ul>
            <li>杀怪累积经验，升级时 <b>三选一</b>属性强化（暂停游戏并弹卡）</li>
            <li>共 16 种升级（战斗 / 生存 / 折维 / 经济四类）</li>
            <li>暂停 <kbd>Esc</kbd> 可查看 18 项完整属性与已携带道具</li>
            <li>道具来自：宝藏拾取、宝箱、特殊事件；同一道具同局不重复</li>
          </ul>
        </section>

        <section data-tab="tips">
          <h3>新手避坑</h3>
          <ul>
            <li>展开是<b>博弈</b>，不是无脑用——劣势救场或集火 Boss 时再开</li>
            <li>看见 Boss 房，先评估自身构筑；早期硬上更危险</li>
            <li>「<b>焚毁拒绝</b>」是紧急回血选项（+4 HP / +10 钱），别忽略</li>
            <li>蓝紫色蛇妖发射前有<b>圣纹晕染</b>前摇，可冲刺打断或绕到背后</li>
            <li>蟹妖会<b>举盾</b>（受伤减至 20%），绕背 / 等收盾再爆发</li>
            <li>清房瞬间可能连升数级，升级面板自动排队，可放心打</li>
          </ul>
          <h3>进阶</h3>
          <ul>
            <li>「灼热骨钉」+「折页刀鞘」组合：高频展开 + 低损耗，是核心 build</li>
            <li>近战流推荐：墨刃 + 重甲 + 剑术残页 + 风牢符（多冲刺=多无敌帧）</li>
            <li>远程流推荐：言灵弓 + 远弦 + 言灵铭札（暴击）+ 长臂咒（穿透范围）</li>
            <li>法术流推荐：镇魂圣铃 + 灰铃碎片 + 攻速升级（圈打怪非常稳）</li>
          </ul>
        </section>
      </div>

      <footer class="start-help-foot">
        按 <kbd>H</kbd> 或点击「操作指南」可随时打开 · 按 <kbd>Esc</kbd> 或点空白处关闭
      </footer>
    </div>

    <nav class="scene-picker" aria-label="场景氛围">
      <span class="scene-picker-label">氛围</span>
      <button class="scene-button is-active" type="button" data-target="memory" aria-label="灰墨城景"></button>
      <button class="scene-button" type="button" data-target="sunset" aria-label="黄昏血城"></button>
      <button class="scene-button" type="button" data-target="noir" aria-label="黑墨夜城"></button>
    </nav>

    <div class="start-version">v0.1 · PoC</div>
  `;
  return el;
}
