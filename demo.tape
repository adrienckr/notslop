# demo.tape — VHS script for social-context
#
# Renders an animated GIF of a real `digest` invocation.
# Run with:   brew install vhs && vhs demo.tape
# Output:     .github/assets/demo.gif

Output .github/assets/demo.gif

Set FontSize 14
Set Width 1100
Set Height 700
Set Theme "Dracula"
Set TypingSpeed 30ms
Set Padding 20
Set Framerate 24

# Prompt
Type "social-context digest 'Anthropic MCP' --since 24h"
Sleep 400ms
Enter

# Fetch progress (CLI streams source-by-source status lines)
Sleep 600ms
Sleep 700ms
Sleep 500ms
Sleep 800ms

# ZeroEntropy rerank pass
Sleep 900ms

# Ranked output renders, hold for the viewer
Sleep 4s

# Run a second, narrower command to show flag composition
Type "social-context trending 'agentic coding' --sources hn,reddit --top 5"
Sleep 400ms
Enter
Sleep 3s

# Final pause before loop
Sleep 1500ms
