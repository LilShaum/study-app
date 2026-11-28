# The app today: New lecture (how a student makes a lecture from their slides)
One page, three numbered steps, built up over a month:
- Step 1 "Choose what to make": a two-way switch "What suits my material / Only the kinds I tick" (added last week, its own pill style), then eight checkboxes of item kinds, then "Also" (a studies toggle) and a "More" fold (class code, exam date).
- Step 2 "Copy the prompt": a grey label heading, a sentence "Paste it into Claude or another AI, and attach your slides or notes to the same message, then send.", a fold "Why attach them to the message?" with three sentences, and a button "Copy the prompt".
- Step 3 "Upload": heading "Upload", a sentence explaining the AI will give back a .study.json file, a button "Upload the file", and a caption under it about file size.
Each step's heading is a small grey uppercase label. Component: src/routes/NewLecture.tsx.
