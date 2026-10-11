


from sentence_transformers import SentenceTransformer
from sentence_transformers.util import cos_sim

print("Loading semantic similarity model...")

model = SentenceTransformer(
    "sentence-transformers/all-MiniLM-L6-v2"
)

claim = "School uniforms should be compulsory."
supporting_sentence = (
    "Uniforms can reduce visible differences in clothing."
)
unrelated_sentence = (
    "The ocean contains many different species of fish."
)

embeddings = model.encode(
    [claim, supporting_sentence, unrelated_sentence],
    convert_to_tensor=True,
)

supporting_similarity = cos_sim(
    embeddings[0], embeddings[1]
).item()

unrelated_similarity = cos_sim(
    embeddings[0], embeddings[2]
).item()

print("\n--- SEMANTIC SIMILARITY TEST ---")
print(f"Claim: {claim}")
print(
    f"Supporting sentence similarity: "
    f"{supporting_similarity:.3f}"
)
print(
    f"Unrelated sentence similarity: "
    f"{unrelated_similarity:.3f}"
)
