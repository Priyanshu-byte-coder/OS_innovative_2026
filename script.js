/* ================================================================
   Priority Inversion & Inheritance Visualizer — Dynamic Engine
   ================================================================
   Supports any number of processes with configurable priorities and
   resource requirements.  The simulation engine computes steps
   dynamically based on priority scheduling rules.
   ================================================================ */

// ============================================================
//  CONSTANTS & PALETTE
// ============================================================
const PROCESS_COLORS = [
    '#f472b6', '#60a5fa', '#34d399', '#fbbf24', '#a78bfa',
    '#fb923c', '#22d3ee', '#e879f9', '#f87171', '#6ee7b7',
    '#818cf8', '#fca5a5', '#86efac', '#fde68a', '#c4b5fd',
];

const STATES = Object.freeze({
    READY:     'READY',
    RUNNING:   'RUNNING',
    BLOCKED:   'BLOCKED',
    COMPLETED: 'COMPLETED',
    BOOSTED:   'BOOSTED',
});

// ============================================================
//  GLOBAL STATE
// ============================================================
let processConfig = [];   // array of { id, name, priority, needsResource, color }
let nextProcId = 1;

let sim = {
    running: false,
    step: 0,
    steps: [],             // computed step array
    autoPlay: false,
    autoTimer: null,
    speed: 3,
    inheritanceEnabled: false,
    completed: false,
};

// ============================================================
//  INITIALIZATION — default three processes
// ============================================================
function init() {
    addProcess(3, true);   // P1 high, needs resource
    addProcess(2, false);  // P2 med, CPU only
    addProcess(1, true);   // P3 low, needs resource
    renderAll();
}

// ============================================================
//  PROCESS MANAGEMENT
// ============================================================
function addProcess(priority, needsResource) {
    const id = nextProcId++;
    const color = PROCESS_COLORS[(id - 1) % PROCESS_COLORS.length];
    processConfig.push({
        id,
        name: `P${id}`,
        priority: priority !== undefined ? priority : 1,
        needsResource: needsResource !== undefined ? needsResource : false,
        color,
    });
    renderAll();
}

function removeProcess(id) {
    if (processConfig.length <= 2) return;          // need at least 2
    processConfig = processConfig.filter(p => p.id !== id);
    renderAll();
}

function updatePriority(id, val) {
    const p = processConfig.find(x => x.id === id);
    if (p) p.priority = Math.max(1, parseInt(val) || 1);
}

function toggleResource(id) {
    const p = processConfig.find(x => x.id === id);
    if (p) p.needsResource = !p.needsResource;
    renderResourceAssignment();
}

// ============================================================
//  RENDER CONFIG SIDEBAR
// ============================================================
function renderAll() {
    renderProcessList();
    renderResourceAssignment();
    renderProcessLane();
    renderGanttLabels();
    clearGanttTracks();
    updateResourceHub(false, null, []);
}

function renderProcessList() {
    const c = document.getElementById('processListConfig');
    c.innerHTML = '';
    processConfig.forEach(p => {
        const div = document.createElement('div');
        div.className = 'proc-config';
        div.innerHTML = `
            <div class="pc-header">
                <span class="pc-name"><span class="pc-dot" style="background:${p.color}"></span>${p.name}</span>
                ${processConfig.length > 2 ? `<button class="pc-remove" onclick="removeProcess(${p.id})" title="Remove">×</button>` : ''}
            </div>
            <div class="pc-field">
                <label>Priority (higher = more important)</label>
                <input type="number" min="1" max="99" value="${p.priority}"
                       onchange="updatePriority(${p.id}, this.value)"
                       oninput="updatePriority(${p.id}, this.value)">
            </div>
        `;
        c.appendChild(div);
    });
}

function renderResourceAssignment() {
    const c = document.getElementById('resourceAssignment');
    c.innerHTML = '';
    processConfig.forEach(p => {
        const div = document.createElement('div');
        div.className = 'ra-item';
        div.onclick = () => toggleResource(p.id);
        div.innerHTML = `
            <div class="ra-check ${p.needsResource ? 'checked' : ''}"></div>
            <span class="ra-label" style="color:${p.color}">${p.name}</span>
        `;
        c.appendChild(div);
    });
}

