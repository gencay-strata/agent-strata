# Feedbacks - 09.03.2026

## Scoring & Grading Philosophy

### Nathan's Feedback
- **Readiness Score (0-10)**: Convert current 0-100 scale to 0-10 (e.g., 52 → 5.2)
- **Interpretation**: Each score needs descriptive meaning (e.g., "5.2 = Good intent but still need to prepare more")
- **Report Alignment**: The detailed report should support the score - mention what they did well to get 5.2 and what needs improvement
- **Distinction from Platform Grading**: Mock Interview grading is different from normal platform grading (which requires exact output match)
- **Request**: Share prompts/documentation that builds the score and report

### Anna's Feedback
- **Interview Philosophy**: Interviewers forgive syntax errors if logic is correct - hard to quantify numerically
- **Company Variance**: Each company has different metrics
- **Current Grading Assessment**: "It grades well enough" - small syntax errors can still get high scores
- **Concern**: "Logic error" detection may not be working well (based on screenshot)
- **Alignment Question**: Should we align with platform's exact-output grading? Probably no - "Readiness score" makes more sense
- **Interpretation**: 52 = "Good intent, but still need to prepare more"

## UX/Navigation Issues

### Tihomir's Feedback
1. **Output Format**: Expects actual table output (like regular code editor), not dictionary format
2. **CTA Placement**: "Try Another Interview" and "Share Results" buttons are below the fold - should be at top
3. **Navigation Flow**: "Try Another Interview" goes to homepage instead of directly to Mock Interview setup page
4. **SQL Dialect**: Code editor shows "SQL" but unclear if it accepts any dialect or specific ones - needs clarification/selector
5. **Scoring Confusion**:
   - Got 52/100 overall (above 50%) but failed both questions
   - Intentionally wrong solutions still got 58/100 for first question
   - Unclear what score means: Pass? Fail? Need more questions?
   - **Suggestion**: Add "Interviewer's Decision" section with clear verdict ("Passed", "Failed", or humorous "3.6 Röntgen: Not Great, Not Terrible")

## CRITICAL ISSUE - Inconsistent Scoring (Discovered 09.03.2026)

**Problem:** Interview Agent scoring is inconsistent and lacks mathematical formula.

**Root Cause:**
- MCP returns: `is_correct` (boolean) + `user_results` + `author_results`
- Interview Agent prompt (lines 60-65) only provides **example** format: "❌ Incorrect (Score: 45/100)"
- **NO explicit formula** for how to calculate scores from row matches, column correctness, or logic quality
- Agent uses GPT-5.2 reasoning to "guess" scores based on examples

**Impact:**
- Same error types may get different scores (58/100 vs 45/100)
- Tihomir got 52/100 overall but failed both questions
- No clear criteria for partial credit

**Solution Required:**
Add explicit scoring rubric to Interview Agent prompt, such as:
- 100: Perfect match (all rows, columns correct)
- 70-99: Minor errors (90%+ rows match, correct logic)
- 40-69: Partial credit (50-89% rows match, correct columns)
- 0-39: Major logic errors or syntax failures

## Action Items
- [ ] **URGENT**: Add mathematical scoring rubric to Interview Agent prompt
- [ ] Share prompts/documentation for scoring system (Nathan's request)
- [ ] Consider 0-10 scale with descriptive interpretations
- [ ] Fix output format to show tables instead of dictionaries
- [ ] Move CTAs to top of Results page
- [ ] Fix "Try Another Interview" navigation to go directly to setup
- [ ] Add SQL dialect selector or clarification
- [ ] Add "Interviewer's Decision" verdict based on overall score
- [ ] Review "logic error" detection accuracy
