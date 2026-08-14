const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const context = vm.createContext({ window: {}, console, setTimeout, clearTimeout });
for (const file of ['world-data.js', 'rule-engine.js']) {
  vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context, { filename: file });
}

const DATA = context.window.WORLD_DATA;
const { RuleEngine } = context.window.NARRATOR_RULES;

const fixtures = {
  line_cross_center: [['bell'], ['bell'], ['bell'], ['cross', { objectTags:['line'], line:'center' }]],
  bell_rings_off_hook: [['sound', { objectTags:['sound'], objectLocation:'hand' }]],
  tablet_leaves_plate: [['leave-surface', { objectTags:['medicine'], surface:'plate' }]],
  round_mark_on_blanket: [['light-cycle'], ['mark', { shape:'round', targetTags:['fabric'] }]],
  doorframe_in_mirror: [['missing-note'], ['reflection', { subject:'doorframe' }]],
  light_on_doll_face: [['clock-value', { value:'eight' }], ['light-hit', { targetTags:['figure'], part:'face' }]],
  water_cross_blue_line: [['tick'], ['tick'], ['tick'], ['tick'], ['cross', { material:'water', line:'blue' }]],
  bucket_water_decreases: [['quantity-change', { objectTags:['container'], material:'water', delta:-1 }]],
  projectile_cross_red_height: [['projectile-cross', { fromChamber:true, line:'red-height' }]],
  spent_round_on_tray: [['land', { projectile:true, leftMagazine:true, targetTags:['bridge'] }]],
  last_projectile_stops_before_north: [['projectile-stop', { stoppedBefore:'north' }]],
  strip_color_on_camera: [['door-shadow'], ['door-shadow'], ['camera-capture', { subjectTags:['test'], attribute:'color' }]],
  name_beside_red_mark: [['paper-flip'], ['adjacent', { aType:'name', bType:'red-mark' }]],
  outside_hears_room_audio: [['line-connected'], ['audio-transfer', { from:'room', to:'outside' }]],
  two_objects_swap_height: [['height-swap', { nonAdjacent:true }]],
  object_falls_outside_rail: [...Array.from({length:7}, () => ['tile-lit']), ['cross', { object:'fragment', from:'inside-rail', to:'outside-rail' }]],
  top_loses_one_object: [['stair-sound'], ['stair-sound'], ['stair-sound'], ['leave-surface', { surface:'highest' }]],
  duplicate_time_on_records: [['paper-open'], ['duplicate-value', { key:'time', targets:['a','b'] }]],
  identity_changes_after_stamp_lift: [['stamp-off-table'], ['attribute-change', { key:'identity', value:'outside-observer' }]],
  preloop_footage_fullscreen: [['screen-on'], ['screen-content', { beforeLoop:true, fullscreen:true }]],
  crack_crosses_two_materials: [['vibration'], ['vibration'], ['vibration'], ['crack', { materials:['wall','rail'] }]],
  outside_object_enters: [['set-value', { key:'crack-width', value:60 }], ['cross', { from:'outside', to:'inside' }]],
  foreign_line_inside_wall: [['lock-sound'], ['line-appears', { area:'north-inside', origin:'rail-shadow' }]],
  legacy_object_crosses_before_light: [['door-open'], ['cross', { fromRoom:4, to:'threshold' }]],
  small_handprint_covers_old: [['last-bell'], ['cover', { target:'old-handprint', coverType:'smaller-handprint' }]],
  three_carried_touch_ground: [['group-contact', { count:3, origin:'carried', surface:'ground' }]],
  one_shadow_lost: [['switch-change'], ['switch-change'], ['quantity-change', { kind:'shadow', delta:-1 }]],
  liquid_below_first_mark: [['cup-metal'], ['cup-metal'], ['cup-metal'], ['attribute-change', { key:'liquid-level', value:'below-first-mark' }]],
  camera_doll_count_plus_one: [['camera-to-door'], ['quantity-change', { kind:'figure-in-frame', delta:1 }]],
  outside_object_still_linked: [['crack-stop'], ['linked-across', { aArea:'outside', bArea:'inside' }]]
};

function makeEngine(room = 0) {
  const state = { time:0, room, timeInRoom:10, activeProphecies:[], recentActions:[], inventoryTags:[], fixedFacts:[], inTutorial:false };
  const engine = new RuleEngine(() => ({ ...state, activeProphecies:engine.activeProphecies }), {});
  return { engine, state };
}

