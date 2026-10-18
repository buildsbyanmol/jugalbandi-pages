import { harnessLogo } from './logos.js';
import { petContents } from './pets.js';
/** Scripted workspace preview. Fictional project, sample data, no model or payment connection. */
const EXAMPLE_PROMPT = 'Make invoice.paid retries idempotent by provider event ID. Keep the current receipt schema, preserve retryable failures, and never log customer emails.';
const DECISION_RECORD = '2026-10-18 | invoice.paid retries | Approve a persistent unique constraint on (provider, event_id). Keep the current receipt schema and retryable failures. Never log customer emails. | Human accepted (scripted sample)';
const AGENTS = {
  claude: { handle: 'claude-be', harness: 'Claude Code', task: 'Webhook implementation', branch: 'sample/webhook-idempotency', file: 'billing/webhooks.ts' },
  codex: { handle: 'codex-review', harness: 'Codex', task: 'Concurrency review', branch: 'sample/retry-review', file: 'billing/webhooks.test.ts' },
};
const STEPS = [
  {
    id: '101', actor: 'human', kind: 'Request', title: 'One invoice. Three deliveries.',
    text: EXAMPLE_PROMPT,
    note: 'Fictional membership app. The provider retries invoice.paid three times; the current handler applies the upgrade twice.',
    file: 'billing/webhooks.ts',
    code: '// Before · illustrative handler\nif (await events.find(event.id)) return existingReceipt;\nconst receipt = await upgradeMembership(invoice);\nawait events.save(event.id);\nreturn receipt;\n\n// Lookup and upgrade are separate. Concurrent deliveries can race.',
  },
  {
    id: '102', actor: 'claude', kind: 'Plan', title: 'Keep the contract. Track the event.',
    text: "I'll check the provider event ID before upgrading, then keep the event record and upgrade in a transaction. Completed retries should return the same receipt; failed work must remain retryable.",
    note: 'A proposal, not an applied change. A durable event-ID constraint still needs your decision.',
    file: 'billing/webhooks.ts',
    code: '// Initial proposal · not applied\nconst existing = await events.find(provider, event.id);\nif (existing) return existing.receipt;\n\nreturn db.transaction(async tx => {\n  const receipt = await upgradeMembership(tx, invoice);\n  await tx.events.save(provider, event.id, receipt);\n  return receipt;\n});',
  },
  {
    id: '103', actor: 'codex', kind: 'Review finding', title: 'The lookup can still race.',
    text: 'Two concurrent deliveries can both pass the first lookup. Put a unique event-ID insert inside the same transaction as the membership upgrade. A failed transaction must roll back the event record too.',
    note: 'Scoped review of the sample plan. The existing receipt shape must stay unchanged.',
    file: 'billing/webhooks.test.ts',
    code: '// Race reproduced in the scripted fixture\nawait Promise.all([\n  deliver("invoice.paid", "evt_sample_17"),\n  deliver("invoice.paid", "evt_sample_17"),\n]);\n\nexpect(membership.upgradeCount).toBe(1);',
  },
  {
    id: '104', actor: 'codex', kind: 'Failing check', title: 'A regression we can see.',
    text: 'The concurrent-delivery example fails before the fix: expected one membership upgrade, received two. Three sequential deliveries must also return the same receipt.',
    note: 'Scripted failing output. This page did not execute a test or process a payment.',
    file: 'billing/webhooks.test.ts',
    code: '$ test billing/webhooks.test.ts  [SCRIPTED OUTPUT]\n\nFAIL concurrent invoice.paid deliveries\n  expected upgradeCount: 1\n  received upgradeCount: 2\n\nFixture: evt_sample_17 · no customer data',
  },
  {
    id: '105', actor: 'jb', kind: 'Needs your decision', title: 'One durable change needs you.',
    text: 'The fix adds a persistent unique constraint on (provider, event_id). Review that change before the sample continues. The receipt contract stays as it is.',
    note: 'Human decision in this demo only. Native harness permission prompts remain separate.',
    file: 'billing/schema.sql',
    code: '-- Proposed migration · not applied\nCREATE UNIQUE INDEX provider_event_once\nON provider_events (provider, event_id);\n\n-- Keep the insert, upgrade and receipt write atomic.\n-- Roll back all three when processing fails.',
  },
  {
    id: '106', actor: 'claude', kind: 'Code change', title: 'Claim the event inside the transaction.',
    text: 'The sample now inserts the unique provider event ID inside the transaction, then applies the upgrade and stores the receipt. A duplicate returns the stored receipt. Failure rolls back the event claim, so a retry can try again.',
    note: 'Illustrative TypeScript. The sample approval did not create an index or write a file.',
    file: 'billing/webhooks.ts',
    code: '// After · illustrative transaction\nreturn db.transaction(async tx => {\n  const claimed = await tx.events\n    .insert({ provider, eventId: event.id })\n    .onConflictDoNothing().returning();\n\n  if (!claimed.length)\n    return tx.receipts.forEvent(provider, event.id);\n\n  const receipt = await upgradeMembership(tx, invoice);\n  await tx.receipts.save(provider, event.id, receipt);\n  return receipt; // existing receipt shape\n}); // failure rolls back claim + upgrade + receipt\n// Never log the event payload or customer email.',
  },
  {
    id: '107', actor: 'codex', kind: 'Sample checks pass', title: 'Retries, races, and rollback.',
    text: 'The scripted rerun passes the sequential retry, concurrent delivery, rollback-and-retry, receipt-schema, and email-log assertions. One event produces one upgrade in the fixture.',
    note: 'Passing results belong only to this scripted fixture. No real test command ran.',
    file: 'billing/webhooks.test.ts',
    code: '$ test billing/webhooks.test.ts  [SCRIPTED OUTPUT]\n\nPASS three deliveries → one upgrade + same receipt\nPASS concurrent same-event deliveries → one upgrade\nPASS processing failure → rollback → retry succeeds\nPASS existing receipt schema unchanged\nPASS customer emails absent from logs\n\n5 scripted checks passed · no live payment connection',
  },
  {
    id: '108', actor: 'jb', kind: 'Handoff ready', title: 'The next session gets the whole thread.',
    text: 'Recorded: the failed lookup approach, the approved unique constraint, the transaction change, and the scripted check results. Same receipt contract. Retryable failures preserved. No customer emails in the sample log.',
    note: 'A sample handoff with source references. The independent project record stays with the project.',
    file: 'HANDOFF.md',
    code: '# Synthetic handoff excerpt\nDead end: lookup before transaction races · event 103\nHuman decision: unique provider event ID · decision D-17\nChanged: billing/webhooks.ts · event 106\nChecks: 5 scripted checks passed · event 107\nContract: existing receipt shape preserved\nPrivacy: no payload/customer-email logging\nNext: validate the design against a real integration\n\nNo project file was written by this website.',
  },
];
const escapeHTML = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const actorLabel = actor => actor === 'human' ? 'You' : actor === 'jb' ? 'Jugalbandi' : AGENTS[actor].handle;
const actorMeta = actor => AGENTS[actor]?.harness || (actor === 'jb' ? 'Workspace · coordination' : 'Human decision');
const mascot = actor => actor === 'human' ? '<span class="wp-human-avatar" aria-hidden="true">◇</span>' : actor === 'jb' ? '<span class="wp-human-avatar wp-bridge-avatar" aria-hidden="true">✳</span>' : `<svg class="wp-pet" viewBox="0 0 200 180" aria-hidden="true">${petContents(actor)}</svg>`;

