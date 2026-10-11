
from argument_analyzer import analyze_argument

argument = """
School uniforms should be compulsory because they can reduce visible
differences in clothing among students. For example, students would not
need to compete over expensive brands.
"""

result = analyze_argument(argument)

print("\n--- ARGUMENT ANALYSIS RESULT ---")
print("Claim:", result["claim"])
print("Evidence:", result["evidence"])
print("Evidence Analysis:", result["evidence_analysis"])
print("Possible fallacies:", result["possible_fallacies"])
print("Argument score:", result["argument_score"])
print("Feedback:", result["feedback"])
print("Word count:", result["word_count"])
print("Sentence count:", result["sentence_count"])