async function main() {
  assert(DATA.objects.length >= 300, 'at least 300 objects');
  assert(DATA.attributes.length >= 5000, 'at least 5000 attributes');
  assert(DATA.endings.length >= 20, 'at least 20 endings');
  assert.strictEqual(DATA.prophecies.length, 30, 'exactly 30 authored prophecies');
  assert.strictEqual(DATA.insightChains.length, 30, '30 authored compression chains');
  assert.strictEqual(DATA.level8Arcs.length, 12, '12 distinct layer-8 story arcs');
  assert.strictEqual(DATA.routeScenes.length, 120, '12 arcs x 10 layer-7 rooms');
  assert.strictEqual(new Set(DATA.routeScenes.map((scene)=>scene.plot)).size, 120, 'all 120 scene plots differ');
  assert(DATA.level8Arcs.every((arc)=>arc.beats.length===10), 'every story arc has ten authored room beats');
  assert(DATA.routeScenes.every((scene)=>DATA.objects.some((object)=>object.id===scene.shiftedObjectId)), 'every route scene shifts a real object');
  assert(DATA.routeScenes.every((scene)=>DATA.objects.some((object)=>object.id===scene.missingFragment)), 'every route scene removes a real fragment');
  assert(DATA.objects.every((o) => o.id && o.name && o.tags.length && Number.isFinite(o.x) && Number.isFinite(o.y)), 'every object is interactable and placed');

  for (const prophecy of DATA.prophecies) {
    assert(!/[你我]|害怕|决定|想要|伤害自己/.test(prophecy.text), `${prophecy.id} must be objective`);
    assert(fixtures[prophecy.predicate], `fixture missing for ${prophecy.predicate}`);
    const { engine, state } = makeEngine(prophecy.room);
    engine.announce(prophecy);
    assert.strictEqual(engine.resolvedProphecies.length, 0, `${prophecy.id} must not resolve without evidence`);
    for (const [type, data = {}] of fixtures[prophecy.predicate]) {
      state.time += 0.1;
      if (type === 'set-value') engine.setValue(data.key, data.value);
      else engine.record(type, data);
    }
    assert.strictEqual(engine.resolvedProphecies[0]?.id, prophecy.id, `${prophecy.id} must resolve from its event evidence`);
    assert(engine.resolvedProphecies[0].evidence.length > 0, `${prophecy.id} must retain evidence ids`);
  }

  {
    const { engine } = makeEngine(4);
    engine.fixed.set('gunArrivedLoaded', { value:false, at:0, source:'test' });
    const result = await engine.declare({ key:'gun.rounds', value:true, label:'枪中有弹', successPool:'rounds_loaded', failurePool:'rounds_empty' });
    assert(result.compatible, 'a different legal loaded history should remain available');
    assert.notStrictEqual(result.past.id, 'past_round_arrival', 'contradictory past must be filtered out');
  }

  {
    const { engine } = makeEngine(0);
    engine.fixed.set('lineIntact', { value:false, at:0, source:'test' });
    engine.fixed.set('motherTouchedLine', { value:false, at:0, source:'test' });
    const result = await engine.declare({ key:'red_line.intact', value:true, label:'红线完整', successPool:'line_intact', failurePool:'line_broken' });
    assert.strictEqual(result.compatible, false, 'declaration fails once every supporting past is cut off');
    assert.strictEqual(result.actualValue, false, 'failed binary declaration fixes the opposite result');
  }

  {
    const choices=new Set();
    for(const actions of [['inspect'],['take','sound'],['fire','move'],['mark','drop','inspect'],['toggle','pour']]){
      const {engine,state}=makeEngine(4);
      state.timeInRoom=30;state.recentActions=actions;
      const choice=await engine.planner.poll(100);
      if(choice)choices.add(choice.id);
    }
    assert(choices.size>1,`different player histories must alter prophecy choice, got ${[...choices]}`);
    const {engine,state}=makeEngine(4);state.timeInRoom=0;
    assert.strictEqual(await engine.planner.poll(100),null,'planner must be able to wait when timing is poor');
  }

  console.log(`PASS: ${DATA.prophecies.length} prophecies, ${DATA.objects.length} objects, ${DATA.attributes.length} attributes, ${DATA.endings.length} endings`);
}

main().catch((error) => {
  console.error(error.stack || error);
  process.exitCode = 1;
});
