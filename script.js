/* ============================================================
   Priority Inversion & Inheritance Visualizer — Simulation Engine
   ============================================================ */

// ---- Process Data Model ----
const STATES = {
    READY: 'READY',
    RUNNING: 'RUNNING',
    BLOCKED: 'BLOCKED',
    COMPLETED: 'COMPLETED',
    BOOSTED: 'BOOSTED'       // visually distinct running-with-boost
};

let processes = {};
let resource = {};
let simulationState = {
    currentStep: 0,
    totalSteps: 6,
    isRunning: false,
    inheritanceEnabled: false,
    autoPlaying: false,
    autoPlayTimer: null,
    speed: 3,                // 1-5, maps to delay
    completed: false
};

function initProcesses() {
    processes = {
        P1: { id: 'P1', name: 'P1', priority: 3, originalPriority: 3, state: STATES.READY, label: 'High', needsResource: true },
        P2: { id: 'P2', name: 'P2', priority: 2, originalPriority: 2, state: STATES.READY, label: 'Medium', needsResource: false },
        P3: { id: 'P3', name: 'P3', priority: 1, originalPriority: 1, state: STATES.READY, label: 'Low', needsResource: true }
    };
    resource = {
        locked: false,
        owner: null,
        waitQueue: []
    };
}

// ---- Step Definitions ----
// Each step describes the system state change
function getSteps() {
    const inherit = simulationState.inheritanceEnabled;
    
    if (!inherit) {
        // WITHOUT Priority Inheritance (classic priority inversion)
        return [
            {
                title: 'Step 1 — P3 Acquires the Lock',
                text: 'Low-priority process <strong>P3</strong> starts executing and acquires the shared resource lock. At this point, the lock becomes unavailable to other processes.',
                detail: '🔒 In real OS scheduling, any process can acquire a mutex when it\'s free, regardless of priority. P3 happened to start first.',
                icon: '🔒',
                changes: {
                    P1: STATES.READY,
                    P2: STATES.READY,
                    P3: STATES.RUNNING,
                    lockOwner: 'P3',
                    lockState: true,
                    queue: []
                }
            },
            {
                title: 'Step 2 — P1 Requests Lock → BLOCKED',
                text: 'High-priority process <strong>P1</strong> arrives and needs the same resource. Since <strong>P3</strong> holds the lock, <strong>P1</strong> becomes <strong class="text-blocked">BLOCKED</strong> and enters the wait queue.',
                detail: '⚠️ This is the beginning of priority inversion! A high-priority task is blocked by a low-priority task holding the resource.',
                icon: '⛔',
                changes: {
                    P1: STATES.BLOCKED,
                    P2: STATES.READY,
                    P3: STATES.RUNNING,
                    lockOwner: 'P3',
                    lockState: true,
                    queue: ['P1']
                }
            },
            {
                title: 'Step 3 — P2 Preempts P3',
                text: 'Medium-priority process <strong>P2</strong> becomes ready. Since P2 has higher priority than P3 (and doesn\'t need the lock), the scheduler preempts P3 and runs <strong>P2</strong>.',
                detail: '🔄 This is the critical problem! P2 is running even though P1 (higher priority) is waiting. P3 can\'t finish to release the lock because P2 preempted it.',
                icon: '🔄',
                changes: {
                    P1: STATES.BLOCKED,
                    P2: STATES.RUNNING,
                    P3: STATES.READY,
                    lockOwner: 'P3',
                    lockState: true,
                    queue: ['P1']
                }
            },
            {
                title: 'Step 4 — P2 Continues Running',
                text: '<strong>P2</strong> continues executing. Meanwhile, <strong>P1</strong> (highest priority) remains blocked, and <strong>P3</strong> (holding the lock) is preempted. This is <strong>full priority inversion</strong>.',
                detail: '💥 The effective priority ordering is now P2 > P3 > P1, which is completely inverted! P1 waits indefinitely until P2 finishes.',
                icon: '💥',
                changes: {
                    P1: STATES.BLOCKED,
                    P2: STATES.RUNNING,
                    P3: STATES.READY,
                    lockOwner: 'P3',
                    lockState: true,
                    queue: ['P1']
                }
            },
            {
                title: 'Step 5 — P2 Finishes, P3 Resumes & Releases Lock',
                text: '<strong>P2</strong> completes execution. Now <strong>P3</strong> can finally resume, finish its critical section, and <strong>release the lock</strong>.',
                detail: '🔓 The lock is finally released. P1 has been waiting this entire time — a significant delay caused by priority inversion.',
                icon: '🔓',
                changes: {
                    P1: STATES.BLOCKED,
                    P2: STATES.COMPLETED,
                    P3: STATES.RUNNING,
                    lockOwner: 'P3',
                    lockState: true,
                    queue: ['P1']
                }
            },
            {
                title: 'Step 6 — P1 Finally Acquires Lock & Runs',
                text: '<strong>P3</strong> releases the resource. <strong>P1</strong> acquires the lock and finally runs. The simulation is complete, but P1 suffered unnecessary delay.',
                detail: '✅ Total delay for P1: 4 steps of waiting. Without priority inheritance, the high-priority task was delayed by both medium AND low-priority tasks.',
                icon: '✅',
                changes: {
                    P1: STATES.RUNNING,
                    P2: STATES.COMPLETED,
                    P3: STATES.COMPLETED,
                    lockOwner: 'P1',
                    lockState: true,
                    queue: []
                }
            }
        ];
    } else {
        // WITH Priority Inheritance
        return [
            {
                title: 'Step 1 — P3 Acquires the Lock',
                text: 'Low-priority process <strong>P3</strong> starts executing and acquires the shared resource lock. Same as before.',
                detail: '🔒 The lock is acquired normally. Priority inheritance hasn\'t been triggered yet.',
                icon: '🔒',
                changes: {
                    P1: STATES.READY,
                    P2: STATES.READY,
                    P3: STATES.RUNNING,
                    lockOwner: 'P3',
                    lockState: true,
                    queue: [],
                    P3Boosted: false
                }
            },
            {
                title: 'Step 2 — P1 Requests Lock → BLOCKED, P3 Gets Boosted',
                text: '<strong>P1</strong> requests the resource but it\'s held by P3. With <strong>priority inheritance</strong>, the OS detects this and <strong class="text-boosted">temporarily raises P3\'s priority</strong> to match P1\'s level.',
                detail: '⬆️ Priority Inheritance Protocol: P3\'s effective priority is boosted from 1 (Low) → 3 (High). This prevents medium-priority processes from preempting P3!',
                icon: '⬆️',
                changes: {
                    P1: STATES.BLOCKED,
                    P2: STATES.READY,
                    P3: STATES.BOOSTED,
                    lockOwner: 'P3',
                    lockState: true,
                    queue: ['P1'],
                    P3Boosted: true,
                    P3NewPriority: 3
                }
            },
            {
                title: 'Step 3 — P3 Runs with Inherited Priority',
                text: '<strong>P3</strong> now has effective priority 3 (same as P1). <strong>P2</strong> (priority 2) <em>cannot</em> preempt P3! P3 continues its critical section uninterrupted.',
                detail: '🛡️ This is the key difference! Without inheritance, P2 would have preempted P3 here. With inheritance, P3 finishes faster, which means P1 gets the resource sooner.',
                icon: '🛡️',
                changes: {
                    P1: STATES.BLOCKED,
                    P2: STATES.READY,
                    P3: STATES.BOOSTED,
                    lockOwner: 'P3',
                    lockState: true,
                    queue: ['P1'],
                    P3Boosted: true,
                    P3NewPriority: 3
                }
            },
            {
                title: 'Step 4 — P3 Releases Lock, Priority Restored',
                text: '<strong>P3</strong> finishes its critical section and releases the lock. Its priority is <strong>restored back to 1</strong>. The lock is now available for P1.',
                detail: '🔓 Once P3 releases the mutex, its inherited priority is revoked and returns to original. The resource is transferred to P1 from the wait queue.',
                icon: '🔓',
                changes: {
                    P1: STATES.READY,
                    P2: STATES.READY,
                    P3: STATES.COMPLETED,
                    lockOwner: null,
                    lockState: false,
                    queue: [],
                    P3Boosted: false
                }
            },
            {
                title: 'Step 5 — P1 Acquires Lock & Runs',
                text: '<strong>P1</strong> immediately acquires the lock and runs. Since P1 has the highest priority, it executes before P2.',
                detail: '🚀 P1 waited only 2 steps instead of 4! Priority inheritance ensured that the high-priority task was served as quickly as possible.',
                icon: '🚀',
                changes: {
                    P1: STATES.RUNNING,
                    P2: STATES.READY,
                    P3: STATES.COMPLETED,
                    lockOwner: 'P1',
                    lockState: true,
                    queue: [],
                    P3Boosted: false
                }
            },
            {
                title: 'Step 6 — P1 Completes, P2 Runs Last',
                text: '<strong>P1</strong> finishes and releases the lock. <strong>P2</strong> finally runs. The correct priority order is maintained: P1 → P3(boosted) → P2.',
                detail: '✅ Total delay for P1: only 2 steps! Priority inheritance prevented the unbounded priority inversion problem.',
                icon: '✅',
                changes: {
                    P1: STATES.COMPLETED,
                    P2: STATES.RUNNING,
                    P3: STATES.COMPLETED,
                    lockOwner: null,
                    lockState: false,
                    queue: [],
                    P3Boosted: false
                }
            }
        ];
    }
}

