#!/usr/bin/env python3
"""
Playbook System Diagram
Shows how playbooks guide multi-step workflows.
"""

import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch, Rectangle
import numpy as np

# Create figure
fig, ax = plt.subplots(figsize=(16, 10), facecolor='black')
ax.set_facecolor('black')
ax.axis('off')

# Colors
color_user = '#00ff88'
color_playbook = '#3b82f6'
color_step = '#a855f7'
color_tool = '#f59e0b'

# Main flow positions
boxes = {
    'user_request': (1, 8.5, 3, 0.8),
    'ai_analyze': (1, 7, 3, 0.8),
    'get_playbook': (1, 5.5, 3, 0.8),
    'playbook_loaded': (1, 4, 3, 0.8),
    'read_steps': (1, 2.5, 3, 0.8),
    'execute_loop': (1, 1, 3, 0.8),
}

def draw_box(ax, key, color, label):
    x, y, w, h = boxes[key]
    box = FancyBboxPatch(
        (x, y), w, h,
        boxstyle="round,pad=0.05",
        facecolor=color,
        edgecolor='white',
        linewidth=2,
        alpha=0.3
    )
    ax.add_patch(box)
    ax.text(x + w/2, y + h/2, label, 
            ha='center', va='center', fontsize=9, 
            color='white', weight='bold')

def draw_arrow(ax, start_key, end_key, label='', color='white'):
    x1, y1, w1, h1 = boxes[start_key]
    x2, y2, w2, h2 = boxes[end_key]
    
    start = (x1 + w1/2, y1)
    end = (x2 + w2/2, y2 + h2)
    
    arrow = FancyArrowPatch(
        start, end,
        arrowstyle='->', 
        color=color, 
        linewidth=2.5,
        mutation_scale=20
    )
    ax.add_patch(arrow)
    
    if label:
        mid_x = (start[0] + end[0]) / 2
        mid_y = (start[1] + end[1]) / 2
        ax.text(mid_x - 1, mid_y, label, 
                fontsize=8, color=color, style='italic')

# Main flow
draw_box(ax, 'user_request', color_user, 'User: "Search\nfor weather"')
draw_box(ax, 'ai_analyze', color_playbook, 'AI: Analyze\nRequest')
draw_box(ax, 'get_playbook', color_playbook, 'getPlaybook(\n"google-search")')
draw_box(ax, 'playbook_loaded', color_playbook, 'Playbook\nLoaded')
draw_box(ax, 'read_steps', color_step, 'Read Step-by-Step\nInstructions')
draw_box(ax, 'execute_loop', color_step, 'Execute Each Step\n(Wait for Result)')

# Flow arrows
draw_arrow(ax, 'user_request', 'ai_analyze', 'input', color_user)
draw_arrow(ax, 'ai_analyze', 'get_playbook', 'complex task', color_playbook)
draw_arrow(ax, 'get_playbook', 'playbook_loaded', 'return', color_playbook)
draw_arrow(ax, 'playbook_loaded', 'read_steps', 'parse', color_step)
draw_arrow(ax, 'read_steps', 'execute_loop', 'start', color_step)

# Playbook example (center-right)
playbook_x = 6
playbook_y = 7
playbook_w = 9
playbook_h = 6

# Playbook box
playbook_box = FancyBboxPatch(
    (playbook_x, playbook_y), playbook_w, playbook_h,
    boxstyle="round,pad=0.1",
    facecolor='#1a1a1a',
    edgecolor='#3b82f6',
    linewidth=3,
    alpha=0.5
)
ax.add_patch(playbook_box)

ax.text(playbook_x + playbook_w/2, playbook_y + playbook_h - 0.3, 
        'Google Search Playbook', 
        fontsize=12, color='#3b82f6', weight='bold', ha='center')

# Steps
steps = [
    ('Step 1:', 'openTab("https://google.com")', '#00ff88'),
    ('Step 2:', 'findElements("Search")', '#00ff88'),
    ('Step 3:', 'fillInput(index, "weather")', '#00ff88'),
    ('Step 4:', 'findElements("Google Search")', '#00ff88'),
    ('Step 5:', 'clickElement(index)', '#00ff88'),
    ('Step 6:', 'captureScreenshot()', '#00ff88'),
    ('Step 7:', 'Describe results → STOP', '#f59e0b'),
]

step_y = playbook_y + playbook_h - 1
for label, desc, color in steps:
    ax.text(playbook_x + 0.3, step_y, label, 
            fontsize=9, color='white', weight='bold')
    ax.text(playbook_x + 1.5, step_y, desc, 
            fontsize=9, color=color, family='monospace')
    step_y -= 0.6

# Important notes
ax.text(playbook_x + 0.3, step_y - 0.3, 'IMPORTANT:', 
        fontsize=8, color='#ef4444', weight='bold')
ax.text(playbook_x + 0.3, step_y - 0.6, '• Execute ONE step at a time', 
        fontsize=7, color='#999999')
ax.text(playbook_x + 0.3, step_y - 0.9, '• Wait for [TOOL RESULT] after each', 
        fontsize=7, color='#999999')
ax.text(playbook_x + 0.3, step_y - 1.2, '• Use ACTUAL index from results', 
        fontsize=7, color='#999999')

