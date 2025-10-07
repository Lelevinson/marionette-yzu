#!/usr/bin/env python3
"""
Marionette Architecture Overview Diagram
Generates a high-level system architecture diagram showing all major components.
"""

from diagrams import Diagram, Cluster, Edge
from diagrams.custom import Custom
from diagrams.programming.language import JavaScript, TypeScript
from diagrams.onprem.client import Client
from diagrams.onprem.database import MongoDB
from diagrams.generic.storage import Storage
from diagrams.programming.framework import React

# Define custom styling
graph_attr = {
    "fontsize": "16",
    "bgcolor": "black",
    "fontcolor": "white",
    "pad": "0.5",
    "splines": "ortho",
    "nodesep": "0.8",
    "ranksep": "1.0"
}

node_attr = {
    "fontsize": "12",
    "fontcolor": "white",
    "color": "white",
    "style": "rounded,filled",
    "fillcolor": "#1a1a1a"
}

edge_attr = {
    "color": "#00ff88",
    "fontcolor": "white",
    "fontsize": "10"
}

with Diagram(
    "Marionette Architecture Overview",
    filename="marionette_architecture",
    outformat="png",
    graph_attr=graph_attr,
    node_attr=node_attr,
    edge_attr=edge_attr,
    direction="TB"
):
    
    # User Interface Layer
    with Cluster("UI Layer (React + Tailwind)"):
        popup = React("Popup UI\n(Quick Access)")
        sidepanel = React("Side Panel UI\n(Full Height)")
        waveform = React("Waveform\nComponent")
        
    # Input Sources
    with Cluster("Input Sources"):
        voice = Client("Voice Input\n(Web Speech API)")
        text = Client("Text Input\n(Keyboard)")
        wake_word = Client("Wake Word\n(Porcupine)")
    
    # Core Processing
    with Cluster("AI Processing Engine"):
        gemini = TypeScript("Gemini Nano\n(On-Device LLM)")
        system_prompt = TypeScript("System Prompt\n(Tool Docs)")
        chat_context = TypeScript("Chat Context\n(Zustand State)")
        
    # Tools & Automation
    with Cluster("Automation Tools (22+)"):
        nav_tools = JavaScript("Navigation\n(click, fill, scroll)")
        capture_tools = JavaScript("Capture\n(screenshot, page)")
        memory_tools = JavaScript("Memory\n(store, search)")
        content_tools = JavaScript("Content\n(write, translate)")
    
    # Content Script Layer
    with Cluster("Content Script (Page Interaction)"):
        dom_access = JavaScript("DOM Access\n& Manipulation")
        a11y_tree = JavaScript("Accessibility\nSnapshot")
        readability = JavaScript("Readability\n(Article Extract)")
    
    # Memory System
    with Cluster("Semantic Memory Vault"):
        embeddings = TypeScript("Transformers.js\n(all-MiniLM-L6-v2)")
        indexeddb = Storage("IndexedDB\n(384D Vectors)")
        search = TypeScript("Cosine Similarity\nSearch")
    
    # Background Services
    with Cluster("Background Service Worker"):
        message_handler = JavaScript("Message Router\n(22 handlers)")
        playbooks = JavaScript("Playbook System\n(Workflows)")
    
    # Output
    with Cluster("Output"):
        tts = Client("Text-to-Speech\n(Chrome TTS)")
        visual = Client("Visual Feedback\n(Highlights)")
    
    # Connection flows
    voice >> Edge(label="transcribe") >> chat_context
    text >> Edge(label="input") >> chat_context
    wake_word >> Edge(label="activate") >> chat_context
    
    chat_context >> Edge(label="prompt") >> gemini
    system_prompt >> Edge(label="inject") >> gemini
    
    gemini >> Edge(label="tool calls") >> message_handler
    message_handler >> Edge(label="execute") >> nav_tools
    message_handler >> Edge(label="execute") >> capture_tools
    message_handler >> Edge(label="execute") >> memory_tools
    message_handler >> Edge(label="execute") >> content_tools
    
    nav_tools >> Edge(label="manipulate") >> dom_access
    capture_tools >> Edge(label="extract") >> a11y_tree
    capture_tools >> Edge(label="clean") >> readability
    
    memory_tools >> Edge(label="generate") >> embeddings
    embeddings >> Edge(label="store") >> indexeddb
    indexeddb >> Edge(label="query") >> search
    
    message_handler >> Edge(label="load") >> playbooks
    
    gemini >> Edge(label="response") >> chat_context
    chat_context >> Edge(label="display") >> popup
    chat_context >> Edge(label="display") >> sidepanel
    chat_context >> Edge(label="animate") >> waveform
    chat_context >> Edge(label="speak") >> tts
    nav_tools >> Edge(label="highlight") >> visual

print("✅ Architecture overview diagram generated: marionette_architecture.png")