// ---- Timeline History ----
let timelineHistory = []; // array of step snapshots for timeline rendering

// ============================================================
//  UI UPDATE FUNCTIONS
// ============================================================

function updateProcessCard(pid, state, extraClass) {
    const card = document.getElementById(`process${pid}`);
    const dot  = document.getElementById(`state${pid}Dot`);
    const text = document.getElementById(`state${pid}`);
    
    // Remove all state classes
    card.classList.remove('running', 'blocked', 'completed', 'boosted');
    dot.classList.remove('running', 'blocked', 'completed', 'boosted', 'ready');
    
    let stateDisplay = state;
    
    switch (state) {
        case STATES.RUNNING:
            card.classList.add('running');
            dot.classList.add('running');
            break;
        case STATES.BLOCKED:
            card.classList.add('blocked');
            dot.classList.add('blocked');
            break;
        case STATES.COMPLETED:
            card.classList.add('completed');
            dot.classList.add('completed');
            break;
        case STATES.BOOSTED:
            card.classList.add('boosted');
            dot.classList.add('boosted');
            stateDisplay = 'RUNNING ⬆️';
            break;
        default:
            dot.classList.add('ready');
            break;
    }
    
    text.textContent = stateDisplay;
    
    // Add transition animation
    card.classList.add('step-transition');
    setTimeout(() => card.classList.remove('step-transition'), 600);
}

