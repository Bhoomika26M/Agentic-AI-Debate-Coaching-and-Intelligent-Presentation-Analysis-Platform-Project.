
from argument_analyzer import calculate_similarity

claim = "School uniforms should be compulsory."

supporting_evidence = (
    "Uniforms can reduce visible differences in clothing."
)

unrelated_sentence = (
    "The ocean contains many different species of fish."
)

print(
    "Supporting evidence:",
    calculate_similarity(claim, supporting_evidence),
)

print(
    "Unrelated sentence:",
    calculate_similarity(claim, unrelated_sentence),
)