// ============================================================
//  RENDER PROCESS LANE (center cards)
// ============================================================
function renderProcessLane() {
    const lane = document.getElementById('processLane');
    lane.innerHTML = '';
    processConfig.forEach(p => {
        const card = document.createElement('div');
        card.className = 'pv-card st-ready';
        card.id = `pvCard-${p.id}`;
        card.innerHTML = `
            <div class="pv-bar" style="background:${p.color}"></div>
            <div class="pv-pulse"></div>
            <div class="pv-head">
                <span class="pv-name" style="color:${p.color}">${p.name}</span>
                <span class="pv-pri-badge" style="background:${p.color}20;color:${p.color};border:1px solid ${p.color}40">
                    PRI ${p.priority}
                </span>
            </div>
            <div class="pv-state">
                <span class="pv-state-dot st-ready" id="pvDot-${p.id}"></span>
                <span class="pv-state-text" id="pvState-${p.id}">READY</span>
                <span class="pv-gear" id="pvGear-${p.id}">⚙️</span>
            </div>
            <div class="pv-info">
                <div class="pv-info-row">
                    <span class="pv-info-label">Priority</span>
                    <span class="pv-info-val" id="pvPri-${p.id}">${p.priority}</span>
                </div>
                <div class="pv-info-row">
                    <span class="pv-info-label">Resource</span>
                    <span class="pv-info-val">${p.needsResource ? 'Needs Lock' : 'CPU Only'}</span>
                </div>
            </div>
        `;
        lane.appendChild(card);
    });
}

// ============================================================
//  RENDER GANTT
// ============================================================
function renderGanttLabels() {
    const c = document.getElementById('ganttLabels');
    c.innerHTML = '';
    processConfig.forEach(p => {
        const label = document.createElement('div');
        label.className = 'gl-label';
        label.style.color = p.color;
        label.textContent = p.name;
        c.appendChild(label);
    });
}

function clearGanttTracks() {
    const c = document.getElementById('ganttTracks');
    c.innerHTML = '';
    processConfig.forEach(p => {
        const track = document.createElement('div');
        track.className = 'gt-track';
        track.id = `gt-${p.id}`;
        c.appendChild(track);
    });
}

function addGanttColumn(stepNum, stateMap) {
    processConfig.forEach(p => {
        const track = document.getElementById(`gt-${p.id}`);
        if (!track) return;
        const block = document.createElement('div');
        block.className = 'gt-block';
        const st = stateMap[p.id] || STATES.READY;
        switch (st) {
            case STATES.RUNNING:   block.classList.add('gt-running'); break;
            case STATES.BLOCKED:   block.classList.add('gt-blocked'); break;
            case STATES.COMPLETED: block.classList.add('gt-done'); break;
            case STATES.BOOSTED:   block.classList.add('gt-boosted'); break;
            case STATES.READY:     block.classList.add('gt-ready'); break;
            default:               block.classList.add('gt-idle');
        }
        block.textContent = `S${stepNum}`;
        track.appendChild(block);
    });
}

// ============================================================
//  RESOURCE HUB UI
// ============================================================
function updateResourceHub(locked, owner, queue) {
    const hub    = document.getElementById('resourceHub');
    const status = document.getElementById('rhStatus');
    const ownerE = document.getElementById('rhOwner');
    const queueE = document.getElementById('rhQueue');
    const shackle = document.getElementById('shackle');

    hub.classList.remove('locked', 'unlocked');
    if (locked) {
        hub.classList.add('locked');
        status.textContent = 'LOCKED';
        ownerE.textContent = `Held by ${owner}`;
        shackle.setAttribute('d', 'M16,36 V24 A16,16 0 0 1 48,24 V36');
    } else {
        hub.classList.add('unlocked');
        status.textContent = 'UNLOCKED';
        ownerE.textContent = '—';
        shackle.setAttribute('d', 'M16,36 V24 A16,16 0 0 1 48,24 V28');
    }

    if (queue.length > 0) {
        queueE.innerHTML = queue.map(n => `<span class="q-tag">${n}</span>`).join(' ');
    } else {
        queueE.textContent = 'empty';
    }
}

