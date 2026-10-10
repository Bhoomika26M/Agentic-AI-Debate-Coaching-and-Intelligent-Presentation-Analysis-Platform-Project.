from app.ml.argument_quality_model import train_model


if __name__ == "__main__":
    result = train_model()
    print(f"Trained model saved at {result['path']}")
    print(f"Samples: {result['training_samples']}")
    print(f"Version: {result['version']}")
