# Priority Inversion & Priority Inheritance Visualizer

An interactive, GUI-based educational tool that demonstrates how **priority inversion** occurs in operating systems, how it causes problems in task scheduling, and how the **priority inheritance protocol** elegantly resolves it.

---

## 📖 Theoretical Concepts

### 1. What is Priority Inversion?
**Priority Inversion** is a problematic scheduling scenario in priority-based preemptive operating systems. It occurs when a high-priority process is indirectly preempted by a medium-priority process, effectively "inverting" the relative priorities of the two tasks. 

**How it happens (The Problem):**
Imagine three processes running on a system: 
* **P1 (High Priority)**
* **P2 (Medium Priority)**
* **P3 (Low Priority)**

There is also a shared resource (like a file, memory region, or hardware device) protected by a Mutex (Lock).
1. **P3 (Low)** gets to run first and safely acquires the lock for the shared resource.
2. **P1 (High)** arrives and also needs the shared resource. It requests the lock, but since **P3** has it, **P1** is placed in a **BLOCKED** state.
3. At this point, **P2 (Medium)** arrives. It doesn't need the shared resource, it just wants CPU time. 
4. Since **P2**'s priority is higher than **P3**, the OS scheduler preempts **P3** and allows **P2** to run.
5. **The Inversion Context:** Now, **P1 (High)** is stuck waiting for **P3 (Low)** to release the lock. But **P3** cannot run because **P2 (Medium)** is taking up the CPU. In effect, **P2** is delaying **P1**, even though **P1** has a higher priority and they do not even share a resource!
6. If there are many medium-priority processes, **P1** could be delayed indefinitely. This is known as **Unbounded Priority Inversion**.

*Real-world example: The Mars Pathfinder mission (1997) famously experienced frequent system resets due to a priority inversion bug occurring on Mars!*

### 2. What is Priority Inheritance?
**Priority Inheritance Protocol (PIP)** is a standard solution implemented by Operating Systems to solve the priority inversion problem.

**How it works (The Solution):**
1. The scenario starts the same: **P3 (Low)** acquires the lock, and **P1 (High)** gets blocked trying to acquire it.
2. Under Priority Inheritance, the OS detects this contention. It takes the blocked process's high priority (P1) and **temporarily donates/inherits** it to the lock holder (P3).
3. **P3**'s priority is magically "boosted" from Low to High.
4. Now, when **P2 (Medium)** arrives, the OS scheduler compares P2's Medium priority against P3's *new inherited High priority*. Since P3 is now considered High priority, **P2 cannot preempt it**.
5. **P3** safely finishes using the shared resource and releases the lock. 
6. The moment **P3** releases the lock, its priority is stripped back down to its original **Low** level.
7. **P1 (High)** immediately gets the lock and starts running. **P2 (Medium)** has to wait until P1 is done.
8. **The Result:** The proper priority execution order is restored!

---

## 🚀 Features

- **Dynamic Process Management** — Add/remove any number of processes with custom priority levels and unique names/colors.
- **Configurable Resource Needs** — Choose precisely which processes require the shared resource lock (mutex).
- **Step-by-Step Simulation** — Walk through each execution step; the engine calculates preemptions, lock states, wait queues, and priority boosting dynamically.
- **Detailed Step Explanations** — Every step features a descriptive explanation of what the OS scheduler is doing under the hood.
- **Auto Play Mode** — Watch the simulation run automatically with adjustable playback speeds.
- **Priority Inheritance Toggle** — Flip between showing the Unbounded Inversion flaw versus the Inheritance fix.
- **Gantt Timeline** — A dynamic Execution Timeline visualizes process states (Ready, Running, Blocked, Boosted, Done) across time ticks.
- **Side-by-Side Comparison Analytics** — Once the simulation finishes, evaluate wait times, step execution lengths, and see whether priority violations occurred.

## 📂 Project Structure

```
OS_innovative_2026/
├── index.html    # Core HTML structure, panel layouts, and timeline grids
├── style.css     # Premium UI/UX featuring dark theme, glassmorphism, pulse animations
├── script.js     # Standalone Vanilla JS scheduling engine calculating inversions & elevations
└── README.md     # Project documentation and theoretical concepts
```

## 🎯 How to Use

1. Open `index.html` in any modern web browser.
2. **Configure Processes** in the left sidebar configuration panel:
   - Adjust priority levels (larger numbers = higher priority).
   - Check the boxes to assign which processes need the shared resource lock.
   - Add extra processes if you want to test larger scheduling scenarios.
3. Use the toggle to turn **Priority Inheritance** ON or OFF to see different outcomes.
4. Click **Start**, then tap **Next Step** to manually walk through the scheduler's decisions. Alternatively, hit **Auto Play** to sit back and watch.
5. Pay attention to the **Explanation Panel** at the bottom — it translates the visual actions into OS theory concepts at every step.
6. Once the execution finishes, scroll down to review the **Comparison Analytics**.

## 🛠 Technologies
This project was built without heavy frameworks to ensure maximum performance and easy embedding:
- **HTML5** — Semantic layout and custom SVG icons.
- **CSS3** — Custom properties (variables), Flexbox/Grid layouts, and CSS Keyframes for smooth process card animations.
- **Vanilla JavaScript (ES6)** — Dynamic scheduling state machine, DOM manipulation without React/Vue.