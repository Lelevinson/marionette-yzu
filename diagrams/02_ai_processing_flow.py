#!/usr/bin/env python3
"""
AI Processing Flow Diagram
Shows the step-by-step flow of how user input is processed through the AI system.
"""

import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch
import numpy as np

# Create figure with dark theme
fig, ax = plt.subplots(figsize=(14, 10), facecolor='black')
ax.set_facecolor('black')
ax.axis('off')

# Define colors
color_input = '#00ff88'
color_process = '#3b82f6'
color_tool = '#a855f7'
color_output = '#f59e0b'
color_loop = '#ef4444'

# Define boxes (x, y, width, height)
boxes = {
    # Input layer
    'voice': (1, 9, 2, 0.8),
    'text': (4, 9, 2, 0.8),
    
    # Processing layer
    'transcript': (2.5, 7.5, 3, 0.8),
    'chat_context': (2.5, 6.2, 3, 0.8),
    'system_prompt': (7, 6.2, 3, 0.8),
    'gemini': (2.5, 4.7, 3, 0.8),
    
    # Tool execution
    'parse': (2.5, 3.2, 3, 0.8),
    'tool_call': (2.5, 1.7, 3, 0.8),
    'tool_result': (7, 1.7, 3, 0.8),
    
    # Output layer
    'response': (2.5, 0.2, 3, 0.8),
    'tts': (7, 0.2, 3, 0.8),
}

# Draw boxes with colors
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
            ha='center', va='center', fontsize=10, 
            color='white', weight='bold')

# Input boxes
draw_box(ax, 'voice', color_input, 'Voice Input\n(Web Speech API)')
draw_box(ax, 'text', color_input, 'Text Input\n(Keyboard)')

# Processing boxes
draw_box(ax, 'transcript', color_process, 'Transcript\nGeneration')
draw_box(ax, 'chat_context', color_process, 'Chat Context\n(Add to History)')
draw_box(ax, 'system_prompt', color_process, 'System Prompt\n(Tools + Date)')
draw_box(ax, 'gemini', color_process, 'Gemini Nano\n(Streaming)')

# Tool execution boxes
draw_box(ax, 'parse', color_tool, 'Parse Response\n(Extract Tool Call)')
draw_box(ax, 'tool_call', color_tool, 'Execute Tool\n(Background Handler)')
draw_box(ax, 'tool_result', color_tool, 'Tool Result\n(JSON Response)')

# Output boxes
draw_box(ax, 'response', color_output, 'AI Response\n(Display Text)')
draw_box(ax, 'tts', color_output, 'Text-to-Speech\n(Audio Output)')

# Draw arrows
def draw_arrow(ax, start_key, end_key, label='', color='white', curved=False):
    x1, y1, w1, h1 = boxes[start_key]
    x2, y2, w2, h2 = boxes[end_key]
    
    start = (x1 + w1/2, y1)
    end = (x2 + w2/2, y2 + h2)
    
    if curved:
        arrow = FancyArrowPatch(
            start, end,
            arrowstyle='->', 
            connectionstyle="arc3,rad=0.3",
            color=color, 
            linewidth=2,
            mutation_scale=20
        )
    else:
        arrow = FancyArrowPatch(
            start, end,
            arrowstyle='->', 
            color=color, 
            linewidth=2,
            mutation_scale=20
        )
    ax.add_patch(arrow)
    
    if label:
        mid_x = (start[0] + end[0]) / 2
        mid_y = (start[1] + end[1]) / 2
        ax.text(mid_x + 0.3, mid_y, label, 
                fontsize=8, color=color, style='italic')

# Main flow arrows
draw_arrow(ax, 'voice', 'transcript', 'transcribe', color_input)
draw_arrow(ax, 'text', 'transcript', '', color_input)
draw_arrow(ax, 'transcript', 'chat_context', 'append', color_process)
draw_arrow(ax, 'chat_context', 'gemini', 'prompt', color_process)
draw_arrow(ax, 'gemini', 'parse', 'stream', color_process)
draw_arrow(ax, 'parse', 'tool_call', 'if tool call', color_tool)
draw_arrow(ax, 'parse', 'response', 'if text only', color_output, curved=True)
draw_arrow(ax, 'response', 'tts', 'speak', color_output)

# Tool execution flow
draw_arrow(ax, 'tool_call', 'tool_result', 'execute', color_tool)

# Loopback arrow (tool result back to context)
loopback_start = (boxes['tool_result'][0] + boxes['tool_result'][2]/2, 
                  boxes['tool_result'][1] + boxes['tool_result'][3])
loopback_end = (boxes['chat_context'][0] + boxes['chat_context'][2], 
                boxes['chat_context'][1] + boxes['chat_context'][3]/2)
arrow_loop = FancyArrowPatch(
    loopback_start, loopback_end,
    arrowstyle='->', 
    connectionstyle="arc3,rad=0.5",
    color=color_loop, 
    linewidth=2.5,
    mutation_scale=20,
    linestyle='--'
)
ax.add_patch(arrow_loop)
ax.text(9, 4, 'Loopback\n(Continue)', fontsize=9, color=color_loop, 
        weight='bold', ha='center')

# System prompt injection arrow
prompt_arrow = FancyArrowPatch(
    (boxes['system_prompt'][0], boxes['system_prompt'][1] + boxes['system_prompt'][3]/2),
    (boxes['gemini'][0] + boxes['gemini'][2], boxes['gemini'][1] + boxes['gemini'][3]/2),
    arrowstyle='->', 
    connectionstyle="arc3,rad=-0.3",
    color='#00ffff', 
    linewidth=2,
    mutation_scale=20,
    linestyle=':'
)
ax.add_patch(prompt_arrow)
ax.text(6.5, 5.7, 'inject', fontsize=8, color='#00ffff', style='italic')

# Add title
ax.text(5.5, 10.2, 'Marionette AI Processing Flow', 
        fontsize=20, color='white', weight='bold', ha='center')

# Add legend
legend_elements = [
    mpatches.Patch(color=color_input, label='User Input', alpha=0.3),
    mpatches.Patch(color=color_process, label='AI Processing', alpha=0.3),
    mpatches.Patch(color=color_tool, label='Tool Execution', alpha=0.3),
    mpatches.Patch(color=color_output, label='Output', alpha=0.3),
    mpatches.Patch(color=color_loop, label='Loopback', alpha=0.3)
]
ax.legend(handles=legend_elements, loc='upper right', 
          facecolor='black', edgecolor='white', 
          fontsize=9, labelcolor='white')

# Add annotations
ax.text(0.5, 5, 'Context Window:\n9,216 tokens', 
        fontsize=8, color='#666666', 
        bbox=dict(boxstyle='round', facecolor='black', edgecolor='#666666'))

ax.text(0.5, 2.5, 'Streaming:\n~1-3 sec', 
        fontsize=8, color='#666666',
        bbox=dict(boxstyle='round', facecolor='black', edgecolor='#666666'))

# Set limits and save
ax.set_xlim(0, 11)
ax.set_ylim(-0.5, 10.5)
plt.tight_layout()
plt.savefig('ai_processing_flow.png', dpi=300, facecolor='black', 
            bbox_inches='tight', pad_inches=0.3)
print("✅ AI processing flow diagram generated: ai_processing_flow.png")