// ============================================================
//  PROCESS CARD STATE UPDATE
// ============================================================
function setCardState(pid, state, boostPri) {
    const card = document.getElementById(`pvCard-${pid}`);
    const dot  = document.getElementById(`pvDot-${pid}`);
    const text = document.getElementById(`pvState-${pid}`);
    const pri  = document.getElementById(`pvPri-${pid}`);
    if (!card) return;

    card.className = 'pv-card';
    dot.className  = 'pv-state-dot';

    const stClass = {
        [STATES.RUNNING]:   'st-running',
        [STATES.BLOCKED]:   'st-blocked',
        [STATES.COMPLETED]: 'st-done',
        [STATES.BOOSTED]:   'st-boosted',
        [STATES.READY]:     'st-ready',
    }[state] || 'st-ready';

    card.classList.add(stClass);
    dot.classList.add(stClass);

    let display = state;
    if (state === STATES.BOOSTED) display = 'RUNNING ⬆';
    text.textContent = display;

    // Priority display
    const proc = processConfig.find(p => p.id === pid);
    if (boostPri !== undefined && boostPri !== null) {
        pri.textContent = `${boostPri} (↑ Boosted)`;
        pri.classList.add('boosted');
    } else {
        pri.textContent = proc ? proc.priority : '';
        pri.classList.remove('boosted');
    }
}

// ============================================================
//  EXPLANATION UI
// ============================================================
function setExplanation(icon, title, text, detail) {
    document.getElementById('expIcon').textContent = icon;
    document.getElementById('expTitle').textContent = title;
    const body = document.getElementById('expText');

    // Build HTML
    let html = text;
    if (detail) {
        html += `<div class="exp-detail">${detail}</div>`;
    }
    body.innerHTML = html;

    document.getElementById('explanationBox').classList.add('active');
}

// ============================================================
//  MICRO ANIMATIONS
// ============================================================
function shootParticle(pid, isDeny) {
    const procCard = document.getElementById(`pvCard-${pid}`);
    const lockHub = document.getElementById('rhLock');
    if (!procCard || !lockHub) return;

    const r1 = procCard.getBoundingClientRect();
    const r2 = lockHub.getBoundingClientRect();

    const startX = r1.left + r1.width / 2;
    const startY = r1.top + r1.height / 2;
    const endX = r2.left + r2.width / 2;
    const endY = r2.top + r2.height / 2;

    const particle = document.createElement('div');
    particle.className = 'anim-particle';
    particle.style.background = isDeny ? 'var(--red)' : 'var(--green)';
    particle.style.boxShadow = `0 0 12px ${particle.style.background}`;
    particle.style.left = startX + 'px';
    particle.style.top = startY + 'px';
    document.body.appendChild(particle);

    // trigger animation
    setTimeout(() => {
        particle.style.left = endX + 'px';
        particle.style.top = endY + 'px';
    }, 20);

    setTimeout(() => {
        particle.remove();
        
        // Render text popup
        const text = document.createElement('div');
        text.className = isDeny ? 'anim-deny-text' : 'anim-accept-text';
        text.textContent = isDeny ? 'DENIED!' : 'ACQUIRED!';
        text.style.left = (endX - 35) + 'px';
        text.style.top = (endY - 25) + 'px';
        document.body.appendChild(text);

        // Shake effects for Deny
        if (isDeny) {
            const hubWrap = lockHub.parentElement;
            hubWrap.classList.remove('shake-lock');
            void hubWrap.offsetWidth;
            hubWrap.classList.add('shake-lock');

            procCard.classList.remove('shake-card');
            void procCard.offsetWidth;
            procCard.classList.add('shake-card');
        }

        setTimeout(() => text.remove(), 800);
    }, 520); // Syncs with CSS transition of 0.5s
}

