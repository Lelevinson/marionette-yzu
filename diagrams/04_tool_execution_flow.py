#!/usr/bin/env python3
"""
Tool Execution Flow Diagram
Shows how tools are discovered, called, and executed in the system.
"""

import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch, Rectangle
import numpy as np

# Create figure
fig, ax = plt.subplots(figsize=(14, 12), facecolor='black')
ax.set_facecolor('black')
ax.axis('off')

# Colors
color_ai = '#00ff88'
color_parse = '#3b82f6'
color_execute = '#a855f7'
color_result = '#f59e0b'

# Define positions
boxes = {
    # AI response
    'ai_response': (5, 10.5, 4, 0.8),
    
    # Parsing
    'check_format': (5, 9, 4, 0.8),
    'extract_function': (2, 7.5, 3, 0.8),
    'extract_args': (7, 7.5, 3, 0.8),
    
    # Tool registry
    'tool_registry': (1, 6, 4, 1),
    
    # Validation
    'validate': (5, 5.5, 4, 0.8),
    
    # Background message
    'send_message': (5, 4, 4, 0.8),
    
    # Handler execution
    'handler': (5, 2.5, 4, 0.8),
    
    # Results
    'success': (2, 1, 3, 0.8),
    'error': (7, 1, 3, 0.8),
    
    # Loopback
    'format_result': (5, 0.2, 4, 0.6),
}

def draw_box(ax, key, color, label, border_width=2):
    x, y, w, h = boxes[key]
    box = FancyBboxPatch(
        (x, y), w, h,
        boxstyle="round,pad=0.05",
        facecolor=color,
        edgecolor='white',
        linewidth=border_width,
        alpha=0.3
    )
    ax.add_patch(box)
    ax.text(x + w/2, y + h/2, label, 
            ha='center', va='center', fontsize=10, 
            color='white', weight='bold')

def draw_arrow(ax, start_key, end_key, label='', color='white', style='-'):
    x1, y1, w1, h1 = boxes[start_key]
    x2, y2, w2, h2 = boxes[end_key]
    
    start = (x1 + w1/2, y1)
    end = (x2 + w2/2, y2 + h2)
    
    arrow = FancyArrowPatch(
        start, end,
        arrowstyle='->', 
        color=color, 
        linewidth=2.5,
        mutation_scale=20,
        linestyle=style
    )
    ax.add_patch(arrow)
    
    if label:
        mid_x = (start[0] + end[0]) / 2
        mid_y = (start[1] + end[1]) / 2
        ax.text(mid_x + 0.5, mid_y, label, 
                fontsize=8, color=color, style='italic',
                bbox=dict(boxstyle='round,pad=0.2', facecolor='black', alpha=0.7))

# Draw all boxes
draw_box(ax, 'ai_response', color_ai, 'AI Response\n(with tool call)')
draw_box(ax, 'check_format', color_parse, 'Check Format\n<function_call>{...}</function_call>')
draw_box(ax, 'extract_function', color_parse, 'Extract Function\nName')
draw_box(ax, 'extract_args', color_parse, 'Extract\nArguments')
draw_box(ax, 'tool_registry', color_execute, 'Tool Registry\n(22 tools)', border_width=3)
draw_box(ax, 'validate', color_execute, 'Validate Tool\nExists')
draw_box(ax, 'send_message', color_execute, 'Send to Background\nPlasmo Message')
draw_box(ax, 'handler', color_execute, 'Execute Handler\nbackground/messages/')
draw_box(ax, 'success', color_result, 'Success Result\n{success: true, data}')
draw_box(ax, 'error', color_result, 'Error Result\n{success: false, error}')
draw_box(ax, 'format_result', color_result, '[TOOL RESULT] ...')

# Main flow
draw_arrow(ax, 'ai_response', 'check_format', 'parse', color_ai)
draw_arrow(ax, 'check_format', 'extract_function', '', color_parse)
draw_arrow(ax, 'check_format', 'extract_args', '', color_parse)

# Extract to validate
extract_to_validate_1 = FancyArrowPatch(
    (boxes['extract_function'][0] + boxes['extract_function'][2]/2, 
     boxes['extract_function'][1]),
    (boxes['validate'][0] + boxes['validate'][2]/4, 
     boxes['validate'][1] + boxes['validate'][3]),
    arrowstyle='->', 
    color=color_parse, 
    linewidth=2.5,
    mutation_scale=20
)
ax.add_patch(extract_to_validate_1)

extract_to_validate_2 = FancyArrowPatch(
    (boxes['extract_args'][0] + boxes['extract_args'][2]/2, 
     boxes['extract_args'][1]),
    (boxes['validate'][0] + boxes['validate'][2]*3/4, 
     boxes['validate'][1] + boxes['validate'][3]),
    arrowstyle='->', 
    color=color_parse, 
    linewidth=2.5,
    mutation_scale=20
)
ax.add_patch(extract_to_validate_2)

# Tool registry lookup arrow
registry_arrow = FancyArrowPatch(
    (boxes['tool_registry'][0] + boxes['tool_registry'][2], 
     boxes['tool_registry'][1] + boxes['tool_registry'][3]/2),
    (boxes['validate'][0], 
     boxes['validate'][1] + boxes['validate'][3]/2),
    arrowstyle='->', 
    connectionstyle="arc3,rad=0.2",
    color='#00ffff', 
    linewidth=2,
    mutation_scale=20,
    linestyle=':'
)
ax.add_patch(registry_arrow)
ax.text(4, 5.8, 'lookup', fontsize=8, color='#00ffff', style='italic')

