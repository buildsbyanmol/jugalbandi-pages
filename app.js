import config from './site-config.js';
import { harnessLogo } from './logos.js';
import { petContents, hydratePets } from './pets.js';
import { detectPlatform, googleFormUrls, registrationReady, registerBeta } from './services.js';
import { mountWorkspace } from './workspace.js';

const $ = (selector, parent = document) => parent.querySelector(selector);
const $$ = (selector, parent = document) => [...parent.querySelectorAll(selector)];

mountWorkspace($('#workspace-mount'));
hydratePets();

// The hero plays once when visible. Copy stays readable in every frame.
const hero = $('[data-scene="hero"]');
const pauseButton = $('#hero-pause');
const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
const motionToggle = $('#reduce-motion');
motionToggle.checked = motion.matches;
const reduceMotion = () => motion.matches || motionToggle.checked;
let elapsed = 0;
let paused = false;
let visible = false;
let lastTick = performance.now();
const heroAgents = {
  'claude-planner': {role:'Planner', harness:'Claude Code', symbol:'agent-a'},
  'claude-writer': {role:'Writer', harness:'Claude Code', symbol:'agent-b'},
  'claude-reviewer': {role:'Reviewer', harness:'Claude Code', symbol:'agent-d'},
  'codex-builder': {role:'Builder', harness:'Codex', symbol:'agent-c'},
  'codex-reviewer': {role:'Reviewer', harness:'Codex', symbol:'agent-b'},
  'codex-tester': {role:'Tester', harness:'Codex', symbol:'agent-a'},
  'cursor-designer': {role:'Designer', harness:'Cursor', symbol:'agent-d'},
  'cursor-builder': {role:'Builder', harness:'Cursor', symbol:'agent-a'},
  'cursor-tester': {role:'Tester', harness:'Cursor', symbol:'agent-c'},
};
let heroPair = ['claude-planner', 'codex-reviewer'];
function showHeroBeat() {
  const step = Number(hero.dataset.step);
  const from = heroAgents[heroPair[0]], to = heroAgents[heroPair[1]];
  const beats = [
    ['API done. Tests are still failing.', `${from.role} · ${from.harness}`],
    ['Decisions, changes, and dead ends.', 'Context packet prepared'],
    ["Got it. I'll pick up the failing test.", `${to.role} · ${to.harness}`],
    ['The work continues, with its history.', 'Context handed over ✓'],
  ];
  $('#hero-exchange-copy').textContent = beats[step][0];
  $('#hero-exchange-state').textContent = beats[step][1];
}
function renderHeroPair() {
  ['from','to'].forEach((position,index) => {
    const agent = heroAgents[heroPair[index]];
    const element = $(`#hero-agent-${position}`);
    $('svg',element).innerHTML = petContents(agent.symbol);
    $('strong',element).textContent = agent.role;
    $('span',element).innerHTML = `${harnessLogo(agent.harness)}from ${agent.harness}`;
  });
  $$('[data-agent]').forEach(button => {
    const active = heroPair.includes(button.dataset.agent);
    button.classList.toggle('is-active',active);
    button.setAttribute('aria-pressed',String(active));
  });
  showHeroBeat();
}
function replayHero() {
  elapsed = 0; paused = false;
  hero.dataset.step = reduceMotion() ? '3' : '0';
  hero.classList.remove('is-paused');
  pauseButton.textContent = 'Ⅱ';
  pauseButton.setAttribute('aria-pressed','false');
  updateMotion();
  showHeroBeat();
}
$$('[data-agent]').forEach(button => button.addEventListener('click', () => {
  if (!heroPair.includes(button.dataset.agent)) heroPair = [heroPair[1],button.dataset.agent];
  renderHeroPair();
  replayHero();
  const from = heroAgents[heroPair[0]], to = heroAgents[heroPair[1]];
  $('#hero-pair-status').textContent = `${from.role} from ${from.harness} and ${to.role} from ${to.harness} are shown in the shared workspace. Illustrative only.`;
}));
$('#pass-context').addEventListener('click', () => {
  replayHero();
  $('#hero-pair-status').textContent = 'Illustrative handoff replayed. No agents run and no files are changed.';
});
function updateMotion() {
  document.documentElement.dataset.motion = reduceMotion() ? 'reduced' : 'full';
  if (reduceMotion()) {
    hero.dataset.step = '3';
    showHeroBeat();
    pauseButton.disabled = true;
    pauseButton.setAttribute('aria-label', 'Animation disabled by reduced-motion preference');
  } else {
    pauseButton.disabled = false;
    pauseButton.setAttribute('aria-label', paused ? 'Resume handoff animation' : 'Pause handoff animation');
  }
}
renderHeroPair();
updateMotion();
motion.addEventListener('change', () => { motionToggle.checked = motion.matches; updateMotion(); });
motionToggle.addEventListener('change', updateMotion);
new IntersectionObserver(([entry]) => {
  visible = entry.isIntersecting;
  hero.classList.toggle('is-offscreen', !visible);
}, { threshold: 0.15 }).observe(hero);
const heroTimer = setInterval(() => {
  const now = performance.now();
  const delta = now - lastTick;
  lastTick = now;
  if (reduceMotion() || paused || !visible || document.hidden || elapsed >= 10400) return;
  elapsed = Math.min(10400, elapsed + Math.min(delta, 250));
  hero.dataset.step = String(Math.min(3, Math.floor(elapsed / 2600)));
  showHeroBeat();
}, 160);
window.addEventListener('pagehide', () => clearInterval(heroTimer), { once: true });
pauseButton.addEventListener('click', () => {
  paused = !paused;
  hero.classList.toggle('is-paused', paused);
  pauseButton.textContent = paused ? '▷' : 'Ⅱ';
  pauseButton.setAttribute('aria-pressed', String(paused));
  updateMotion();
});
$('#hero-replay').addEventListener('click', replayHero);
renderHeroPair();