// ============================================================
//  SIMULATION ENGINE  — computes steps dynamically
// ============================================================
function computeSteps() {
    const procs  = processConfig.map(p => ({
        ...p,
        state: STATES.READY,
        effectivePriority: p.priority,
        done: false,
        holdingResource: false,
        waitingForResource: false,
        cpuWork: p.needsResource ? 2 : 2,   // ticks of work
        csWork: p.needsResource ? 1 : 0,    // critical-section ticks
        cpuDone: 0,
        csDone: 0,
    }));

    const inherit = sim.inheritanceEnabled;
    const steps = [];

    // Find the process that should acquire the resource first (lowest priority that needs it)
    const resourceUsers = procs.filter(p => p.needsResource);
    const nonResourceUsers = procs.filter(p => !p.needsResource);

    if (resourceUsers.length < 2) {
        // Not enough processes needing the resource to demonstrate inversion
        // Simple priority scheduling
        const sorted = [...procs].sort((a, b) => b.priority - a.priority);
        sorted.forEach((p, i) => {
            const stateMap = {};
            procs.forEach(pp => {
                if (pp.done) stateMap[pp.id] = STATES.COMPLETED;
                else if (pp.id === p.id) stateMap[pp.id] = STATES.RUNNING;
                else stateMap[pp.id] = STATES.READY;
            });
            p.done = true;
            steps.push({
                icon: i === sorted.length - 1 ? '✅' : '▶️',
                title: `Step ${i + 1} — ${p.name} Runs`,
                text: `<strong>${p.name}</strong> (priority ${p.priority}) executes. Standard priority scheduling — highest priority runs first.`,
                detail: 'No resource contention in this configuration, so no priority inversion occurs.',
                stateMap,
                lockState: false,
                lockOwner: null,
                queue: [],
                boosts: {},
            });
        });
        return steps;
    }

    // Sort resource users by priority ascending — lowest priority acquires first
    resourceUsers.sort((a, b) => a.priority - b.priority);
    // Sort non-resource users by priority descending
    nonResourceUsers.sort((a, b) => b.priority - a.priority);

    const lowestResUser  = resourceUsers[0];     // acquires lock first
    const highestResUser = resourceUsers[resourceUsers.length - 1]; // gets blocked
    const midUsers       = nonResourceUsers;     // can cause inversion

    // Also identify resource users in between
    const otherResUsers = resourceUsers.slice(1); // everyone except the lock holder

    // Track runtime state
    let lockHolder = null;
    let waitQueue  = [];
    let procState  = {};
    procs.forEach(p => { procState[p.id] = STATES.READY; });
    let completed  = new Set();
    let boostMap   = {};

    // Helper: find which non-completed, non-blocked process should run
    function pickRunner() {
        const candidates = procs
            .filter(p => !completed.has(p.id) && procState[p.id] !== STATES.BLOCKED)
            .sort((a, b) => {
                const aPri = boostMap[a.id] !== undefined ? boostMap[a.id] : a.priority;
                const bPri = boostMap[b.id] !== undefined ? boostMap[b.id] : b.priority;
                return bPri - aPri;
            });
        return candidates[0] || null;
    }

    function snap(icon, title, text, detail) {
        const stateMap = {};
        procs.forEach(p => { stateMap[p.id] = procState[p.id]; });
        steps.push({
            icon, title, text, detail,
            stateMap: { ...stateMap },
            lockState: lockHolder !== null,
            lockOwner: lockHolder ? procs.find(p => p.id === lockHolder)?.name : null,
            queue: waitQueue.map(id => procs.find(p => p.id === id)?.name),
            boosts: { ...boostMap },
        });
    }

    // === STEP 1: Lowest-priority resource user acquires lock ===
    lockHolder = lowestResUser.id;
    procState[lowestResUser.id] = STATES.RUNNING;
    procs.forEach(p => {
        if (p.id !== lowestResUser.id) procState[p.id] = STATES.READY;
    });
    snap(
        '🔒',
        `Step ${steps.length + 1} — ${lowestResUser.name} Acquires Lock`,
        `<strong>${lowestResUser.name}</strong> (priority ${lowestResUser.priority}) starts executing and acquires the shared resource lock.`,
        `The lock is now held by the lowest-priority process that needs it. Other processes are in READY state.`
    );

    // === STEP 2: Higher-priority resource users request lock → BLOCKED ===
    otherResUsers.forEach(p => {
        procState[p.id] = STATES.BLOCKED;
        waitQueue.push(p.id);
    });

    // If inheritance is enabled, boost the lock holder
    if (inherit && otherResUsers.length > 0) {
        const maxBlockedPri = Math.max(...otherResUsers.map(p => p.priority));
        boostMap[lowestResUser.id] = maxBlockedPri;
        procState[lowestResUser.id] = STATES.BOOSTED;
        snap(
            '⬆️',
            `Step ${steps.length + 1} — Higher-Priority Processes Blocked, ${lowestResUser.name} Boosted`,
            `${otherResUsers.map(p => `<strong>${p.name}</strong>`).join(', ')} request the resource but it's held by ${lowestResUser.name}. With <strong>Priority Inheritance</strong>, ${lowestResUser.name}'s priority is raised from ${lowestResUser.priority} → <strong>${maxBlockedPri}</strong>.`,
            `Priority Inheritance Protocol: The lock holder inherits the maximum priority of all blocked waiters. This prevents medium-priority processes from preempting ${lowestResUser.name}.`
        );
    } else if (otherResUsers.length > 0) {
        snap(
            '⛔',
            `Step ${steps.length + 1} — Higher-Priority Processes Blocked`,
            `${otherResUsers.map(p => `<strong>${p.name}</strong>`).join(', ')} request the resource but it's held by ${lowestResUser.name}. They become <strong>BLOCKED</strong>.`,
            `⚠️ This is the start of priority inversion! High-priority tasks are waiting because a lower-priority process holds the lock.`
        );
    }

    if (!inherit) {
        // === WITHOUT INHERITANCE: medium-priority non-resource users preempt ===
        midUsers.forEach(mp => {
            // Medium priority preempts the low-priority lock holder
            procState[lowestResUser.id] = STATES.READY;
            procState[mp.id] = STATES.RUNNING;
            snap(
                '🔄',
                `Step ${steps.length + 1} — ${mp.name} Preempts ${lowestResUser.name}`,
                `<strong>${mp.name}</strong> (priority ${mp.priority}) preempts ${lowestResUser.name} (priority ${lowestResUser.priority}). ${mp.name} doesn't need the lock, so it runs freely.`,
                `💥 Priority Inversion! ${highestResUser.name} (highest priority, ${highestResUser.priority}) is still BLOCKED while ${mp.name} (lower priority) runs. The effective priority ordering is inverted!`
            );

            // Medium finishes
            procState[mp.id] = STATES.COMPLETED;
            completed.add(mp.id);
            snap(
                '✔️',
                `Step ${steps.length + 1} — ${mp.name} Completes`,
                `<strong>${mp.name}</strong> finishes execution. ${highestResUser.name} has been waiting this entire time.`,
                `Each medium-priority process that runs extends the wait time for the blocked high-priority process. This is unbounded priority inversion.`
            );
        });

        // Lock holder resumes and finishes
        procState[lowestResUser.id] = STATES.RUNNING;
        snap(
            '🔓',
            `Step ${steps.length + 1} — ${lowestResUser.name} Resumes & Releases Lock`,
            `<strong>${lowestResUser.name}</strong> finally resumes, finishes its critical section, and releases the lock.`,
            `The lock is now free. Blocked processes in the wait queue can now compete for it.`
        );

        // Mark lock holder done
        procState[lowestResUser.id] = STATES.COMPLETED;
        completed.add(lowestResUser.id);
        lockHolder = null;
        waitQueue = [];

        // Blocked processes now run in priority order
        const blockedSorted = [...otherResUsers].sort((a, b) => b.priority - a.priority);
        blockedSorted.forEach((bp, i) => {
            lockHolder = bp.id;
            procState[bp.id] = STATES.RUNNING;
            // Unblock
            const isLast = i === blockedSorted.length - 1;
            snap(
                isLast ? '✅' : '🚀',
                `Step ${steps.length + 1} — ${bp.name} Acquires Lock & Runs`,
                `<strong>${bp.name}</strong> finally acquires the lock and runs.`,
                isLast
                    ? `✅ Simulation complete. Total wait for ${highestResUser.name}: ${steps.length - 1} steps. Without priority inheritance, the high-priority task suffered extended delays.`
                    : `${bp.name} was blocked since step 2. It can now proceed with its critical section.`
            );
            procState[bp.id] = STATES.COMPLETED;
            completed.add(bp.id);
            lockHolder = null;
        });

    } else {
        // === WITH INHERITANCE: lock holder runs at boosted priority ===
        // Lock holder continues (boosted, cannot be preempted by mid-priority)
        snap(
            '🛡️',
            `Step ${steps.length + 1} — ${lowestResUser.name} Runs with Inherited Priority`,
            `<strong>${lowestResUser.name}</strong> now has effective priority ${boostMap[lowestResUser.id]}. Medium-priority processes <strong>cannot preempt</strong> it.`,
            `This is the key benefit of priority inheritance — the lock holder finishes its critical section uninterrupted, minimizing wait time for high-priority processes.`
        );

        // Lock holder releases lock, priority restored
        procState[lowestResUser.id] = STATES.COMPLETED;
        completed.add(lowestResUser.id);
        delete boostMap[lowestResUser.id];
        lockHolder = null;
        waitQueue = [];

        // Unblock all resource waiters
        otherResUsers.forEach(p => { procState[p.id] = STATES.READY; });

        snap(
            '🔓',
            `Step ${steps.length + 1} — ${lowestResUser.name} Releases Lock, Priority Restored`,
            `<strong>${lowestResUser.name}</strong> finishes and releases the lock. Its priority returns to ${lowestResUser.priority}.`,
            `The lock is now available. Previously blocked processes are moved to READY state.`
        );

        // Now run in strict priority order: resource users first (they were blocked), then mid users
        const remaining = procs
            .filter(p => !completed.has(p.id))
            .sort((a, b) => b.priority - a.priority);

        remaining.forEach((rp, i) => {
            procs.forEach(p => {
                if (!completed.has(p.id)) {
                    procState[p.id] = p.id === rp.id ? STATES.RUNNING : STATES.READY;
                }
            });
            if (rp.needsResource) {
                lockHolder = rp.id;
            }

            const isLast = i === remaining.length - 1;
            snap(
                isLast ? '✅' : '🚀',
                `Step ${steps.length + 1} — ${rp.name} Runs`,
                `<strong>${rp.name}</strong> (priority ${rp.priority}) executes${rp.needsResource ? ' and acquires the lock' : ''}.`,
                isLast
                    ? `✅ Simulation complete! With priority inheritance, ${highestResUser.name} waited only ${steps.length - remaining.length} steps instead of being delayed by every medium-priority process.`
                    : `Correct priority order is maintained — higher priority tasks run first.`
            );
            procState[rp.id] = STATES.COMPLETED;
            completed.add(rp.id);
            if (rp.needsResource) lockHolder = null;
        });
    }

    return steps;
}

