#!/usr/bin/env python3
"""
Memory Vault Workflow Diagram
Shows how the semantic memory vault stores and retrieves information.
"""

import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch, Circle
import numpy as np

# Create figure with dark theme
fig, ax = plt.subplots(figsize=(16, 10), facecolor='black')
ax.set_facecolor('black')
ax.axis('off')

# Colors
color_action = '#00ff88'
color_process = '#3b82f6'
color_storage = '#a855f7'
color_search = '#f59e0b'

# Define positions
boxes = {
    # Storage flow (left side)
    'user_store': (1, 8.5, 2.5, 0.8),
    'capture': (1, 7, 2.5, 0.8),
    'readability': (1, 5.5, 2.5, 0.8),
    'embed_store': (1, 4, 2.5, 0.8),
    'indexeddb_store': (1, 2.5, 2.5, 0.8),
    
    # Search flow (right side)
    'user_search': (8.5, 8.5, 2.5, 0.8),
    'embed_query': (8.5, 7, 2.5, 0.8),
    'retrieve_all': (8.5, 5.5, 2.5, 0.8),
    'cosine_sim': (8.5, 4, 2.5, 0.8),
    'results': (8.5, 2.5, 2.5, 0.8),
    
    # Central storage
    'database': (5, 1, 2, 1.5)
}

def draw_box(ax, key, color, label, border_style='solid'):
    x, y, w, h = boxes[key]
    box = FancyBboxPatch(
        (x, y), w, h,
        boxstyle="round,pad=0.05",
        facecolor=color,
        edgecolor='white',
        linewidth=2,
        alpha=0.3,
        linestyle=border_style
    )
    ax.add_patch(box)
    ax.text(x + w/2, y + h/2, label, 
            ha='center', va='center', fontsize=9, 
            color='white', weight='bold')

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
            linewidth=2.5,
            mutation_scale=20
        )
    else:
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
        ax.text(mid_x - 0.8, mid_y, label, 
                fontsize=8, color=color, style='italic',
                bbox=dict(boxstyle='round,pad=0.3', facecolor='black', 
                         edgecolor=color, alpha=0.7))

# STORAGE FLOW (LEFT)
draw_box(ax, 'user_store', color_action, 'User: "Remember\nthis page"')
draw_box(ax, 'capture', color_process, 'Capture Page\nContent')
draw_box(ax, 'readability', color_process, 'Clean with\nReadability.js')
draw_box(ax, 'embed_store', color_process, 'Generate Embedding\n(all-MiniLM-L6-v2)')
draw_box(ax, 'indexeddb_store', color_storage, 'Store Entry\n+ 384D Vector')

# SEARCH FLOW (RIGHT)
draw_box(ax, 'user_search', color_action, 'User: "What did\nI read about X?"')
draw_box(ax, 'embed_query', color_process, 'Generate Query\nEmbedding')
draw_box(ax, 'retrieve_all', color_storage, 'Retrieve All\nEntries')
draw_box(ax, 'cosine_sim', color_process, 'Calculate Cosine\nSimilarity')
draw_box(ax, 'results', color_search, 'Return Top\nMatches (>30%)')

# DATABASE (CENTER)
draw_box(ax, 'database', color_storage, 'IndexedDB\nmarionette_vault', 'dashed')

# Storage flow arrows
draw_arrow(ax, 'user_store', 'capture', 'trigger', color_action)
draw_arrow(ax, 'capture', 'readability', 'HTML', color_process)
draw_arrow(ax, 'readability', 'embed_store', 'clean text', color_process)
draw_arrow(ax, 'embed_store', 'indexeddb_store', '384D vector', color_process)

# Storage to database
store_to_db = FancyArrowPatch(
    (boxes['indexeddb_store'][0] + boxes['indexeddb_store'][2]/2, 
     boxes['indexeddb_store'][1]),
    (boxes['database'][0] + boxes['database'][2]/2, 
     boxes['database'][1] + boxes['database'][3]),
    arrowstyle='->', 
    connectionstyle="arc3,rad=-0.3",
    color=color_storage, 
    linewidth=3,
    mutation_scale=25
)
ax.add_patch(store_to_db)
ax.text(3.5, 2.2, 'write', fontsize=8, color=color_storage, style='italic')