$('#resolve-context').addEventListener('click', (event) => {
  const scene = $('#problem-demo');
  const resolved = scene.classList.toggle('is-resolved');
  $('.resolved-packet', scene).hidden = !resolved;
  $('#context-result').textContent = resolved ? 'Illustrative handoff prepared. The work can continue.' : '';
  event.currentTarget.textContent = resolved ? 'Replay the scene ↻' : 'Bring Jugalbandi in ↗';
});

const exchanges = {
  handoff: ['API done. Tests are still failing.', "समझ गया! I'll pick it up from here.", 'Work recorded', 'Pick up the tests', 'Context packet', 'The relevant notes travel with the work.'],
  review: ['The API change is ready for review.', "I'll check it against the existing contract.", 'Author · API', 'Reviewer · read only', 'Review request', 'A second view, scoped to the same change.'],
  collaborate: ["I'll handle the API.", "I'll review the integration.", 'Owner · API', 'Owner · integration', 'API contract v1', 'Different owners. An explicit shared contract.'],
};
const tabs = $$('[data-exchange]');
function selectExchange(tab, focus = false) {
  tabs.forEach((item) => {
    const selected = item === tab;
    item.setAttribute('aria-selected', String(selected));
    item.tabIndex = selected ? 0 : -1;
  });
  const [claude, codex, taskA, taskB, contract, caption] = exchanges[tab.dataset.exchange];
  $('#exchange-claude').textContent = claude;
  const codexBubble = $('#exchange-codex');
  codexBubble.replaceChildren();
  if (tab.dataset.exchange === 'handoff') {
    const hindi = document.createElement('span');
    hindi.lang = 'hi'; hindi.textContent = 'समझ गया!';
    codexBubble.append(hindi, " I'll pick it up from here.");
  } else codexBubble.textContent = codex;
  $('#task-claude').textContent = taskA;
  $('#task-codex').textContent = taskB;
  $('#exchange-contract').textContent = contract;
  $('#exchange-caption').textContent = caption;
  $('#exchange-panel').setAttribute('aria-labelledby', tab.id);
  if (focus) tab.focus();
}
tabs.forEach((tab, index) => {
  tab.addEventListener('click', () => selectExchange(tab));
  tab.addEventListener('keydown', (event) => {
    const target = event.key === 'ArrowRight' ? (index + 1) % tabs.length : event.key === 'ArrowLeft' ? (index + tabs.length - 1) % tabs.length : event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : null;
    if (target !== null) { event.preventDefault(); selectExchange(tabs[target], true); }
  });
});

$$('[data-decision]').forEach((button) => button.addEventListener('click', () => {
  $('#decision-result').textContent = button.dataset.decision === 'keep' ? 'Existing contract kept. The agents adapt their work.' : 'Change approved in this demo. The contract owners can update the integration.';
  $$('.decision-options button').forEach((item) => { item.disabled = true; });
  $('#decision-reset').hidden = false;
  $('#decision-reset').focus();
}));
$('#decision-reset').addEventListener('click', () => {
  $('#decision-result').textContent = '';
  $$('.decision-options button').forEach((item) => { item.disabled = false; });
  $('#decision-reset').hidden = true;
  $('[data-decision="keep"]').focus();
});