# Execution loop visualization (bottom)
loop_y = 2
loop_width = 14
loop_x = 1

# Loop container
loop_box = Rectangle(
    (loop_x, loop_y - 1.5), loop_width, 2.3,
    facecolor='#1a1a1a',
    edgecolor='#a855f7',
    linewidth=2,
    alpha=0.3
)
ax.add_patch(loop_box)

ax.text(loop_x + loop_width/2, loop_y + 0.6, 
        'Execution Loop', 
        fontsize=11, color='#a855f7', weight='bold', ha='center')

# Loop steps
loop_steps_x = [loop_x + 1, loop_x + 4, loop_x + 7, loop_x + 10, loop_x + 13]
loop_step_labels = ['Step N', 'Call Tool', 'Wait', 'Result', 'Step N+1']
loop_step_colors = [color_step, color_tool, '#666666', color_tool, color_step]

for i, (x, label, color) in enumerate(zip(loop_steps_x, loop_step_labels, loop_step_colors)):
    # Draw circle
    circle = plt.Circle((x, loop_y), 0.3, color=color, alpha=0.5, ec='white', linewidth=2)
    ax.add_patch(circle)
    ax.text(x, loop_y, str(i+1), ha='center', va='center', 
            fontsize=10, color='white', weight='bold')
    ax.text(x, loop_y - 0.6, label, ha='center', va='center', 
            fontsize=8, color=color)
    
    # Arrow to next
    if i < len(loop_steps_x) - 1:
        arrow = FancyArrowPatch(
            (x + 0.3, loop_y), (loop_steps_x[i+1] - 0.3, loop_y),
            arrowstyle='->', color='white', linewidth=2, mutation_scale=15
        )
        ax.add_patch(arrow)

# Loopback arrow
loopback = FancyArrowPatch(
    (loop_steps_x[-1], loop_y - 0.4),
    (loop_steps_x[0], loop_y - 0.4),
    arrowstyle='->', 
    connectionstyle="arc3,rad=0.3",
    color='#ef4444', 
    linewidth=2,
    mutation_scale=15,
    linestyle='--'
)
ax.add_patch(loopback)
ax.text(loop_x + loop_width/2, loop_y - 1.1, 'Repeat until STOP', 
        fontsize=8, color='#ef4444', ha='center', style='italic')

# Available playbooks list (left bottom)
avail_x = 0.5
avail_y = 0.3
ax.text(avail_x, avail_y, 'Available Playbooks:', 
        fontsize=10, color='white', weight='bold')
playbooks = [
    ('google-search', 'Google search workflow'),
    ('send-email', 'Gmail email automation'),
    ('(custom)', 'Add your own playbook')
]
for i, (id, desc) in enumerate(playbooks):
    ax.text(avail_x + 0.1, avail_y - (i+1)*0.25, f'• {id}', 
            fontsize=8, color='#3b82f6', family='monospace')
    ax.text(avail_x + 2.5, avail_y - (i+1)*0.25, f'{desc}', 
            fontsize=8, color='#666666', style='italic')

# Connection from execute loop to playbook
connection = FancyArrowPatch(
    (boxes['execute_loop'][0] + boxes['execute_loop'][2], 
     boxes['execute_loop'][1] + boxes['execute_loop'][3]/2),
    (playbook_x, playbook_y + playbook_h/2),
    arrowstyle='<->', 
    connectionstyle="arc3,rad=0.2",
    color='#00ffff', 
    linewidth=2,
    mutation_scale=20,
    linestyle=':'
)
ax.add_patch(connection)
ax.text(4.5, 4, 'follows', fontsize=8, color='#00ffff', style='italic')

# Title
ax.text(8, 9.5, 'Playbook System Workflow', 
        fontsize=20, color='white', weight='bold', ha='center')

# Benefits box
benefits_x = 11.5
benefits_y = 3.5
ax.text(benefits_x, benefits_y + 0.5, 'Benefits:', 
        fontsize=10, color='white', weight='bold')
benefits = [
    '✓ Reusable workflows',
    '✓ Step-by-step guidance',
    '✓ Error handling',
    '✓ Easy to customize'
]
for i, benefit in enumerate(benefits):
    ax.text(benefits_x, benefits_y - i*0.25, benefit, 
            fontsize=8, color='#00ff88')

# Legend
legend_elements = [
    mpatches.Patch(color=color_user, label='User Input', alpha=0.3),
    mpatches.Patch(color=color_playbook, label='Playbook Loading', alpha=0.3),
    mpatches.Patch(color=color_step, label='Step Execution', alpha=0.3),
    mpatches.Patch(color=color_tool, label='Tool Call', alpha=0.3)
]
ax.legend(handles=legend_elements, loc='upper left', 
          facecolor='black', edgecolor='white', 
          fontsize=9, labelcolor='white')

# Set limits
ax.set_xlim(0, 16)
ax.set_ylim(-0.5, 10)
plt.tight_layout()
plt.savefig('playbook_system.png', dpi=300, facecolor='black', 
            bbox_inches='tight', pad_inches=0.3)
print("✅ Playbook system diagram generated: playbook_system.png")