# Search flow arrows
draw_arrow(ax, 'user_search', 'embed_query', 'trigger', color_action)
draw_arrow(ax, 'embed_query', 'retrieve_all', 'query vector', color_process)
draw_arrow(ax, 'retrieve_all', 'cosine_sim', 'all entries', color_storage)
draw_arrow(ax, 'cosine_sim', 'results', 'sorted', color_process)

# Database to search
db_to_search = FancyArrowPatch(
    (boxes['database'][0] + boxes['database'][2]/2, 
     boxes['database'][1] + boxes['database'][3]),
    (boxes['retrieve_all'][0] + boxes['retrieve_all'][2]/2, 
     boxes['retrieve_all'][1]),
    arrowstyle='->', 
    connectionstyle="arc3,rad=0.3",
    color=color_storage, 
    linewidth=3,
    mutation_scale=25
)
ax.add_patch(db_to_search)
ax.text(7, 2.2, 'read', fontsize=8, color=color_storage, style='italic')

# Add embedding model visualization (center)
embed_visual_y = 7.5
ax.text(6, embed_visual_y + 0.5, 'Transformers.js Pipeline', 
        fontsize=12, color='white', weight='bold', ha='center')

# Show example embedding as dots
embedding_example = np.random.rand(20) * 0.3 + 0.35
for i, val in enumerate(embedding_example):
    circle = Circle((4.2 + i*0.2, embed_visual_y), 0.08, 
                    color='#00ff88', alpha=val)
    ax.add_patch(circle)

ax.text(6, embed_visual_y - 0.3, '[0.42, 0.38, 0.56, ..., 0.41]  (384 dims)', 
        fontsize=8, color='#666666', ha='center', style='italic')

# Add database schema info
schema_y = 0.3
ax.text(6, schema_y, 
        'Schema: { id, url, title, content, embedding[], timestamp, domain, wordCount }',
        fontsize=8, color='#666666', ha='center',
        bbox=dict(boxstyle='round', facecolor='black', 
                 edgecolor='#666666', linewidth=1))

# Title
ax.text(6, 9.7, 'Semantic Memory Vault Workflow', 
        fontsize=20, color='white', weight='bold', ha='center')

# Section labels
ax.text(2.25, 9.5, 'STORAGE', fontsize=12, color=color_storage, 
        weight='bold', ha='center')
ax.text(9.75, 9.5, 'SEARCH', fontsize=12, color=color_search, 
        weight='bold', ha='center')

# Add metrics boxes
metrics = [
    ('Embedding Time', '~100-300ms', 0.5, 6),
    ('Search Time', '~50-200ms\n(100 entries)', 11, 6),
    ('Vector Dims', '384', 0.5, 4.5),
    ('Similarity', 'Cosine\n(threshold: 30%)', 11, 4.5),
    ('Storage', 'IndexedDB\nUnlimited', 0.5, 3),
    ('Model', 'all-MiniLM-L6-v2\n(Xenova)', 11, 3),
]

for label, value, x, y in metrics:
    ax.text(x, y, f'{label}\n{value}', 
            fontsize=7, color='#999999', ha='center',
            bbox=dict(boxstyle='round,pad=0.3', facecolor='#1a1a1a', 
                     edgecolor='#444444', linewidth=1))

# Legend
legend_elements = [
    mpatches.Patch(color=color_action, label='User Action', alpha=0.3),
    mpatches.Patch(color=color_process, label='Processing', alpha=0.3),
    mpatches.Patch(color=color_storage, label='Storage Operation', alpha=0.3),
    mpatches.Patch(color=color_search, label='Search Result', alpha=0.3)
]
ax.legend(handles=legend_elements, loc='lower right', 
          facecolor='black', edgecolor='white', 
          fontsize=9, labelcolor='white')

# Set limits
ax.set_xlim(0, 12)
ax.set_ylim(-0.2, 10)
plt.tight_layout()
plt.savefig('memory_vault_workflow.png', dpi=300, facecolor='black', 
            bbox_inches='tight', pad_inches=0.3)
print("✅ Memory vault workflow diagram generated: memory_vault_workflow.png")