$('#accept-close').addEventListener('click', () => {
  $('.close-vignette').classList.add('is-accepted');
  $('#close-state').textContent = 'Accepted in this demo';
  $('#close-result').textContent = 'The draft is ready for the next session. Tests are still pending.';
  $('#accept-close').hidden = true;
  $('#close-reset').hidden = false;
  $('#close-reset').focus();
});
$('#close-reset').addEventListener('click', () => {
  $('.close-vignette').classList.remove('is-accepted');
  $('#close-state').textContent = 'Draft for your review';
  $('#close-result').textContent = '';
  $('#accept-close').hidden = false;
  $('#close-reset').hidden = true;
  $('#accept-close').focus();
});

const architecture = {
  log: ['The record', 'A little history. A lot less repeating.', "A local record of what happened, so the next agent doesn't have to rediscover everything.", ['14:32 · Claude · file modified', '14:34 · Claude · test failed', '14:36 · JB · handoff prepared'], 'Illustrative events. Hooks redact → spool → daemon → JSONL log. The log is the source for the rebuildable index.'],
  index: ['The catalogue', 'Rebuilt from the record.', 'SQLite indexes the append-only log for lookup. The index can be removed and rebuilt from the files you own.', ['JSONL event log → SQLite index', 'Recorded events → state projections'], 'A derived index, rather than another private memory silo.'],
  handoff: ['The continuation', 'The right notes for the next agent.', 'The builder selects a recorded window, project/git state, and session cursor to assemble a relevant packet. Failed approaches travel with it.', ['Event log + project/git state + cursor', 'Selected context → supported delivery → harness'], 'A new session gets context since the last accepted close. A resumed session gets the relevant delta.'],
  bridge: ['The exchange', 'A bridge for capable agents.', 'Typed messages, replies to exact claims, task and file ownership, reviews, and contracts connect work across harnesses.', ['Agent → stdio MCP → agent socket', 'Typed operations → recorded coordination'], 'Planned collaboration. The bridge enforces budgets, provenance, and human decision rights.'],
  rules: ['The boundaries', 'Your rules, close to the work.', 'Rules compile into the available harness-native controls, local gate hooks, and git guards. A gate evaluates locally even if the daemon is down.', ['Rule source → native rules + local gates', 'Local check → allow, deny, or human decision'], 'Coverage varies by mechanism. Jugalbandi never answers a native permission prompt or bypasses harness trust.'],
  adapters: ['The connections', 'Official seams. Existing tools.', 'Hooks observe supported events. MCP provides structured tools. Codex uses supported app-server interfaces where a version probe proves the capability.', ['Hooks → redact → local spool → daemon', 'MCP requests ↔ structured operations'], 'Compatibility must be verified for the installed harness version. No vendor login tokens are reused.'],
  daemon: ['The local core', 'One writer, an independent record.', 'An on-demand local service ingests events and writes the log and its projections. Agents ask for operations through supported adapters.', ['Agent socket · human socket', 'One daemon → log + derived state'], 'Planned local product. Unix sockets, no TCP listener. Human-only operations stay off the agent surface.'],
  human: ['The final say', 'AI works. You make the calls.', 'Scope changes, breaking contracts, and irreversible actions come to you. A decision brief shows the options and evidence, then previews the exact record.', ['Question + options + evidence', 'Human acceptance → recorded decision'], 'Silence never decides. The website demonstrations do not grant real permissions.'],
  surfaces: ['The controls', 'CLI first. Workspace next.', 'The first planned release centres on hooks, handoff, and the jb CLI. A Tauri desktop workspace follows the handoff validation gate.', ['CLI → human socket → daemon', 'Planned Tauri workspace → human socket'], 'The workspace mock above shows the intended UX using sample data. It is not a released desktop app.'],
  harnesses: ['The instruments', 'The tools you already use.', 'Official Claude Code and Codex keep execution, tools, safety, permissions, and sandboxes. Jugalbandi connects the work around them.', ['Claude Code · official binary', 'Codex · official binary'], 'Their private memory remains their own. The independent project record contains supported observations and recorded work.'],
};
$$('[data-node]').forEach((button) => button.addEventListener('click', () => {
  const key = button.dataset.node;
  $$('[data-node]').forEach((item) => {
    const selected = item.dataset.node === key;
    item.classList.toggle('is-selected', selected);
    item.setAttribute('aria-pressed', String(selected));
  });
  $('#architecture-map').dataset.focus = key;
  const [label, title, body, samples, note] = architecture[key];
  $('#arch-detail-label').textContent = label;
  $('#arch-detail-title').textContent = title;
  $('#arch-detail-body').textContent = body;
  $('#arch-detail-note').textContent = note;
  $('#arch-detail-sample').replaceChildren(...samples.map((sample) => {
    const p = document.createElement('p'); p.textContent = sample; return p;
  }));
}));

