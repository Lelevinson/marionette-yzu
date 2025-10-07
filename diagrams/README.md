# Marionette Diagrams

This directory contains Python scripts to generate visual diagrams for the Marionette documentation.

## Requirements

Install dependencies:

```bash
pip install -r requirements.txt
```

**Note:** The `diagrams` library requires Graphviz to be installed on your system:

- **macOS**: `brew install graphviz`
- **Ubuntu/Debian**: `sudo apt-get install graphviz`
- **Windows**: Download from https://graphviz.org/download/

## Generated Diagrams

### 1. Architecture Overview (`01_architecture_overview.py`)
**Output:** `marionette_architecture.png`

High-level system architecture showing:
- UI Layer (React components)
- Input sources (voice, text, wake word)
- AI processing engine (Gemini Nano)
- Automation tools (22+ tools)
- Semantic memory vault
- Background services

```bash
python 01_architecture_overview.py
```

### 2. AI Processing Flow (`02_ai_processing_flow.py`)
**Output:** `ai_processing_flow.png`

Step-by-step flow of AI processing:
- User input → transcript
- Context management
- Gemini Nano streaming
- Tool call parsing
- Execution loopback
- TTS output

```bash
python 02_ai_processing_flow.py
```

### 3. Memory Vault Workflow (`03_memory_vault_workflow.py`)
**Output:** `memory_vault_workflow.png`

Semantic memory system showing:
- Storage flow (capture → clean → embed → store)
- Search flow (query → embed → similarity → results)
- IndexedDB structure
- 384D embeddings (all-MiniLM-L6-v2)
- Cosine similarity search

```bash
python 03_memory_vault_workflow.py
```

### 4. Tool Execution Flow (`04_tool_execution_flow.py`)
**Output:** `tool_execution_flow.png`

Tool execution pipeline:
- AI response parsing
- Function and argument extraction
- Tool registry validation
- Background message routing
- Handler execution
- Result formatting and loopback

```bash
python 04_tool_execution_flow.py
```

### 5. Playbook System (`05_playbook_system.py`)
**Output:** `playbook_system.png`

Playbook workflow system:
- User request → AI analysis
- Playbook loading (getPlaybook)
- Step-by-step execution
- Execution loop visualization
- Available playbooks
- Benefits and features

```bash
python 05_playbook_system.py
```

## Generate All Diagrams

Run all scripts at once:

```bash
# macOS/Linux
for file in *.py; do python "$file"; done

# Or use the convenience script
chmod +x generate_all.sh
./generate_all.sh
```

## Customization

Each diagram uses a dark theme (`bgcolor="black"`) to match the Marionette aesthetic. You can customize:

- **Colors**: Modify the `color_*` variables in each script
- **Layout**: Adjust the `graph_attr`, `node_attr`, and `edge_attr` dictionaries
- **Size**: Change `figsize` parameter in matplotlib diagrams
- **DPI**: Modify `dpi` parameter when saving (default: 300)

## Output Files

All diagrams are saved as PNG files in this directory:

```
diagrams/
├── marionette_architecture.png
├── ai_processing_flow.png
├── memory_vault_workflow.png
├── tool_execution_flow.png
└── playbook_system.png
```

## Using in README

Reference diagrams in the main README:

```markdown
![Architecture Overview](./diagrams/marionette_architecture.png)
![AI Processing Flow](./diagrams/ai_processing_flow.png)
![Memory Vault](./diagrams/memory_vault_workflow.png)
![Tool Execution](./diagrams/tool_execution_flow.png)
![Playbook System](./diagrams/playbook_system.png)
```

## Troubleshooting

### Graphviz Not Found
```
Error: Graphviz's executables not found
```

**Solution:** Install Graphviz system package (see Requirements above)

### Module Not Found
```
ModuleNotFoundError: No module named 'diagrams'
```

**Solution:** Install requirements: `pip install -r requirements.txt`

### Permission Denied
```
PermissionError: [Errno 13] Permission denied
```

**Solution:** Ensure write permissions: `chmod +w .`

## License

MIT License - Same as the main Marionette project

