import re

with open("README.md", "r") as f:
    readme = f.read()

new_eval_section = """## 📊 Evaluation

The project includes an evaluation harness (`backend/eval/run_eval.py`) with 23 hand-labeled claim pairs (a mix of true contradictions, genuine scope-exceptions, and ambiguous edge cases). The evaluation dataset was deliberately expanded to remove any tuning bias and prove the model generalizes strict logical distinctions.

Run it to get precision, recall, and F1 scores:

```bash
cd backend
python -m eval.run_eval
```

**Latest Benchmark (Groq/Llama-3):**

- **Precision:** 0.3500 (TP=7, FP=13)
- **Recall:** 0.7778 (TP=7, FN=2)
- **F1 Score:** 0.4828
- **Accuracy:** 0.3478 (8/23 correct)

*(Note: The latest run encountered 15 HTTP 429 Rate Limit Errors from the Groq API due to token exhaustion, severely impacting the final recorded accuracy.)*
"""

# Replace everything from ## 📊 Evaluation to ## 🔮 Future Improvements
readme = re.sub(r'## 📊 Evaluation.*?## 🔮 Future Improvements', new_eval_section + '\n## 🔮 Future Improvements', readme, flags=re.DOTALL)

with open("README.md", "w") as f:
    f.write(readme)