const progressLinks = $$('.story-progress a');
const progressObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    progressLinks.forEach((link) => {
      if (link.hash === `#${entry.target.id}`) link.setAttribute('aria-current', 'step');
      else link.removeAttribute('aria-current');
    });
  });
}, { rootMargin: '-15% 0px -45% 0px', threshold: 0 });
progressLinks.forEach((link) => progressObserver.observe($(link.hash)));

// Google owns submission confirmation. A frame load never means a response was saved.
const dialog = $('#availability-dialog');
const platform = $('#platform');
const ready = registrationReady(config.registration);
const nativeForm = googleFormUrls(config.registration);
const apiReady = ready && !nativeForm;
platform.value = detectPlatform(navigator.userAgent);
$('#platform-message').textContent = ready ? 'Launching soon. Join the beta for launch updates.' : 'Launching soon. Beta signup opens soon.';
if (nativeForm) {
  dialog.classList.add('has-google-form');
  $('#legacy-registration').hidden = true;
  $('#google-form-panel').hidden = false;
  $('#google-form-link').href = nativeForm.responderUrl;
  $$('.availability-note').forEach(note => {
    if (note.textContent.includes('Beta signup opens soon')) note.textContent = 'Launching soon · Join the beta for launch updates';
  });
}
function openBetaRegistration() {
  if (nativeForm && !$('#google-beta-form')) {
    const frame = document.createElement('iframe');
    frame.id = 'google-beta-form';
    frame.title = 'Jugalbandi beta registration on Google Forms';
    frame.src = nativeForm.embedUrl;
    frame.referrerPolicy = 'no-referrer';
    frame.addEventListener('error', () => {
      $('.google-form-help').textContent = 'The form could not be displayed. Open the signup form in a new tab using the link above.';
    });
    $('#google-form-mount').append(frame);
  }
  dialog.showModal();
}
$$('[data-beta]').forEach((button) => button.addEventListener('click', openBetaRegistration));
$('.dialog-close').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', (event) => { if (event.target === dialog && (event.clientX < dialog.getBoundingClientRect().left || event.clientX > dialog.getBoundingClientRect().right || event.clientY < dialog.getBoundingClientRect().top || event.clientY > dialog.getBoundingClientRect().bottom)) dialog.close(); });
$('#notify-submit').disabled = !apiReady;
$('#email').disabled = !apiReady;
if (apiReady) {
  $('#signup-note').replaceChildren('Only for beta access and launch updates. ');
  const privacyLink = document.createElement('a');
  privacyLink.href = config.registration.privacyUrl; privacyLink.textContent = 'How we use your email';
  $('#signup-note').append(privacyLink);
}
$('#notify-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const email = $('#email');
  if (!apiReady) { $('#signup-status').textContent = 'Beta signup opens soon. No email has been saved.'; return; }
  if (!email.checkValidity()) {
    email.setAttribute('aria-invalid', 'true');
    $('#signup-status').textContent = 'Enter a valid email address.';
    email.focus(); return;
  }
  email.removeAttribute('aria-invalid');
  $('#notify-submit').disabled = true;
  $('#notify-submit').textContent = 'Saving…';
  $('#notify-form').setAttribute('aria-busy', 'true');
  const result = await registerBeta({ email: email.value, platform: platform.value }, config.registration);
  $('#notify-form').removeAttribute('aria-busy');
  $('#notify-submit').textContent = 'Join the beta →';
  $('#notify-submit').disabled = false;
  if (result.status === 'saved') {
    const hindi = document.createElement('span'); hindi.lang = 'hi'; hindi.textContent = 'आपकी जगह पक्की! ✓';
    $('#signup-status').replaceChildren(hindi, " You're on the beta list. We'll email you when it's ready.");
    $('#notify-submit').disabled = true;
  } else if (result.status === 'invalid') {
    $('#signup-status').textContent = 'Enter a valid email address.';
    email.setAttribute('aria-invalid', 'true'); email.focus();
  } else $('#signup-status').textContent = "We couldn't save your email. Please try again.";
});
