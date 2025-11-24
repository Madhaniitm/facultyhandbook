# 🧪 Chatbot Testing Guide

## Quick Test (2 Minutes)

### Step 1: Start Server
```bash
cd "c:\Users\Aishwarya\Desktop\Madhan Kumar B\facultyhandbook"
bundle exec jekyll serve
```

Wait for: `Server running... press ctrl-c to stop.`

### Step 2: Open Browser
```
http://localhost:4000
```

### Step 3: Look for Purple Button
👉 **Bottom-right corner** of the page

### Step 4: Click & Test
1. Click the purple button
2. Type: "How do I apply for leave?"
3. Press Enter
4. Wait for response
5. Check if source links appear

### Step 5: Verify
✅ Response appears within 1 second
✅ Answer mentions leave policy
✅ Reference links shown below answer
✅ Can click links to visit pages

---

## Detailed Testing

### Test 1: Basic Functionality

| Action | Expected Result |
|--------|-----------------|
| Click purple button | Chat window opens smoothly |
| See welcome message | Shows greeting + suggestions |
| Click suggestion chip | Question auto-fills input |
| Type question | Input field accepts text |
| Press Enter | Message sends, bot responds |
| Click reference link | Opens handbook page |
| Press Escape | Chat window closes |

### Test 2: Search Quality

Test these questions and verify accuracy:

#### ✅ Should Find Answers
```
Q: "How do I apply for leave?"
Expected: Info about leave application + link to Leave section

Q: "What are the research grant procedures?"
Expected: Grant process info + link to Research section

Q: "How to access my payslip?"
Expected: Payslip access info + link to Services section

Q: "Tell me about travel reimbursement"
Expected: Travel policy info + link to Travel section

Q: "How to book campus facilities?"
Expected: Booking info + link to Facilities section
```

#### ❌ Should Not Hallucinate
```
Q: "What's the weather today?"
Expected: "I couldn't find relevant information in the Faculty Handbook"

Q: "Tell me about Mars"
Expected: "I couldn't find relevant information in the Faculty Handbook"

Q: "What should I have for lunch?"
Expected: "I couldn't find relevant information in the Faculty Handbook"
```

### Test 3: UI Elements

#### Desktop (Full Screen)
- [ ] Button visible bottom-right
- [ ] Chat window 380px wide
- [ ] Chat window 600px tall
- [ ] Messages scrollable
- [ ] Suggestions visible initially
- [ ] Input resizes with text

#### Mobile (< 480px)
- [ ] Button visible bottom-right
- [ ] Chat window full screen
- [ ] Close button works
- [ ] Keyboard doesn't cover input
- [ ] Touch scrolling smooth

#### Tablet (481px - 1024px)
- [ ] Chat window appropriately sized
- [ ] All interactions work
- [ ] No horizontal scroll

### Test 4: Animations

- [ ] Button scales on hover
- [ ] Chat window slides in/out
- [ ] Messages slide up when added
- [ ] Typing dots animate
- [ ] Typing cursor blinks
- [ ] Suggestions hover effect

### Test 5: Accessibility

#### Keyboard Navigation
```
Tab → Focus on purple button
Enter → Opens chat
Tab → Focus on input field
Type + Enter → Send message
Escape → Close chat
```

#### Screen Reader (NVDA/JAWS)
- [ ] Button announced as "Toggle Faculty Assistant"
- [ ] Chat input announced as "Chat input"
- [ ] Send button announced as "Send message"
- [ ] Messages are announced
- [ ] Links are announced with destination

### Test 6: Performance

| Metric | Target | How to Test |
|--------|--------|-------------|
| Load Time | < 1s | Open DevTools → Network → Refresh |
| Response Time | < 500ms | Ask question → check timing |
| Animation FPS | 60fps | Open DevTools → Performance |
| Memory Usage | < 10MB | DevTools → Memory → Take snapshot |

### Test 7: Edge Cases

#### Empty Input
- [ ] Send button disabled when empty
- [ ] Pressing Enter does nothing

#### Very Long Message
```
Test: Type 500+ characters
Expected: Scrolls within message bubble
```

#### Special Characters
```
Test: "What's the policy & procedure?"
Expected: Handles quotes, ampersands correctly
```

#### Rapid Fire Questions
```
Test: Send 5 questions quickly
Expected: Queues properly, no crashes
```

#### No Search Results
```
Test: "zxcvbnmasdfghjkl"
Expected: Graceful "no results" message
```

---

## Browser Testing Matrix

### Desktop

| Browser | Version | Status |
|---------|---------|--------|
| Chrome | Latest | ✅ Test |
| Firefox | Latest | ✅ Test |
| Edge | Latest | ✅ Test |
| Safari | Latest | ✅ Test |
| Opera | Latest | ⚪ Optional |

### Mobile

| Device | Browser | Status |
|--------|---------|--------|
| iPhone | Safari | ✅ Test |
| iPhone | Chrome | ⚪ Optional |
| Android | Chrome | ✅ Test |
| Android | Firefox | ⚪ Optional |

---

## Visual Inspection

### Colors
- [ ] Purple gradient on button (not green/red/blue)
- [ ] White background on chat
- [ ] Proper contrast ratios
- [ ] Dark mode adapts (if enabled)