function updateResourceUI(lockState, owner, queue) {
    const card     = document.getElementById('resourceCard');
    const label    = document.getElementById('lockLabel');
    const ownerEl  = document.getElementById('lockOwner');
    const queueEl  = document.getElementById('queueItems');
    const shackle  = document.getElementById('lockShackle');
    
    card.classList.remove('locked', 'unlocked');
    
    if (lockState) {
        card.classList.add('locked');
        label.textContent = 'LOCKED';
        ownerEl.textContent = `Held by ${owner}`;
        shackle.setAttribute('d', 'M20 30V22a12 12 0 0 1 24 0v8');
    } else {
        card.classList.add('unlocked');
        label.textContent = 'UNLOCKED';
        ownerEl.textContent = 'No owner';
        // Open shackle
        shackle.setAttribute('d', 'M20 30V22a12 12 0 0 1 24 0v2');
    }
    
    if (queue.length > 0) {
        queueEl.innerHTML = queue.map(p => `<span class="queue-tag">${p}</span>`).join(' ');
    } else {
        queueEl.textContent = 'Empty';
    }
}

function updatePriorityDisplay(pid, priority, isBoosted) {
    const el = document.getElementById(`priority${pid}`);
    if (!el) return;
    
    if (isBoosted) {
        el.textContent = `${priority} (Boosted!)`;
        el.classList.add('boosted');
    } else {
        const labels = { P1: '3 (Highest)', P2: '2', P3: '1 (Lowest)' };
        el.textContent = labels[pid] || priority;
        el.classList.remove('boosted');
    }
}

function updateExplanation(step) {
    const numEl    = document.getElementById('stepNumber');
    const titleEl  = document.getElementById('explanationTitle');
    const textEl   = document.getElementById('explanationText');
    const detailEl = document.getElementById('explanationDetail');
    const card     = document.getElementById('explanationCard');
    
    numEl.textContent = simulationState.currentStep;
    titleEl.textContent = step.title;
    textEl.innerHTML = step.text;
    detailEl.innerHTML = `<div class="detail-icon">${step.icon || '💡'}</div><p>${step.detail}</p>`;
    
    card.classList.add('active');
    
    // Re-trigger animation
    detailEl.style.animation = 'none';
    detailEl.offsetHeight; // reflow
    detailEl.style.animation = '';
}