// ============================================================
//  SIMULATION CONTROLS
// ============================================================
function startSimulation() {
    // Compute steps from current config
    sim.steps = computeSteps();
    sim.step = 0;
    sim.running = true;
    sim.completed = false;

    // Rebuild visual cards and timeline
    renderProcessLane();
    clearGanttTracks();
    document.getElementById('comparisonPanel').style.display = 'none';

    // Button states
    document.getElementById('btnStart').disabled = true;
    document.getElementById('btnNext').disabled = false;
    document.getElementById('btnAuto').disabled = false;

    // Step counter
    document.getElementById('curStep').textContent = '0';
    document.getElementById('totalSteps').textContent = sim.steps.length;

    // Reset resource
    updateResourceHub(false, null, []);

    // Init explanation
    setExplanation(
        '🚀',
        'Simulation Started',
        `Click <strong>Next Step</strong> or <strong>Auto Play</strong> to advance. Mode: <strong>${sim.inheritanceEnabled ? 'Priority Inheritance ON' : 'No Inheritance'}</strong>.`,
        null
    );
}

function nextStep() {
    if (!sim.running || sim.step >= sim.steps.length) return;

    sim.step++;
    const step = sim.steps[sim.step - 1];

    const prevStepMap = sim.step === 1 
        ? Object.fromEntries(processConfig.map(p => [p.id, STATES.READY]))
        : sim.steps[sim.step - 2].stateMap;

    // Update process cards
    processConfig.forEach(p => {
        const oldSt = prevStepMap[p.id];
        const newSt = step.stateMap[p.id] || STATES.READY;

        // Check for micro-animations
        if (oldSt !== STATES.BLOCKED && newSt === STATES.BLOCKED) {
            shootParticle(p.id, true);
        } else if (oldSt !== STATES.RUNNING && newSt === STATES.RUNNING && p.needsResource) {
            shootParticle(p.id, false);
        }

        const boost = step.boosts[p.id] !== undefined ? step.boosts[p.id] : null;
        setCardState(p.id, newSt, boost);
    });

    // Update resource hub
    updateResourceHub(step.lockState, step.lockOwner, step.queue);

    // Update explanation
    setExplanation(step.icon, step.title, step.text, step.detail);

    // Update Gantt
    addGanttColumn(sim.step, step.stateMap);

    // Step counter
    document.getElementById('curStep').textContent = sim.step;

    // Check completion
    if (sim.step >= sim.steps.length) {
        finishSimulation();
    }
}

