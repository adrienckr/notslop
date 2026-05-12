# demo.tape — VHS script for notslop
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
Type "notslop digest 'Anthropic MCP' --since 24h"
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
Type "notslop trending 'agentic coding' --sources hn,reddit --top 5"
Sleep 400ms
Enter
Sleep 3s

# Final pause before loop
Sleep 1500ms

Sleep 2s
Type "notslop find-related 'https://anthropic.com/news/claude-4-5'"
Enter
Sleep 4s
Type "notslop list add ai-builders --kind x_profiles --items karpathy,sama,yann_lecun"
Enter
Sleep 2s
Type "notslop install --claude"
Enter
Sleep 3s
