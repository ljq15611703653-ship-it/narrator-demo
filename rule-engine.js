(function () {
  'use strict';

  const DATA = window.WORLD_DATA;

  class FactGraph {
    constructor() {
      this.nodes = new Map();
      this.edges = [];
      this.listeners = new Set();
    }

    addNode(node) {
      const existing = this.nodes.get(node.id);
      const next = { visible: true, fixed: true, kind: 'now', fixedAt: 0, ...existing, ...node };
      this.nodes.set(next.id, next);
      this.emit({ type: existing ? 'update-node' : 'add-node', node: next });
      return next;
    }

    addEdge(edge) {
      const id = edge.id || `${edge.from}->${edge.to}:${edge.relation || 'implies'}`;
      if (this.edges.some((entry) => entry.id === id)) return;
      const next = { id, relation: 'implies', visible: true, ...edge };
      this.edges.push(next);
      this.emit({ type: 'add-edge', edge: next });
    }

    get visibleNodes() {
      return [...this.nodes.values()].filter((node) => node.visible);
    }

    get visibleEdges() {
      const visible = new Set(this.visibleNodes.map((node) => node.id));
      return this.edges.filter((edge) => edge.visible && visible.has(edge.from) && visible.has(edge.to));
    }

    onChange(listener) { this.listeners.add(listener); }
    emit(change) { this.listeners.forEach((listener) => listener(change)); }
  }

  const PROPHECY_CHECKS = {
    line_cross_center: (ctx) => ctx.match('cross', (e) => e.objectTags?.includes('line') && e.line === 'center' && ctx.afterCount('bell', 3, e.time)),
    bell_rings_off_hook: (ctx) => ctx.match('sound', (e) => e.objectTags?.includes('sound') && e.objectLocation !== 'hook'),
    tablet_leaves_plate: (ctx) => ctx.match('leave-surface', (e) => e.objectTags?.includes('medicine') && e.surface === 'plate' && ctx.before(e, 'lamp-off')),
    round_mark_on_blanket: (ctx) => ctx.match('mark', (e) => e.shape === 'round' && e.targetTags?.includes('fabric') && ctx.afterCount('light-cycle', 1, e.time)),
    doorframe_in_mirror: (ctx) => ctx.match('reflection', (e) => e.subject === 'doorframe' && ctx.after('missing-note', e.time)),
    light_on_doll_face: (ctx) => ctx.match('light-hit', (e) => e.targetTags?.includes('figure') && e.part === 'face' && ctx.clockAt('eight', e.time)),
    water_cross_blue_line: (ctx) => ctx.match('cross', (e) => e.material === 'water' && e.line === 'blue' && ctx.afterCount('tick', 4, e.time)),
    bucket_water_decreases: (ctx) => ctx.match('quantity-change', (e) => e.objectTags?.includes('container') && e.material === 'water' && e.delta < 0 && ctx.before(e, 'drain-sound')),
    projectile_cross_red_height: (ctx) => ctx.match('projectile-cross', (e) => e.fromChamber && e.line === 'red-height'),
    spent_round_on_tray: (ctx) => ctx.match('land', (e) => e.projectile && e.leftMagazine && e.targetTags?.includes('bridge') && ctx.before(e, 'bell')),
    last_projectile_stops_before_north: (ctx) => ctx.latestProjectile()?.stoppedBefore === 'north',
    strip_color_on_camera: (ctx) => ctx.match('camera-capture', (e) => e.subjectTags?.includes('test') && e.attribute === 'color' && ctx.afterCount('door-shadow', 2, e.time)),
    name_beside_red_mark: (ctx) => ctx.match('adjacent', (e) => e.aType === 'name' && e.bType === 'red-mark' && ctx.after('paper-flip', e.time)),
    outside_hears_room_audio: (ctx) => ctx.match('audio-transfer', (e) => e.from === 'room' && e.to === 'outside' && ctx.after('line-connected', e.time)),
    two_objects_swap_height: (ctx) => ctx.match('height-swap', (e) => e.nonAdjacent && ctx.before(e, 'knot-open')),
    object_falls_outside_rail: (ctx) => ctx.match('cross', (e) => e.object && e.from === 'inside-rail' && e.to === 'outside-rail' && ctx.afterCount('tile-lit', 7, e.time)),
    top_loses_one_object: (ctx) => ctx.match('leave-surface', (e) => e.surface === 'highest' && ctx.afterCount('stair-sound', 3, e.time)),
    duplicate_time_on_records: (ctx) => ctx.match('duplicate-value', (e) => e.key === 'time' && e.targets?.length >= 2 && ctx.after('paper-open', e.time)),
    identity_changes_after_stamp_lift: (ctx) => ctx.match('attribute-change', (e) => e.key === 'identity' && ctx.after('stamp-off-table', e.time)),
    preloop_footage_fullscreen: (ctx) => ctx.match('screen-content', (e) => e.beforeLoop && e.fullscreen && ctx.after('screen-on', e.time)),
    crack_crosses_two_materials: (ctx) => ctx.match('crack', (e) => e.materials?.length >= 2 && ctx.afterCount('vibration', 3, e.time)),
    outside_object_enters: (ctx) => ctx.match('cross', (e) => e.from === 'outside' && e.to === 'inside' && ctx.valueAt('crack-width', e.time) >= ctx.value('hand-width')),
    foreign_line_inside_wall: (ctx) => ctx.match('line-appears', (e) => e.area === 'north-inside' && e.origin !== 'wall' && ctx.after('lock-sound', e.time)),
    legacy_object_crosses_before_light: (ctx) => ctx.match('cross', (e) => e.fromRoom < 9 && e.to === 'threshold' && ctx.after('door-open', e.time) && ctx.before(e, 'door-light-cross')),
    small_handprint_covers_old: (ctx) => ctx.match('cover', (e) => e.target === 'old-handprint' && e.coverType === 'smaller-handprint' && ctx.after('last-bell', e.time)),
    three_carried_touch_ground: (ctx) => ctx.match('group-contact', (e) => e.count >= 3 && e.origin === 'carried' && e.surface === 'ground' && ctx.before(e, 'light-stable')),
    one_shadow_lost: (ctx) => ctx.match('quantity-change', (e) => e.kind === 'shadow' && e.delta === -1 && ctx.afterCount('switch-change', 2, e.time)),
    liquid_below_first_mark: (ctx) => ctx.match('attribute-change', (e) => e.key === 'liquid-level' && e.value === 'below-first-mark' && ctx.afterCount('cup-metal', 3, e.time)),
    camera_doll_count_plus_one: (ctx) => ctx.match('quantity-change', (e) => e.kind === 'figure-in-frame' && e.delta === 1 && ctx.after('camera-to-door', e.time)),
    outside_object_still_linked: (ctx) => ctx.match('linked-across', (e) => e.aArea === 'outside' && e.bArea === 'inside' && ctx.after('crack-stop', e.time))
  };

  class EventContext {
    constructor(engine, prophecy) {
      this.engine = engine;
      this.prophecy = prophecy;
      this.events = engine.events.filter((event) => event.time >= prophecy.announcedAt);
    }

    match(type, predicate = () => true) { return this.events.find((event) => event.type === type && predicate(event)); }
    all(type) { return this.events.filter((event) => event.type === type); }
    after(type, time) { return this.events.some((event) => event.type === type && event.time <= time); }
    before(event, type) { const boundary = this.events.find((entry) => entry.type === type); return !boundary || event.time <= boundary.time; }
    afterCount(type, count, time) { return this.events.filter((event) => event.type === type && event.time <= time).length >= count; }
    latestProjectile() { return [...this.events].reverse().find((event) => event.type === 'projectile-stop'); }
    clockAt(value, time) { return this.events.some((event) => event.type === 'clock-value' && event.value === value && Math.abs(event.time - time) <= 1); }
    value(key) { return this.engine.values.get(key); }
    valueAt(key) { return this.engine.values.get(key); }
  }

  class NarratorPlanner {
    constructor(engine) {
      this.engine = engine;
      this.lastPollAt = -999;
      this.pollInterval = 4;
      this.modelMode = 'fallback';
      this.model = null;
      this.busy = false;
      this.decisionLog = [];
    }

    async initialize() {
      try {
        if ('LanguageModel' in window && typeof window.LanguageModel?.create === 'function') {
          // Chrome's experimental API currently advertises only a small language set;
          // the prompts remain Chinese, but the capability probe must use a supported code.
          const availability = await window.LanguageModel.availability({ expectedInputs: [{ type: 'text', languages: ['en'] }], expectedOutputs: [{ type: 'text', languages: ['en'] }] });
          if (availability !== 'unavailable') {
            this.model = await window.LanguageModel.create({
              expectedInputs: [{ type: 'text', languages: ['en'] }],
              expectedOutputs: [{ type: 'text', languages: ['en'] }],
              initialPrompts: [{ role: 'system', content: '你只做候选排序。严格输出 WAIT 或候选ID，不得生成事实、台词或实现方法。目标是让女儿继续把解释权交给那双手。' }]
            });
            this.modelMode = 'browser-llm';
          }
        }
      } catch (error) {
        this.model = null;
        this.modelMode = 'fallback';
      }
      return this.modelMode;
    }

    async enableWebLLM(onProgress=()=>{}) {
      if(this.model)return this.modelMode;
      try{
        if(!navigator.gpu)throw new Error('WebGPU unavailable');
        const webllm=await import('https://esm.run/@mlc-ai/web-llm');
        const runtime=await webllm.CreateMLCEngine('Qwen2.5-0.5B-Instruct-q4f16_1-MLC',{initProgressCallback:(report)=>onProgress(`${Math.round((report.progress||0)*100)}% ${report.text||''}`)});
        this.model={prompt:async(prompt)=>{
          const response=await runtime.chat.completions.create({messages:[{role:'system',content:'你只做封闭候选选择。严格输出WAIT、REJECT或一个候选ID，不创造事实。'},{role:'user',content:prompt}],temperature:0,max_tokens:16});
          return response.choices?.[0]?.message?.content||'REJECT';
        }};
        this.modelMode='web-llm';
      }catch(error){this.model=null;this.modelMode='fallback';onProgress('加载失败');}
      return this.modelMode;
    }

    legalProphecies(room) {
      return DATA.prophecies.filter((prophecy) => prophecy.room === room && !this.engine.usedProphecies.has(prophecy.id));
    }

    heuristicScore(prophecy) {
      const state = this.engine.gameState();
      let score = 10;
      score += Math.max(0, 6 - state.activeProphecies.length * 4);
      score += state.timeInRoom > 8 ? 3 : -4;
      score += state.recentActions.includes('inspect') ? 2 : 0;
      score += state.inventoryTags.some((tag) => prophecy.objective.includes(tag)) ? -2 : 2;
      const signature = `${prophecy.id}|${state.recentActions.join(',')}|${state.inventoryTags.join(',')}|${state.fixedFacts.length}`;
      score += [...signature].reduce((sum,char)=>sum+char.charCodeAt(0),0) % 7 - 3;
      const roomCandidates=this.legalProphecies(state.room);
      const historySignature=`${state.recentActions.join('|')}|${state.inventoryTags.join('|')}|${state.fixedFacts.slice(-3).join('|')}`;
      const historyHash=[...historySignature].reduce((sum,char,index)=>sum+char.charCodeAt(0)*(index+1),0);
      if(roomCandidates.indexOf(prophecy)===historyHash%Math.max(1,roomCandidates.length))score+=9;
      return score;
    }

    async poll(now) {
      if (this.busy || now - this.lastPollAt < this.pollInterval) return null;
      this.lastPollAt = now;
      const state = this.engine.gameState();
      const candidates = this.legalProphecies(state.room);
      if (!candidates.length || state.activeProphecies.length >= 2 || state.inTutorial) return null;
      const actionSignature = [...`${state.recentActions.join('|')}|${state.inventoryTags.join('|')}`].reduce((sum,char)=>sum+char.charCodeAt(0),0);
      const decisionWindow = 4 + (actionSignature % 9);
      if (state.timeInRoom < decisionWindow) return null;
      this.busy = true;
      let choice = null;
      try {
        if (this.model) {
          const compact = candidates.map((item) => ({ id:item.id, text:item.text, objective:item.objective }));
          const prompt = `当前状态：${JSON.stringify({ room:state.room,timeInRoom:Math.round(state.timeInRoom),inventoryTags:state.inventoryTags,recentActions:state.recentActions,fixed:state.fixedFacts.slice(-8) })}\n候选：${JSON.stringify(compact)}\n判断现在说哪条最利于长期控制；若时机不好输出WAIT。只输出ID或WAIT。`;
          const answer = (await this.model.prompt(prompt)).trim();
          choice = candidates.find((item) => answer.includes(item.id)) || null;
          if (answer.includes('WAIT')) choice = null;
        } else {
          const ranked = candidates.map((item) => ({ item, score:this.heuristicScore(item) })).sort((a,b) => b.score-a.score);
          choice = ranked[0]?.score >= 10 ? ranked[0].item : null;
        }
      } catch (error) {
        choice = candidates.map((item) => ({ item, score:this.heuristicScore(item) })).sort((a,b) => b.score-a.score)[0]?.item || null;
      }
      this.decisionLog.push({ at:now, mode:this.modelMode, room:state.room, candidates:candidates.map((c) => c.id), choice:choice?.id || 'WAIT' });
      this.busy = false;
      return choice;
    }

    async interpretUtterance(text, candidates) {
      if (!this.model || !candidates.length) return null;
      const state = this.engine.gameState();
      try {
        const compact = candidates.map(({ id, label, kind, requirements })=>({ id,label,kind,requirements }));
        const prompt = `玩家原话：${JSON.stringify(text)}\n当前可执行候选：${JSON.stringify(compact)}\n当前状态：${JSON.stringify({room:state.room,inventoryTags:state.inventoryTags,recentActions:state.recentActions,fixedFacts:state.fixedFacts.slice(-10)})}\n只判断原话是否明确要求其中一个当前候选。若是，只输出唯一候选ID；若越权指定后续结果、含糊、或不在候选中，只输出REJECT。不得创造操作、事实或参数。`;
        const answer=(await this.model.prompt(prompt)).trim();
        if (/REJECT/i.test(answer)) return null;
        return candidates.find((candidate)=>answer.includes(candidate.id)) || null;
      } catch (error) {
        return null;
      }
    }

    async choosePast(poolId, candidates) {
      if (!candidates?.length) return null;
      const state = this.engine.gameState();
      if (this.model) {
        try {
          const prompt = `当前状态：${JSON.stringify({ room:state.room, fixed:state.fixedFacts.slice(-10), goals:DATA.goals.long.filter((g)=>g.room===state.room).map((g)=>g.label) })}\n需要从${poolId}选择过去：${JSON.stringify(candidates.map((c)=>({id:c.id,text:c.text,effects:c.effects})))}\n选最有利于控制且长期可用的一条。只输出ID。`;
          const answer = (await this.model.prompt(prompt)).trim();
          const picked = candidates.find((item) => answer.includes(item.id));
          if (picked) return picked;
        } catch (error) {}
      }
      return [...candidates].sort((a,b) => {
        const sa = Object.values(a.score || {}).reduce((sum,n)=>sum+n,0);
        const sb = Object.values(b.score || {}).reduce((sum,n)=>sum+n,0);
        return sb-sa;
      })[0];
    }
  }

  class RuleEngine {
    constructor(getGameState, hooks = {}) {
      this.getGameState = getGameState;
      this.hooks = hooks;
      this.graph = new FactGraph();
      this.events = [];
      this.values = new Map([['hand-width', 58]]);
      this.fixed = new Map();
      this.usedProphecies = new Set();
      this.activeProphecies = [];
      this.resolvedProphecies = [];
      this.planner = new NarratorPlanner(this);
      this.serial = 0;
    }

    gameState() { return this.getGameState(); }

    async initialize() { return this.planner.initialize(); }

    record(type, data = {}) {
      const event = { id:`event_${++this.serial}`, type, time:this.gameState().time, ...data };
      this.events.push(event);
      this.evaluateProphecies(event);
      return event;
    }

    setValue(key, value) { this.values.set(key, value); }
    getValue(key) { return this.values.get(key); }

    isCompatible(key, value) {
      return !this.fixed.has(key) || this.fixed.get(key).value === value;
    }

    legalPastCandidates(poolId) {
      return (DATA.pastPools[poolId] || []).filter((past) =>
        Object.entries(past.effects || {}).every(([key, value]) => this.isCompatible(key, value))
      );
    }

    async declare({ key, value, label, successPool, failurePool, sourceObject }) {
      const now = this.gameState().time;
      const successCandidates = this.legalPastCandidates(successPool);
      const compatible = this.isCompatible(key, value) && successCandidates.length > 0;
      const actualValue = compatible ? value : this.fixed.has(key) ? this.fixed.get(key).value : typeof value === 'boolean' ? !value : null;
      const poolId = compatible ? successPool : failurePool;
      const candidates = compatible ? successCandidates : this.legalPastCandidates(poolId);
      const past = await this.planner.choosePast(poolId, candidates);

      this.hooks.onCollapseStart?.({ compatible, label });
      const nowNode = this.graph.addNode({ id:`now:${key}`, label:`${label}：${actualValue === true ? '是' : actualValue === false ? '否' : actualValue}`, kind:'now', fixedAt:now });
      if (!this.fixed.has(key)) this.fixed.set(key, { value:actualValue, at:now, source:'declaration' });

      let pastNode = null;
      if (past) {
        pastNode = this.graph.addNode({ id:`past:${past.id}`, label:past.text, kind:'past', fixedAt:now });
        this.graph.addEdge({ from:pastNode.id, to:nowNode.id, relation:'supports' });
        Object.entries(past.effects || {}).forEach(([effectKey, effectValue]) => {
          const effectId = `effect:${past.id}:${effectKey}`;
          if (!this.fixed.has(effectKey)) this.fixed.set(effectKey, { value:effectValue, at:now, source:past.id, inferred:true });
          this.graph.addNode({ id:effectId, label:`${effectKey} = ${String(effectValue)}`, kind:'inferred', fixedAt:now });
          this.graph.addEdge({ from:pastNode.id, to:effectId, relation:'implies', inferred:true });
        });
        this.hooks.onPastFixed?.({ past, compatible, label, actualValue });
      }
      this.record('collapse', { key, requested:value, actual:actualValue, compatible, pastId:past?.id, sourceObject });
      return { compatible, actualValue, past };
    }

    announce(prophecy) {
      const now = this.gameState().time;
      const active = { ...prophecy, announcedAt:now, dueAt:now + prophecy.delay, status:'active', evidence:[] };
      this.activeProphecies.push(active);
      this.usedProphecies.add(prophecy.id);
      this.graph.addNode({ id:`future:${prophecy.id}`, label:prophecy.text, kind:'future', fixedAt:now, dueAt:active.dueAt });
      this.hooks.onProphecy?.(active);
      this.record('prophecy-announced', { prophecyId:prophecy.id });
      return active;
    }

    evaluateProphecies(triggerEvent) {
      for (const prophecy of [...this.activeProphecies]) {
        const check = PROPHECY_CHECKS[prophecy.predicate];
        if (!check) continue;
        const result = check(new EventContext(this, prophecy));
        if (result) {
          prophecy.status = 'fulfilled';
          prophecy.fulfilledAt = this.gameState().time;
          prophecy.evidence = Array.isArray(result) ? result.map((e)=>e.id) : result.id ? [result.id] : [triggerEvent.id];
          this.activeProphecies = this.activeProphecies.filter((entry) => entry.id !== prophecy.id);
          this.resolvedProphecies.push(prophecy);
          const outcome = this.graph.addNode({ id:`fulfilled:${prophecy.id}`, label:`兑现：${prophecy.text}`, kind:'now', fixedAt:prophecy.fulfilledAt });
          this.graph.addEdge({ from:`future:${prophecy.id}`, to:outcome.id, relation:'fulfilled-by' });
          this.hooks.onProphecyFulfilled?.(prophecy);
        }
      }
    }

    async update() {
      const now = this.gameState().time;
      const choice = await this.planner.poll(now);
      if (choice) this.announce(choice);
      for (const prophecy of this.activeProphecies) {
        if (now >= prophecy.dueAt - 6 && !prophecy.pressureApplied) {
          prophecy.pressureApplied = true;
          this.hooks.onProphecyPressure?.(prophecy);
        }
      }
    }

    audit() {
      const errors = [];
      for (const prophecy of DATA.prophecies) if (!PROPHECY_CHECKS[prophecy.predicate]) errors.push(`Missing predicate: ${prophecy.id}`);
      for (const edge of this.graph.edges) {
        if (!this.graph.nodes.has(edge.from)) errors.push(`Missing edge source: ${edge.from}`);
        if (!this.graph.nodes.has(edge.to)) errors.push(`Missing edge target: ${edge.to}`);
      }
      return errors;
    }
  }

  window.NARRATOR_RULES = { RuleEngine, FactGraph, PROPHECY_CHECKS };
}());