// ---- Timeline Rendering ----
function addTimelineBlock(stepIndex, stepData) {
    const tracks = { P1: 'trackP1', P2: 'trackP2', P3: 'trackP3' };
    
    for (const pid of ['P1', 'P2', 'P3']) {
        const track = document.getElementById(tracks[pid]);
        const block = document.createElement('div');
        block.className = 'timeline-block';
        
        const state = stepData.changes[pid];
        
        switch (state) {
            case STATES.RUNNING:
                block.classList.add('block-running');
                block.textContent = `S${stepIndex}`;
                break;
            case STATES.BLOCKED:
                block.classList.add('block-blocked');
                block.textContent = `S${stepIndex}`;
                break;
            case STATES.READY:
                block.classList.add('block-ready');
                block.textContent = `S${stepIndex}`;
                break;
            case STATES.COMPLETED:
                block.classList.add('block-completed');
                block.textContent = `S${stepIndex}`;
                break;
            case STATES.BOOSTED:
                block.classList.add('block-boosted');
                block.textContent = `S${stepIndex}`;
                break;
            default:
                block.classList.add('block-idle');
                block.textContent = '-';
        }
        
        track.appendChild(block);
    }
}

function clearTimeline() {
    ['trackP1', 'trackP2', 'trackP3'].forEach(id => {
        document.getElementById(id).innerHTML = '';
    });
}

// ============================================================
//  SIMULATION CONTROL
// ============================================================

function startSimulation() {
    initProcesses();
    clearTimeline();
    timelineHistory = [];
    simulationState.currentStep = 0;
    simulationState.isRunning = true;
    simulationState.completed = false;
    
    // Hide comparison
    document.getElementById('comparisonSection').style.display = 'none';
    
    // Update button states
    document.getElementById('btnStart').disabled = true;
    document.getElementById('btnNext').disabled = false;
    document.getElementById('btnAuto').disabled = false;
    
    // Reset process cards to initial
    ['P1', 'P2', 'P3'].forEach(pid => {
        updateProcessCard(pid, STATES.READY);
        updatePriorityDisplay(pid, processes[pid].priority, false);
    });
    updateResourceUI(false, null, []);
    
    // Reset explanation
    const numEl    = document.getElementById('stepNumber');
    const totalEl  = document.getElementById('stepTotal');
    const titleEl  = document.getElementById('explanationTitle');
    const textEl   = document.getElementById('explanationText');
    const detailEl = document.getElementById('explanationDetail');
    const card     = document.getElementById('explanationCard');
    
    numEl.textContent = '0';
    totalEl.textContent = `/ ${getSteps().length}`;
    titleEl.textContent = 'Simulation Started';
    textEl.innerHTML = 'Click <strong>"Next Step"</strong> or <strong>"Auto Play"</strong> to advance through the simulation. Each step shows what happens in the process scheduler.';
    detailEl.innerHTML = `<div class="detail-icon">🚀</div><p>Mode: <strong>${simulationState.inheritanceEnabled ? 'Priority Inheritance Enabled' : 'No Priority Inheritance'}</strong></p>`;
    card.classList.remove('active');
}

function nextStep() {
    if (!simulationState.isRunning) return;
    
    const steps = getSteps();
    if (simulationState.currentStep >= steps.length) {
        finishSimulation();
        return;
    }
    
    simulationState.currentStep++;
    const step = steps[simulationState.currentStep - 1];
    
    // Apply changes
    const changes = step.changes;
    
    // Update process states
    for (const pid of ['P1', 'P2', 'P3']) {
        const state = changes[pid];
        processes[pid].state = state;
        updateProcessCard(pid, state);
    }
    
    // Handle boosted priority display
    if (changes.P3Boosted) {
        updatePriorityDisplay('P3', changes.P3NewPriority, true);
    } else {
        updatePriorityDisplay('P3', processes.P3.originalPriority, false);
    }
    
    // Update resource
    updateResourceUI(changes.lockState, changes.lockOwner, changes.queue);
    
    // Update explanation
    updateExplanation(step);
    
    // Add to timeline
    addTimelineBlock(simulationState.currentStep, step);
    timelineHistory.push(step);
    
    // Check if finished
    if (simulationState.currentStep >= steps.length) {
        finishSimulation();
    }
}