function finishSimulation() {
    sim.running = false;
    sim.completed = true;
    if (sim.autoPlay) toggleAutoPlay();

    document.getElementById('btnNext').disabled = true;
    document.getElementById('btnAuto').disabled = true;
    document.getElementById('btnStart').disabled = false;

    buildComparison();
    document.getElementById('comparisonPanel').style.display = 'block';
    setTimeout(() => {
        document.getElementById('comparisonPanel').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 250);
}

function resetSimulation() {
    if (sim.autoPlay) toggleAutoPlay();
    sim.step = 0;
    sim.running = false;
    sim.completed = false;
    sim.steps = [];

    renderAll();

    document.getElementById('btnStart').disabled = false;
    document.getElementById('btnNext').disabled = true;
    document.getElementById('btnAuto').disabled = true;
    document.getElementById('curStep').textContent = '0';
    document.getElementById('totalSteps').textContent = '0';
    document.getElementById('comparisonPanel').style.display = 'none';

    setExplanation(
        '💡',
        'Welcome',
        `Configure your processes on the left, then click <strong>Start</strong> to begin the simulation. Toggle <strong>Priority Inheritance</strong> to compare behavior.`,
        null
    );
    document.getElementById('explanationBox').classList.remove('active');
}

function toggleInheritance() {
    sim.inheritanceEnabled = !sim.inheritanceEnabled;
    const row = document.getElementById('inheritanceToggle');
    const badge = document.getElementById('toggleBadge');
    if (sim.inheritanceEnabled) {
        row.classList.add('active');
        badge.textContent = 'ON';
        badge.classList.remove('off');
        badge.classList.add('on');
    } else {
        row.classList.remove('active');
        badge.textContent = 'OFF';
        badge.classList.remove('on');
        badge.classList.add('off');
    }
    // Reset if mid-simulation
    if (sim.running || sim.completed) resetSimulation();
}

function toggleAutoPlay() {
    const btn = document.getElementById('btnAuto');
    if (sim.autoPlay) {
        clearInterval(sim.autoTimer);
        sim.autoPlay = false;
        btn.classList.remove('playing');
        btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg> Auto Play`;
    } else {
        sim.autoPlay = true;
        btn.classList.add('playing');
        btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg> Pause`;
        const delays = [2500, 2000, 1500, 1000, 600];
        sim.autoTimer = setInterval(() => {
            if (sim.step >= sim.steps.length) { finishSimulation(); return; }
            nextStep();
        }, delays[sim.speed - 1] || 1500);
    }
}

function updateSpeed(val) {
    sim.speed = parseInt(val);
    const labels = ['0.5×', '0.75×', '1×', '1.5×', '2×'];
    document.getElementById('speedLabel').textContent = labels[val - 1] || '1×';
    if (sim.autoPlay) {
        clearInterval(sim.autoTimer);
        const delays = [2500, 2000, 1500, 1000, 600];
        sim.autoTimer = setInterval(() => {
            if (sim.step >= sim.steps.length) { finishSimulation(); return; }
            nextStep();
        }, delays[sim.speed - 1] || 1500);
    }
}

// ============================================================
//  COMPARISON BUILDER
// ============================================================
function buildComparison() {
    // Run simulation both ways using current config
    const origInherit = sim.inheritanceEnabled;

    sim.inheritanceEnabled = false;
    const stepsWithout = computeSteps();

    sim.inheritanceEnabled = true;
    const stepsWith = computeSteps();

    sim.inheritanceEnabled = origInherit;

    renderCompTimeline('compWithout', stepsWithout);
    renderCompTimeline('compWith', stepsWith);
    renderCompStats('compStatsWithout', stepsWithout, false);
    renderCompStats('compStatsWith', stepsWith, true);
}

function renderCompTimeline(id, steps) {
    const container = document.getElementById(id);
    container.innerHTML = '';

    const stColors = {
        [STATES.RUNNING]:   { bg: 'rgba(34,211,238,.2)',  border: 'rgba(34,211,238,.45)', color: '#22d3ee' },
        [STATES.BLOCKED]:   { bg: 'rgba(248,113,113,.15)', border: 'rgba(248,113,113,.35)', color: '#f87171' },
        [STATES.READY]:     { bg: 'rgba(167,139,250,.1)',  border: 'rgba(167,139,250,.25)', color: '#a78bfa' },
        [STATES.COMPLETED]: { bg: 'rgba(52,211,153,.15)',  border: 'rgba(52,211,153,.35)', color: '#34d399' },
        [STATES.BOOSTED]:   { bg: 'rgba(251,191,36,.2)',   border: 'rgba(251,191,36,.45)', color: '#fbbf24' },
    };

    processConfig.forEach(p => {
        const row = document.createElement('div');
        row.className = 'ct-row';
        const label = document.createElement('span');
        label.className = 'ct-label';
        label.style.color = p.color;
        label.textContent = p.name;
        row.appendChild(label);

        const blocks = document.createElement('div');
        blocks.className = 'ct-blocks';
        steps.forEach((step, i) => {
            const st = step.stateMap[p.id] || STATES.READY;
            const c = stColors[st] || stColors[STATES.READY];
            const block = document.createElement('div');
            block.className = 'ct-block';
            block.style.background = c.bg;
            block.style.border = `1px solid ${c.border}`;
            block.style.color = c.color;
            block.textContent = `S${i + 1}`;
            blocks.appendChild(block);
        });
        row.appendChild(blocks);
        container.appendChild(row);
    });
}

function renderCompStats(id, steps, isGood) {
    const container = document.getElementById(id);
    container.innerHTML = '';

    // Find the highest-priority process that needs resource
    const resourceUsers = processConfig.filter(p => p.needsResource).sort((a, b) => b.priority - a.priority);
    const hp = resourceUsers[0];

    if (!hp) return;

    // Count how many steps HP was blocked
    let blockedSteps = 0;
    steps.forEach(step => {
        if (step.stateMap[hp.id] === STATES.BLOCKED) blockedSteps++;
    });

    // Execution order
    const order = [];
    const seen = new Set();
    steps.forEach(step => {
        processConfig.forEach(p => {
            if ((step.stateMap[p.id] === STATES.RUNNING || step.stateMap[p.id] === STATES.BOOSTED) && !seen.has(p.id)) {
                seen.add(p.id);
                const suffix = step.stateMap[p.id] === STATES.BOOSTED ? '(↑)' : '';
                order.push(p.name + suffix);
            }
        });
    });

    const cls = isGood ? 'cs-good' : 'cs-bad';

    container.innerHTML = `
        <div class="cs-row"><span class="cs-label">${hp.name} Wait (Blocked)</span><span class="cs-val ${cls}">${blockedSteps} step${blockedSteps !== 1 ? 's' : ''}</span></div>
        <div class="cs-row"><span class="cs-label">Total Steps</span><span class="cs-val">${steps.length}</span></div>
        <div class="cs-row"><span class="cs-label">Execution Order</span><span class="cs-val">${order.join(' → ')}</span></div>
        <div class="cs-row"><span class="cs-label">Priority Violation</span><span class="cs-val ${cls}">${isGood ? 'No ✅' : 'Yes ⚠️'}</span></div>
    `;
}

// ============================================================
//  BOOT
// ============================================================
document.addEventListener('DOMContentLoaded', init);
