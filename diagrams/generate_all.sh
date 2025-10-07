#!/bin/bash
# Generate all Marionette diagrams

echo "🎨 Generating Marionette diagrams..."
echo ""

# Check if Python is available
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 not found. Please install Python 3."
    exit 1
fi

# Check if requirements are installed
if ! python3 -c "import diagrams" 2>/dev/null; then
    echo "📦 Installing requirements..."
    pip install -r requirements.txt
fi

# Generate each diagram
diagrams=(
    "01_architecture_overview.py"
    "02_ai_processing_flow.py"
    "03_memory_vault_workflow.py"
    "04_tool_execution_flow.py"
    "05_playbook_system.py"
)

for diagram in "${diagrams[@]}"; do
    echo "🔨 Generating $diagram..."
    python3 "$diagram"
done

echo ""
echo "✅ All diagrams generated successfully!"
echo ""
echo "Generated files:"
ls -lh *.png 2>/dev/null | awk '{print "  - " $9 " (" $5 ")"}'