function finishSimulation() {
    simulationState.isRunning = false;
    simulationState.completed = true;
    
    // Stop auto play
    if (simulationState.autoPlaying) {
        toggleAutoPlay();
    }
    
    document.getElementById('btnNext').disabled = true;
    document.getElementById('btnAuto').disabled = true;
    document.getElementById('btnStart').disabled = false;
    
    // Show comparison section
    buildComparison();
    document.getElementById('comparisonSection').style.display = 'block';
    
    // Scroll to comparison
    setTimeout(() => {
        document.getElementById('comparisonSection').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 300);
}

function resetSimulation() {
    // Stop auto play
    if (simulationState.autoPlaying) {
        toggleAutoPlay();
    }
    
    initProcesses();
    clearTimeline();
    timelineHistory = [];
    simulationState.currentStep = 0;
    simulationState.isRunning = false;
    simulationState.completed = false;
    
    // Reset UI
    ['P1', 'P2', 'P3'].forEach(pid => {
        updateProcessCard(pid, STATES.READY);
        updatePriorityDisplay(pid, processes[pid].priority, false);
    });
    updateResourceUI(false, null, []);
    
    // Reset explanation
    document.getElementById('stepNumber').textContent = '0';
    document.getElementById('stepTotal').textContent = '/ 6';
    document.getElementById('explanationTitle').textContent = 'Welcome';
    document.getElementById('explanationText').innerHTML = 'Click <strong>"Start Simulation"</strong> to begin the visualization. Toggle <strong>Priority Inheritance</strong> to see how the OS resolves priority inversion.';
    document.getElementById('explanationDetail').innerHTML = '<div class="detail-icon">💡</div><p>Priority inversion occurs when a high-priority process is indirectly preempted by a lower-priority process, causing unexpected delays.</p>';
    document.getElementById('explanationCard').classList.remove('active');
    
    // Reset buttons
    document.getElementById('btnStart').disabled = false;
    document.getElementById('btnNext').disabled = true;
    document.getElementById('btnAuto').disabled = true;
    
    // Hide comparison
    document.getElementById('comparisonSection').style.display = 'none';
}

function toggleInheritance() {
    const toggle = document.getElementById('inheritanceToggle');
    const status = document.getElementById('toggleStatus');
    
    simulationState.inheritanceEnabled = !simulationState.inheritanceEnabled;
    
    if (simulationState.inheritanceEnabled) {
        toggle.classList.add('active');
        status.textContent = 'ON';
    } else {
        toggle.classList.remove('active');
        status.textContent = 'OFF';
    }
    
    // If simulation is running, reset it
    if (simulationState.isRunning || simulationState.completed) {
        resetSimulation();
    }
}

function toggleAutoPlay() {
    const btn = document.getElementById('btnAuto');
    
    if (simulationState.autoPlaying) {
        // Stop
        clearInterval(simulationState.autoPlayTimer);
        simulationState.autoPlaying = false;
        btn.classList.remove('active');
        btn.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polygon points="5,3 19,12 5,21"/>
                <line x1="19" y1="3" x2="19" y2="21"/>
            </svg>
            Auto Play
        `;
    } else {
        // Start
        simulationState.autoPlaying = true;
        btn.classList.add('active');
        btn.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="6" y="4" width="4" height="16"/>
                <rect x="14" y="4" width="4" height="16"/>
            </svg>
            Pause
        `;
        
        const delays = [2500, 2000, 1500, 1000, 600];
        const delay = delays[simulationState.speed - 1] || 1500;
        
        simulationState.autoPlayTimer = setInterval(() => {
            if (simulationState.currentStep >= getSteps().length) {
                finishSimulation();
                return;
            }
            nextStep();
        }, delay);
    }
}

function updateSpeed(val) {
    simulationState.speed = parseInt(val);
    const labels = ['0.5x', '0.75x', '1x', '1.5x', '2x'];
    document.getElementById('speedLabel').textContent = labels[val - 1] || '1x';
    
    // Restart auto play with new speed if active
    if (simulationState.autoPlaying) {
        clearInterval(simulationState.autoPlayTimer);
        const delays = [2500, 2000, 1500, 1000, 600];
        const delay = delays[simulationState.speed - 1] || 1500;
        simulationState.autoPlayTimer = setInterval(() => {
            if (simulationState.currentStep >= getSteps().length) {
                finishSimulation();
                return;
            }
            nextStep();
        }, delay);
    }
}

// ============================================================
//  COMPARISON BUILDER
// ============================================================

function buildComparison() {
    buildCompTimeline('compTimelineWithout', false);
    buildCompTimeline('compTimelineWith', true);
}

function buildCompTimeline(containerId, withInheritance) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';
    
    // Define the step states for each scenario
    let scenarios;
    if (!withInheritance) {
        scenarios = {
            P1: ['READY', 'BLOCKED', 'BLOCKED', 'BLOCKED', 'BLOCKED', 'RUNNING'],
            P2: ['READY', 'READY',   'RUNNING', 'RUNNING', 'COMPLETED', 'COMPLETED'],
            P3: ['RUNNING','RUNNING', 'READY',  'READY',   'RUNNING',   'COMPLETED']
        };
    } else {
        scenarios = {
            P1: ['READY', 'BLOCKED', 'BLOCKED', 'READY',  'RUNNING',   'COMPLETED'],
            P2: ['READY', 'READY',   'READY',   'READY',  'READY',     'RUNNING'],
            P3: ['RUNNING','BOOSTED','BOOSTED', 'COMPLETED','COMPLETED','COMPLETED']
        };
    }
    
    const colors = {
        'RUNNING':   { bg: 'rgba(34,211,238,0.25)', border: 'rgba(34,211,238,0.5)', color: '#22d3ee' },
        'BLOCKED':   { bg: 'rgba(248,113,113,0.2)', border: 'rgba(248,113,113,0.4)', color: '#f87171' },
        'READY':     { bg: 'rgba(167,139,250,0.15)', border: 'rgba(167,139,250,0.3)', color: '#a78bfa' },
        'COMPLETED': { bg: 'rgba(52,211,153,0.2)', border: 'rgba(52,211,153,0.4)', color: '#34d399' },
        'BOOSTED':   { bg: 'rgba(251,191,36,0.25)', border: 'rgba(251,191,36,0.5)', color: '#fbbf24' }
    };
    
    const labelColors = { P1: '#f472b6', P2: '#fbbf24', P3: '#34d399' };
    
    for (const pid of ['P1', 'P2', 'P3']) {
        const row = document.createElement('div');
        row.className = 'comp-row';
        
        const label = document.createElement('span');
        label.className = 'comp-label';
        label.textContent = pid;
        label.style.color = labelColors[pid];
        row.appendChild(label);
        
        const blocks = document.createElement('div');
        blocks.className = 'comp-blocks';
        
        scenarios[pid].forEach((state, i) => {
            const block = document.createElement('div');
            block.className = 'comp-block';
            const c = colors[state];
            block.style.background = c.bg;
            block.style.border = `1px solid ${c.border}`;
            block.style.color = c.color;
            block.textContent = `S${i + 1}`;
            blocks.appendChild(block);
        });
        
        row.appendChild(blocks);
        container.appendChild(row);
    }
}

// ============================================================
//  BACKGROUND PARTICLES
// ============================================================

function createParticles() {
    const container = document.getElementById('bgParticles');
    const colors = ['rgba(96,165,250,0.15)', 'rgba(167,139,250,0.12)', 'rgba(244,114,182,0.1)', 'rgba(34,211,238,0.1)'];
    
    for (let i = 0; i < 30; i++) {
        const particle = document.createElement('div');
        particle.classList.add('particle');
        
        const size = Math.random() * 4 + 2;
        particle.style.width = size + 'px';
        particle.style.height = size + 'px';
        particle.style.left = Math.random() * 100 + '%';
        particle.style.background = colors[Math.floor(Math.random() * colors.length)];
        particle.style.animationDuration = (Math.random() * 15 + 10) + 's';
        particle.style.animationDelay = (Math.random() * 10) + 's';
        
        container.appendChild(particle);
    }
}

// ============================================================
//  INITIALIZATION
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
    initProcesses();
    createParticles();
    
    // Set initial button states
    document.getElementById('btnNext').disabled = true;
    document.getElementById('btnAuto').disabled = true;
});