export function mountWorkspace(element) {
  if (!element) return;
  const state = { view: 'workspace', step: -1, selected: -1, playing: false, confirmed: false, previewApproval: false, draft: EXAMPLE_PROMPT, quotaMode: 'sample', filter: 'all', nativeOpen: false, selectedAgent: 'claude' };
  let timer = null;
  const media = typeof window.matchMedia === 'function' ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  const reducedMotion = () => Boolean(media?.matches || document.documentElement.dataset.motion === 'reduced');
  const visibleSteps = () => STEPS.slice(0, state.step + 1);
  const selectedStep = () => STEPS[Math.max(0, state.selected)];
  const isExample = () => state.draft.trim() === EXAMPLE_PROMPT;
  const waitingDecision = () => state.step === 4 && !state.confirmed;

  element.innerHTML = `<div class="wp-shell"><header class="wp-titlebar"><div class="wp-project"><span class="wp-app-mark" lang="hi" aria-hidden="true">जु</span><span><strong>Jugalbandi workspace</strong><small>Fictional project · membership billing</small></span></div><span class="wp-planned">Scripted product demo · sample data</span></header><nav class="wp-nav" aria-label="Sample workspace views"><button type="button" data-wp-view="workspace" aria-pressed="true">Conversation</button><button type="button" data-wp-view="inbox" aria-pressed="false">Inbox <span class="wp-count">0</span></button><button type="button" data-wp-view="timeline" aria-pressed="false">Timeline</button><button type="button" data-wp-view="health" aria-pressed="false">Health</button></nav><div class="wp-content"></div><footer class="wp-footer"><span>No model, payment provider, or project is connected.</span><span>Nothing executes. No files change.</span></footer></div><p class="wp-announcement" role="status" aria-live="polite"></p>`;
  const content = element.querySelector('.wp-content');
  const announce = text => { element.querySelector('.wp-announcement').textContent = text; };

  function stop() {
    clearTimeout(timer);
    timer = null;
    state.playing = false;
  }
  function updateNavigation() {
    element.querySelectorAll('[data-wp-view]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.wpView === state.view)));
    const count = element.querySelector('.wp-count');
    count.textContent = state.step >= 4 && !state.confirmed ? '1' : '0';
    count.setAttribute('aria-label', state.step >= 4 && !state.confirmed ? '1 sample decision needs you' : 'No open sample contract decision');
  }
  function controls() {
    return `<div class="wp-demo-controls" role="group" aria-label="Scripted scenario playback"><button type="button" data-wp-action="play"${state.step < 0 || waitingDecision() || state.step === STEPS.length - 1 || reducedMotion() ? ' disabled' : ''}>${state.playing ? 'Pause' : 'Play'}</button><button type="button" data-wp-action="next"${state.step < 0 || waitingDecision() || state.step === STEPS.length - 1 ? ' disabled' : ''}>Next step <span aria-hidden="true">→</span></button><button type="button" data-wp-action="replay"${state.step < 0 ? ' disabled' : ''}>Replay <span aria-hidden="true">↻</span></button><span class="wp-step-count">${state.step < 0 ? 'Ready' : `${state.step + 1} / ${STEPS.length}`}</span></div>`;
  }
  function agentStatus(actor) {
    if (state.step < 0) return 'Ready';
    if (state.step >= 7) return 'Sample complete';
    if (waitingDecision()) return actor === 'claude' ? 'Paused for your decision' : 'Review complete';
    if (state.step === 6) return actor === 'codex' ? 'Sample checks pass' : 'Change ready';
    return STEPS[state.step].actor === actor ? (state.playing ? 'Working in sample' : 'Selected step') : 'Following the thread';
  }
  function roster() {
    return `<aside class="wp-agent-sidebar" aria-label="Agents and tasks"><div class="wp-sidebar-heading"><span class="wp-eyebrow">AGENTS</span><span class="wp-muted">2 sample sessions</span></div><div class="wp-agent-list">${Object.entries(AGENTS).map(([key, agent]) => `<button type="button" class="wp-agent" data-wp-agent="${key}" aria-pressed="${state.selectedAgent === key}">${mascot(key)}<span><strong>${agent.handle}</strong><small>${harnessLogo(agent.harness)}${agent.harness}</small><b>${agent.task}</b><em>${agentStatus(key)}</em></span></button>`).join('')}</div><div class="wp-task-summary"><span class="wp-eyebrow">TASK · SAMPLE T-17</span><strong>Retry-safe membership upgrade</strong><p>Same receipt. One upgrade. Retryable failures.</p><code>${AGENTS[state.selectedAgent].branch}</code></div><div class="wp-agent-boundary">Agents work in their existing harnesses. Jugalbandi keeps the thread.</div></aside>`;
  }
  function decisionCard() {
    if (state.step < 4) return '';
    if (state.confirmed) return `<div class="wp-inline-decision wp-decision-accepted"><strong>◇ You accepted the sample constraint.</strong><p>Approval is recorded in this demo only. It does not answer a native prompt.</p><button class="wp-text-button" type="button" data-wp-go="inbox">Review the exact record ↗</button></div>`;
    return `<div class="wp-inline-decision"><span class="wp-eyebrow">YOUR CALL · SAMPLE D-17</span><h4>Add the persistent unique constraint?</h4><p>Unique (provider, event_id). Existing receipt schema stays unchanged.</p><button class="wp-primary" type="button" data-wp-action="preview-approval">Review approval</button><button class="wp-text-button" type="button" data-wp-action="hold">Keep paused</button>${state.previewApproval ? `<div class="wp-approval-preview"><span class="wp-eyebrow">EXACT SAMPLE RECORD</span><code>${escapeHTML(DECISION_RECORD)}</code><button class="wp-primary" type="button" data-wp-action="confirm">Accept in this demo</button><small>No database or file will change.</small></div>` : ''}</div>`;
  }
  function chat() {
    const steps = visibleSteps();
    return `<section class="wp-conversation" aria-labelledby="wp-chat-heading"><div class="wp-conversation-top"><div><span class="wp-eyebrow">CONVERSATION</span><h3 id="wp-chat-heading">Three retries. One upgrade.</h3></div><span class="wp-chat-tag">invoice.paid</span></div><div class="wp-scenario-context"><span class="wp-context-dot" aria-hidden="true"></span><p>A provider retries the same webhook three times. The membership upgrade happens twice.</p></div>${controls()}<div class="wp-chat-log" aria-label="Scripted development conversation" tabindex="0">${steps.length ? steps.map((step, index) => `<article class="wp-message wp-message-${step.actor}${index === state.step ? ' wp-message-latest' : ''}"><div class="wp-message-avatar">${mascot(step.actor)}</div><div class="wp-message-body"><div class="wp-message-byline"><strong>${actorLabel(step.actor)}</strong><small>${actorMeta(step.actor)}</small></div><p>${escapeHTML(step.text)}</p><button class="wp-message-event" type="button" data-wp-event="${index}" aria-pressed="${state.selected === index}">${step.kind} <span class="mono">#${step.id}</span> <span aria-hidden="true">↗</span></button>${index === 4 ? decisionCard() : ''}</div></article>`).join('') : `<div class="wp-chat-empty"><span class="wp-empty-mark" aria-hidden="true">↗</span><h4>Start with the actual bug.</h4><p>Send the example below. Watch a plan, a race-condition review, a human decision, and a fix carry through one thread.</p><span>Scripted demo. No live model responses.</span></div>`}</div><form class="wp-composer" novalidate><label for="wp-prompt">Your command <span>· editable demo input</span></label><textarea id="wp-prompt" name="prompt" rows="4" aria-describedby="wp-composer-note">${escapeHTML(state.draft)}</textarea><div class="wp-composer-bottom"><button type="button" class="wp-text-button" data-wp-action="load-example">Load example ↺</button><button class="wp-run" type="submit"${!isExample() || state.step >= 0 ? ' disabled' : ''}>Run sample <span aria-hidden="true">↑</span></button></div><p id="wp-composer-note">${!isExample() ? 'This preview cannot answer custom commands. Load the example to run its recorded scenario.' : state.step === STEPS.length - 1 ? 'Sample complete. Replay to follow the thread again.' : state.step >= 0 ? 'Sample is in progress. Use Next step or Replay; no model request is sent.' : 'Only this example runs a recorded scenario. Your text is not sent anywhere.'}</p>${reducedMotion() ? '<p class="wp-motion-note">Reduced motion is on. Use Next step to read at your pace.</p>' : ''}</form></section>`;
  }
  function quota() {
    const panels = [
      { harness: 'Claude Code', source: 'Status line · 14:48 (sample)', windows: [{ name: '5 h', used: 62, reset: 'Today 16:40' }, { name: '7 d', used: 31, reset: 'Mon 09:00' }] },
      { harness: 'Codex', source: 'App-server · 14:49 (sample)', windows: [{ name: '5 h', used: 84, reset: 'Today 17:02' }, { name: '7 d', used: 9, reset: 'Tue 10:00' }] },
    ];
    return `<details class="wp-quota-details"><summary>Harness quota <span>Sample data</span></summary><div class="wp-quota-body"><div class="wp-quota-toggle" role="group" aria-label="Quota example"><button type="button" data-wp-quota="sample" aria-pressed="${state.quotaMode === 'sample'}">Sample</button><button type="button" data-wp-quota="missing" aria-pressed="${state.quotaMode === 'missing'}">No data</button></div>${panels.map(panel => `<section class="wp-vendor-quota"><h5 class="harness-name">${harnessLogo(panel.harness)}${panel.harness}</h5>${state.quotaMode === 'sample' ? `<span class="wp-quota-source">${panel.source} · fresh in sample</span>${panel.windows.map(window => `<div class="wp-quota-window${window.used >= 70 ? ' wp-quota-high' : ''}"><span>${window.name}</span><meter min="0" max="100" value="${window.used}" aria-label="Sample ${panel.harness} ${window.name}: ${window.used}% used, ${100 - window.used}% remaining">${window.used}% used</meter><strong>${100 - window.used}% left</strong><small>${window.used}% used${window.used >= 70 ? ' · high' : ''} · resets ${window.reset}</small></div>`).join('')}` : `<p class="wp-missing-quota"><strong>No quota data</strong>${panel.harness === 'Claude Code' ? 'Some plans send no rate-limit data.' : 'Sample source unavailable. Check jb doctor.'}</p>`}</section>`).join('')}<p class="wp-quota-footnote">Synthetic windows, not your account. Claude chat and Claude Code share a budget. Unknown never means zero.</p></div></details>`;
  }
  function inspector() {
    const step = selectedStep();
    return `<aside class="wp-inspector" aria-label="Selected file, event, attention, and quota"><details class="wp-file-panel" open><summary>Selected file <span>${state.step < 0 ? 'Before' : `#${step.id}`}</span></summary><div class="wp-file-heading"><strong>${step.file}</strong><span>${step.kind} · sample</span></div><pre class="wp-code-excerpt" tabindex="0"><code>${escapeHTML(step.code)}</code></pre><div class="wp-event-detail"><strong>${actorLabel(step.actor)} <span>· ${actorMeta(step.actor)}</span></strong><p>${step.note}</p><small>Synthetic source: event ${step.id} · ${step.file}</small></div></details><details class="wp-attention"><summary>Needs you <span>${waitingDecision() ? '1 decision' : 'Native prompt'}</span></summary><div>${waitingDecision() ? '<button class="wp-text-button" type="button" data-wp-go="inbox">Review the persistent constraint ↗</button>' : `<p>${state.confirmed ? 'Sample constraint accepted. Native permissions stay separate.' : 'Native permissions stay with the existing harness.'}</p>`}<button class="wp-text-button" type="button" data-wp-action="native">${state.nativeOpen ? 'Hide' : 'View'} sample native prompt</button>${state.nativeOpen ? '<div class="wp-native-prompt"><strong>Claude Code · sample permission</strong><code>Run billing/webhooks.test.ts?</code><p>Answer inside Claude Code. This website cannot answer the prompt.</p></div>' : ''}</div></details>${quota()}</aside>`;
  }
  function renderWorkspace() {
    content.innerHTML = `<div class="wp-chat-layout">${roster()}${chat()}${inspector()}</div>`;
  }
  function renderInbox() {
    content.innerHTML = `<section class="wp-secondary-view"><div class="wp-view-heading"><div><span class="wp-eyebrow">INBOX</span><h3>${state.confirmed ? 'Sample decision accepted.' : 'A persistent change needs your call.'}</h3></div><button class="wp-secondary" data-wp-go="workspace" type="button">Back to conversation</button></div>${state.step >= 4 ? `<div class="wp-inbox-grid"><div class="wp-decision-evidence"><h4>Unique event IDs for invoice.paid</h4><dl><dt>Observed in the fixture</dt><dd>Concurrent deliveries can both pass a lookup and upgrade twice.</dd><dt>Proposed change</dt><dd>A persistent unique constraint on (provider, event_id), inserted in the same transaction as the upgrade.</dd><dt>Keep unchanged</dt><dd>The receipt schema, retryable failures, and the no-customer-email logging boundary.</dd></dl>${decisionCard()}</div><div class="wp-native-explainer"><h4>A separate native permission</h4><p>A Claude Code permission prompt remains in its own harness. Accepting this sample decision does not answer it.</p><button class="wp-text-button" type="button" data-wp-action="native-in-chat">Inspect the sample prompt ↗</button></div></div>` : '<p class="wp-secondary-empty">Run the sample until the persistent-constraint proposal. Your decision will appear here.</p>'}</section>`;
  }
  function renderTimeline() {
    const steps = visibleSteps().filter(step => state.filter === 'all' || step.actor === state.filter);
    content.innerHTML = `<section class="wp-secondary-view"><div class="wp-view-heading"><div><span class="wp-eyebrow">TIMELINE</span><h3>One thread, with sources.</h3></div><label class="wp-filter">Source<select id="wp-source-filter" aria-label="Source"><option value="all">All sources</option>${['claude', 'codex', 'human', 'jb'].map(actor => `<option value="${actor}"${state.filter === actor ? ' selected' : ''}>${actorLabel(actor)}</option>`).join('')}</select></label></div><div class="wp-timeline-layout"><div class="wp-events">${steps.length ? steps.map(step => `<button type="button" data-wp-timeline="${STEPS.indexOf(step)}" aria-pressed="${state.selected === STEPS.indexOf(step)}"><span class="wp-event-number">${step.id}</span><span><strong>${step.title}</strong><small>${actorLabel(step.actor)} · ${actorMeta(step.actor)} · ${step.kind}</small></span></button>`).join('') : '<p class="wp-secondary-empty">No events in this sample view yet.</p>'}${state.confirmed && (state.filter === 'all' || state.filter === 'human') ? `<article class="wp-timeline-acceptance"><strong>◇ Human accepted sample D-17</strong><code>${escapeHTML(DECISION_RECORD)}</code><small>Accepted in memory only. No real timestamp or project write is claimed.</small></article>` : ''}</div>${inspector()}</div></section>`;
  }
  function renderHealth() {
    content.innerHTML = `<section class="wp-secondary-view"><div class="wp-view-heading"><div><span class="wp-eyebrow">HEALTH</span><h3>Know what is connected.</h3></div><span class="wp-muted">Sample checks</span></div><div class="wp-health-grid"><article><h4>Website demo</h4><p>No model backend, payment provider, terminal, or project is connected. Messages and check output are scripted.</p></article><article><h4>Planned local record</h4><p>Redacted append-only JSONL, one daemon writer, rebuildable SQLite index. These are product design choices.</p></article><article><h4>Native permissions</h4><p>The original harness owns its permission prompts. The workspace surfaces attention; it cannot silently approve a prompt.</p></article><article><h4>Rule coverage</h4><p>Actual enforcement depends on installed harness capabilities and verified checks. A prose instruction is advisory.</p></article></div>${quota()}</section>`;
  }
  function render({ follow = false } = {}) {
    const focused = document.activeElement;
    const focusId = focused && content.contains(focused) ? focused.id : null;
    const focusActionName = focused && content.contains(focused) ? focused.dataset?.wpAction : null;
    const selection = focusId === 'wp-prompt' ? [focused.selectionStart, focused.selectionEnd] : null;
    updateNavigation();
    ({ workspace: renderWorkspace, inbox: renderInbox, timeline: renderTimeline, health: renderHealth })[state.view]();
    if (follow && state.view === 'workspace') {
      const log = content.querySelector('.wp-chat-log');
      log.scrollTop = log.scrollHeight;
    }
    const replacement = focusId ? content.querySelector(`#${focusId}`) : focusActionName ? content.querySelector(`[data-wp-action="${focusActionName}"]`) : null;
    replacement?.focus({ preventScroll: true });
    if (selection && replacement?.setSelectionRange) replacement.setSelectionRange(...selection);
  }
  function schedule() {
    clearTimeout(timer);
    timer = null;
    if (!state.playing || reducedMotion() || document.hidden || state.view !== 'workspace' || waitingDecision() || state.step >= STEPS.length - 1) return;
    timer = setTimeout(() => {
      timer = null;
      state.step += 1;
      state.selected = state.step;
      if (waitingDecision() || state.step >= STEPS.length - 1) state.playing = false;
      render({ follow: true });
      announce(waitingDecision() ? 'Sample paused. Review the persistent unique constraint before continuing.' : `${actorLabel(STEPS[state.step].actor)}: ${STEPS[state.step].title}`);
      schedule();
    }, 6200);
  }
  function run() {
    if (!isExample()) return;
    stop();
    state.step = 0;
    state.selected = 0;
    state.confirmed = false;
    state.previewApproval = false;
    state.view = 'workspace';
    state.playing = !reducedMotion();
    render({ follow: true });
    announce('Scripted invoice.paid scenario started. No request is sent to a model or payment provider.');
    schedule();
  }
  function changeView(view) {
    stop();
    state.view = view;
    render();
    announce(`${view === 'workspace' ? 'Conversation' : view} sample view opened.`);
  }
  function focusAction(action) { content.querySelector(`[data-wp-action="${action}"]`)?.focus({ preventScroll: true }); }

  element.addEventListener('submit', event => {
    if (!event.target.matches('.wp-composer')) return;
    event.preventDefault();
    if (state.step < 0) run();
  });
  element.addEventListener('input', event => {
    if (event.target.id !== 'wp-prompt') return;
    state.draft = event.target.value;
    stop();
    content.querySelector('.wp-run').disabled = !isExample() || state.step >= 0;
    content.querySelector('#wp-composer-note').textContent = !isExample() ? 'This preview cannot answer custom commands. Load the example to run its recorded scenario.' : state.step >= 0 ? 'Use Replay to run the example again.' : 'Only this example runs a recorded scenario. Your text is not sent anywhere.';
    const play = content.querySelector('[data-wp-action="play"]');
    if (play) play.textContent = 'Play';
  });
  element.addEventListener('click', event => {
    const button = event.target.closest('button');
    if (!button || !element.contains(button) || button.disabled) return;
    if (button.dataset.wpView || button.dataset.wpGo) {
      changeView(button.dataset.wpView || button.dataset.wpGo);
      return;
    }
    if (button.dataset.wpEvent !== undefined || button.dataset.wpTimeline !== undefined) {
      state.selected = Number(button.dataset.wpEvent ?? button.dataset.wpTimeline);
      const entry = selectedStep();
      if (AGENTS[entry.actor]) state.selectedAgent = entry.actor;
      stop();
      const scroll = content.querySelector('.wp-chat-log')?.scrollTop || 0;
      render();
      if (state.view === 'workspace') content.querySelector('.wp-chat-log').scrollTop = scroll;
      const selector = button.dataset.wpEvent !== undefined ? `[data-wp-event="${state.selected}"]` : `[data-wp-timeline="${state.selected}"]`;
      content.querySelector(selector)?.focus({ preventScroll: true });
      announce(`Sample event ${entry.id} selected. ${entry.file}. ${entry.kind}.`);
      return;
    }
    if (button.dataset.wpAgent) {
      state.selectedAgent = button.dataset.wpAgent;
      const latest = visibleSteps().map((step,index) => ({step,index})).filter(item => item.step.actor === state.selectedAgent).at(-1);
      if (latest) state.selected = latest.index;
      stop();
      render();
      content.querySelector(`[data-wp-agent="${state.selectedAgent}"]`)?.focus({ preventScroll: true });
      announce(`${AGENTS[state.selectedAgent].handle}, ${AGENTS[state.selectedAgent].harness}, ${agentStatus(state.selectedAgent)}.`);
      return;
    }
    if (button.dataset.wpQuota) {
      state.quotaMode = button.dataset.wpQuota;
      const panel = button.closest('.wp-quota-details');
      panel.outerHTML = quota().replace('<details class="wp-quota-details">', '<details class="wp-quota-details" open>');
      content.querySelector(`[data-wp-quota="${state.quotaMode}"]`)?.focus({ preventScroll: true });
      announce(state.quotaMode === 'sample' ? 'Synthetic quota windows shown.' : 'No quota data shown. Unknown is not zero.');
      return;
    }
    switch (button.dataset.wpAction) {
      case 'load-example':
        stop();
        state.draft = EXAMPLE_PROMPT;
        state.step = -1;
        state.selected = -1;
        state.confirmed = false;
        state.previewApproval = false;
        render();
        content.querySelector('#wp-prompt')?.focus({ preventScroll: true });
        announce('Example command loaded. Run sample to begin.');
        break;
      case 'replay':
        state.draft = EXAMPLE_PROMPT;
        run();
        focusAction('next');
        break;
      case 'play':
        if (state.playing) stop();
        else if (!reducedMotion() && !waitingDecision()) state.playing = true;
        render();
        focusAction('play');
        schedule();
        break;
      case 'next':
        stop();
        if (waitingDecision() || state.step >= STEPS.length - 1) break;
        state.step += 1;
        state.selected = state.step;
        render({ follow: true });
        focusAction(waitingDecision() ? 'preview-approval' : state.step === STEPS.length - 1 ? 'replay' : 'next');
        announce(waitingDecision() ? 'Sample paused for your decision. Review the persistent constraint.' : `${actorLabel(STEPS[state.step].actor)}: ${STEPS[state.step].title}`);
        break;
      case 'preview-approval':
        stop();
        state.previewApproval = true;
        render({ follow: true });
        focusAction('confirm');
        announce('Exact sample decision ready for your review. No files will be changed.');
        break;
      case 'confirm':
        if (state.step < 4 || !state.previewApproval || state.confirmed) break;
        stop();
        state.confirmed = true;
        render({ follow: true });
        focusAction('next');
        announce('Sample constraint accepted in memory only. Use Next step to continue. Native permissions stay separate.');
        break;
      case 'hold':
        stop();
        render();
        focusAction('preview-approval');
        announce('Sample remains paused. No decision was accepted.');
        break;
      case 'native':
        state.nativeOpen = !state.nativeOpen;
        stop();
        render();
        const nativeButton = content.querySelector('[data-wp-action="native"]');
        nativeButton?.closest('details')?.setAttribute('open', '');
        nativeButton?.focus({ preventScroll: true });
        announce('Sample native permission. It must be answered in the original harness.');
        break;
      case 'native-in-chat':
        state.nativeOpen = true;
        changeView('workspace');
        const attention = content.querySelector('.wp-attention');
        attention?.setAttribute('open', '');
        content.querySelector('[data-wp-action="native"]')?.focus({ preventScroll: true });
        break;
    }
  });
  element.addEventListener('change', event => {
    if (event.target.id !== 'wp-source-filter') return;
    state.filter = event.target.value;
    renderTimeline();
    content.querySelector('#wp-source-filter')?.focus({ preventScroll: true });
  });
  const pauseForPreference = () => {
    if (!reducedMotion()) return;
    stop();
    render();
    announce('Reduced motion is on. Advance the scripted sample with Next step.');
  };
  media?.addEventListener('change', pauseForPreference);
  const motionObserver = typeof MutationObserver !== 'undefined' ? new MutationObserver(pauseForPreference) : null;
  motionObserver?.observe(document.documentElement, { attributes: true, attributeFilter: ['data-motion'] });
  const visibilityHandler = () => { if (document.hidden) { stop(); render(); } };
  document.addEventListener('visibilitychange', visibilityHandler);
  const intersection = typeof IntersectionObserver !== 'undefined' ? new IntersectionObserver(entries => { if (!entries[0].isIntersecting && state.playing) { stop(); render(); } }, { threshold: 0.05 }) : null;
  intersection?.observe(element);
  render();
  return () => { stop(); media?.removeEventListener('change', pauseForPreference); motionObserver?.disconnect(); intersection?.disconnect(); document.removeEventListener('visibilitychange', visibilityHandler); };
}