### Typography
- [ ] Text readable at all sizes
- [ ] No text overflow
- [ ] Proper line spacing
- [ ] Consistent fonts

### Spacing
- [ ] Adequate padding/margins
- [ ] No overlapping elements
- [ ] Aligned elements
- [ ] Balanced layout

### Icons
- [ ] SVG icons render correctly
- [ ] Icons have proper colors
- [ ] No broken images
- [ ] Proper sizing

---

## Console Check

### Open Browser Console (F12)

#### Should See:
```
[Chatbot] Search data loaded: 102 entries
[Chatbot] Using local rule-based mode
```

#### Should NOT See:
```
❌ Error: ...
❌ Warning: ...
❌ Failed to load ...
❌ Uncaught ...
```

---

## Network Check

### Open DevTools → Network Tab

#### Files Loaded:
- [ ] `/assets/js/chatbot.js` (200 OK)
- [ ] `/assets/css/just-the-docs-default.css` (200 OK)
- [ ] `/assets/js/search-data.json` (200 OK)

#### No 404 Errors:
- [ ] All resources load successfully
- [ ] No missing files
- [ ] No CORS errors

---

## Configuration Tests

### Test 1: Disable Chatbot
```yaml
# _config.yml
chatbot:
  enabled: false
```
```bash
bundle exec jekyll serve
```
Expected: No purple button appears

### Test 2: Re-enable Chatbot
```yaml
# _config.yml
chatbot:
  enabled: true
```
```bash
bundle exec jekyll serve
```
Expected: Purple button appears again

---

## Conversation Flow Test

### Natural Conversation
```
User: "leave"
Bot: Shows leave-related results

User: "How do I apply?"
Bot: Shows application procedures

User: "What documents do I need?"
Bot: Shows document requirements
```

Each response should:
- [ ] Be relevant to question
- [ ] Include source references
- [ ] Load within 500ms
- [ ] Show typing animation

---

## Stress Tests

### Test 1: Multiple Tabs
1. Open chatbot in 3 tabs
2. Ask questions in each
3. Verify no conflicts
4. Check memory usage

### Test 2: Long Session
1. Keep chatbot open for 30 minutes
2. Ask 20+ questions
3. Verify no memory leaks
4. Check responsiveness

### Test 3: Network Issues
1. Open chatbot
2. Disable internet (local mode)
3. Ask questions
4. Verify still works

---

## Bug Report Template

If you find issues, report using this format:

```markdown
## Bug: [Short Description]

**Severity**: Critical / High / Medium / Low

**Steps to Reproduce**:
1. Step one
2. Step two
3. Step three

**Expected Behavior**:
[What should happen]

**Actual Behavior**:
[What actually happens]

**Environment**:
- Browser: [e.g., Chrome 120]
- OS: [e.g., Windows 11]
- Screen Size: [e.g., 1920x1080]

**Console Errors**:
```
[Paste any console errors]
```

**Screenshots**:
[Attach if relevant]
```

---

## Success Criteria

### Must Have (Blocking Issues)
- [x] Chatbot appears on all pages
- [x] Opens and closes properly
- [x] Accepts user input
- [x] Returns search results
- [x] Shows source references
- [x] Links work correctly
- [x] No console errors

### Should Have (Important)
- [x] Animations smooth
- [x] Mobile responsive
- [x] Keyboard navigation
- [x] Screen reader support
- [x] Fast responses (< 500ms)

### Nice to Have (Polish)
- [x] Typing animation
- [x] Suggestion chips
- [x] Dark mode support
- [x] Hover effects

---

## Sign-Off Checklist

Before deploying to production:

### Functionality
- [ ] All test questions answered correctly
- [ ] No hallucinations detected
- [ ] Source references accurate
- [ ] Links point to correct pages
- [ ] No results message shows when appropriate

### Performance
- [ ] Load time < 1 second
- [ ] Response time < 500ms
- [ ] No memory leaks
- [ ] Smooth animations (60fps)

### Compatibility
- [ ] Works in Chrome
- [ ] Works in Firefox
- [ ] Works in Safari
- [ ] Works in Edge
- [ ] Works on mobile

### Accessibility
- [ ] Keyboard navigation works
- [ ] Screen reader compatible
- [ ] Focus indicators visible
- [ ] ARIA labels present
- [ ] Color contrast sufficient

### Code Quality
- [ ] No console errors
- [ ] No console warnings
- [ ] Clean network tab
- [ ] Valid HTML/CSS
- [ ] Code commented

### Documentation
- [ ] README complete
- [ ] Quick start guide available
- [ ] Configuration documented
- [ ] Examples provided

---

## Quick Command Reference

```bash
# Start server
bundle exec jekyll serve

# Clean cache
bundle exec jekyll clean

# Rebuild
bundle exec jekyll build

# Watch files
bundle exec jekyll serve --watch

# Check for errors
bundle exec jekyll build --verbose
```

---

## Testing Complete! ✅

If all tests pass:
1. ✅ Mark as production-ready
2. ✅ Deploy to live server
3. ✅ Monitor for issues
4. ✅ Gather user feedback

If tests fail:
1. ❌ Document issues
2. ❌ Fix problems
3. ❌ Re-test
4. ❌ Repeat until pass

---

**Happy Testing! 🚀**
