# Priority Inversion & Priority Inheritance Visualizer

An interactive, GUI-based educational tool that demonstrates how **priority inversion** occurs in operating systems and how the **priority inheritance protocol** resolves it.

## 🚀 Features

- **Dynamic Process Management** — Add/remove any number of processes with custom priority levels
- **Configurable Resource Needs** — Choose which processes require the shared resource lock
- **Step-by-Step Simulation** — Walk through each scheduling decision with detailed explanations
- **Auto Play Mode** — Watch the simulation run automatically at adjustable speeds
- **Priority Inheritance Toggle** — Compare behavior with and without the inheritance protocol
- **Gantt Timeline** — Visual execution timeline showing process states over time
- **Side-by-Side Comparison** — After simulation, see a comparison of both scheduling modes
- **Fully Responsive** — Works on desktop and mobile screens

## 📂 Project Structure

```
OS_innovative_2026/
├── index.html    # Main page structure
├── style.css     # Complete styling (dark theme)
├── script.js     # Dynamic simulation engine
└── README.md     # This file
```

## 🎯 How to Use

1. Open `index.html` in any modern web browser
2. **Configure Processes** in the left sidebar:
   - Set priority values (higher = more important)
   - Check which processes need the shared resource
   - Add or remove processes as needed
3. Toggle **Priority Inheritance** ON or OFF
4. Click **Start** then use **Next Step** or **Auto Play**
5. Read the explanation panel to understand each step
6. After completion, review the comparison panel

## 📚 Concepts Demonstrated

| Concept | Description |
|---------|-------------|
| Priority Inversion | High-priority process blocked by low-priority lock holder while medium-priority processes run |
| Priority Inheritance | OS temporarily raises lock holder's priority to prevent inversion |
| Process States | READY, RUNNING, BLOCKED, COMPLETED |
| Resource Contention | Multiple processes competing for a shared mutex/lock |
| Preemptive Scheduling | Higher-priority processes preempt lower-priority ones |

## 🛠 Technologies

- **HTML5** — Semantic structure
- **CSS3** — Dark theme with animations, glassmorphism, responsive grid
- **Vanilla JavaScript** — Dynamic simulation engine, no frameworks needed