# Continue flow
draw_arrow(ax, 'validate', 'send_message', 'if valid', color_execute)
draw_arrow(ax, 'send_message', 'handler', 'route', color_execute)
draw_arrow(ax, 'handler', 'success', 'on success', color_result)
draw_arrow(ax, 'handler', 'error', 'on error', color_result)

# Results to format
success_to_format = FancyArrowPatch(
    (boxes['success'][0] + boxes['success'][2]/2, boxes['success'][1]),
    (boxes['format_result'][0] + boxes['format_result'][2]/3, 
     boxes['format_result'][1] + boxes['format_result'][3]),
    arrowstyle='->', 
    color=color_result, 
    linewidth=2.5,
    mutation_scale=20
)
ax.add_patch(success_to_format)

error_to_format = FancyArrowPatch(
    (boxes['error'][0] + boxes['error'][2]/2, boxes['error'][1]),
    (boxes['format_result'][0] + boxes['format_result'][2]*2/3, 
     boxes['format_result'][1] + boxes['format_result'][3]),
    arrowstyle='->', 
    color=color_result, 
    linewidth=2.5,
    mutation_scale=20
)
ax.add_patch(error_to_format)

# Loopback arrow
loopback_arrow = FancyArrowPatch(
    (boxes['format_result'][0], boxes['format_result'][1] + boxes['format_result'][3]/2),
    (boxes['ai_response'][0], boxes['ai_response'][1] + boxes['ai_response'][3]/2),
    arrowstyle='->', 
    connectionstyle="arc3,rad=0.5",
    color='#ef4444', 
    linewidth=3,
    mutation_scale=25,
    linestyle='--'
)
ax.add_patch(loopback_arrow)
ax.text(0.5, 5.5, 'Send back\nto AI', fontsize=9, color='#ef4444', 
        weight='bold', ha='center',
        bbox=dict(boxstyle='round', facecolor='black', edgecolor='#ef4444'))

# Title
ax.text(7, 11.7, 'Tool Execution Flow', 
        fontsize=20, color='white', weight='bold', ha='center')

# Add example box
example_x = 11
example_y = 9.5
ax.text(example_x, example_y + 1, 'Example:', 
        fontsize=11, color='white', weight='bold')
ax.text(example_x, example_y + 0.5, 
        '<function_call>',
        fontsize=7, color='#666666', family='monospace')
ax.text(example_x, example_y + 0.2, 
        '{"function": "openTab",',
        fontsize=7, color='#00ff88', family='monospace')
ax.text(example_x, example_y - 0.1, 
        ' "arguments": {',
        fontsize=7, color='#00ff88', family='monospace')
ax.text(example_x, example_y - 0.4, 
        '  "url": "https://..."',
        fontsize=7, color='#00ff88', family='monospace')
ax.text(example_x, example_y - 0.7, 
        ' }}',
        fontsize=7, color='#00ff88', family='monospace')
ax.text(example_x, example_y - 1, 
        '</function_call>',
        fontsize=7, color='#666666', family='monospace')

# Tool categories box
categories_x = 11
categories_y = 6
ax.text(categories_x, categories_y + 0.7, 'Tool Categories:', 
        fontsize=10, color='white', weight='bold')
categories = [
    'Navigation (5)',
    'Capture (4)', 
    'Memory (4)',
    'Content (3)',
    'Utility (6)'
]
for i, cat in enumerate(categories):
    ax.text(categories_x, categories_y - i*0.3, f'• {cat}', 
            fontsize=8, color='#999999')

# Add handler example
handler_box_x = 11
handler_box_y = 2.5
ax.text(handler_box_x, handler_box_y + 0.5, 'Handler:', 
        fontsize=10, color='white', weight='bold')
ax.text(handler_box_x, handler_box_y + 0.2, 
        'background/messages/',
        fontsize=7, color='#666666', family='monospace')
ax.text(handler_box_x, handler_box_y - 0.1, 
        'openTab.ts',
        fontsize=7, color='#a855f7', family='monospace')
ax.text(handler_box_x, handler_box_y - 0.4, 
        'clickElement.ts',
        fontsize=7, color='#a855f7', family='monospace')
ax.text(handler_box_x, handler_box_y - 0.7, 
        'searchVault.ts',
        fontsize=7, color='#a855f7', family='monospace')
ax.text(handler_box_x, handler_box_y - 1, 
        '... (22 total)',
        fontsize=7, color='#666666', family='monospace')

# Legend
legend_elements = [
    mpatches.Patch(color=color_ai, label='AI Output', alpha=0.3),
    mpatches.Patch(color=color_parse, label='Parsing', alpha=0.3),
    mpatches.Patch(color=color_execute, label='Execution', alpha=0.3),
    mpatches.Patch(color=color_result, label='Result', alpha=0.3)
]
ax.legend(handles=legend_elements, loc='lower left', 
          facecolor='black', edgecolor='white', 
          fontsize=9, labelcolor='white')

# Set limits
ax.set_xlim(0, 13)
ax.set_ylim(-0.5, 12)
plt.tight_layout()
plt.savefig('tool_execution_flow.png', dpi=300, facecolor='black', 
            bbox_inches='tight', pad_inches=0.3)
print("✅ Tool execution flow diagram generated: tool_execution_flow.png")

