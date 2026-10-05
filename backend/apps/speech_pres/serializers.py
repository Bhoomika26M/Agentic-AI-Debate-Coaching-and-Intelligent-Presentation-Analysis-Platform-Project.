from rest_framework import serializers
from .models import SpeechSession, PresentationSession, SlideEvaluation

class SpeechSessionSerializer(serializers.ModelSerializer):
    scores = serializers.SerializerMethodField()

    class Meta:
        model = SpeechSession
        fields = [
            'id', 'title', 'transcript', 'duration_seconds', 'words_per_minute',
            'filler_word_count', 'filler_word_breakdown', 'scores', 'feedback', 'created_at'
        ]

    def get_scores(self, obj):
        return {
            'pacing': obj.pacing_score,
            'articulation': obj.articulation_score,
            'overall_delivery': obj.overall_score
        }

class SlideEvaluationSerializer(serializers.ModelSerializer):
    class Meta:
        model = SlideEvaluation
        fields = [
            'slide_number', 'headline', 'word_count', 'density_rating',
            'visual_structure_score', 'clarity_score', 'critique', 'recommendation'
        ]

class PresentationSessionSerializer(serializers.ModelSerializer):
    slides = SlideEvaluationSerializer(many=True, read_only=True)

    class Meta:
        model = PresentationSession
        fields = [
            'id', 'title', 'total_slides', 'overall_score', 'summary', 'slides', 'created_at'
        ]
