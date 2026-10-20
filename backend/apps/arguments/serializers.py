from rest_framework import serializers
from .models import ArgumentAnalysis, LogicalFallacyInstance, CounterArgument

class LogicalFallacySerializer(serializers.ModelSerializer):
    type = serializers.CharField(source='fallacy_type')
    correction = serializers.CharField(source='suggested_correction')

    class Meta:
        model = LogicalFallacyInstance
        fields = ['type', 'excerpt', 'explanation', 'correction']

class CounterArgumentSerializer(serializers.ModelSerializer):
    claim = serializers.CharField(source='counter_claim')

    class Meta:
        model = CounterArgument
        fields = ['perspective', 'claim', 'counter_evidence']

class ArgumentAnalysisSerializer(serializers.ModelSerializer):
    fallacies = LogicalFallacySerializer(many=True, read_only=True)
    counterarguments = CounterArgumentSerializer(many=True, read_only=True)

    toulmin = serializers.SerializerMethodField()
    scores = serializers.SerializerMethodField()

    class Meta:
        model = ArgumentAnalysis
        fields = [
            'id', 'raw_text', 'context', 'toulmin', 'scores',
            'fallacies', 'counterarguments', 'feedback', 'created_at'
        ]

    def get_toulmin(self, obj):
        return {
            'claim': obj.claim,
            'grounds': obj.grounds,
            'warrant': obj.warrant,
            'backing': obj.backing or '',
            'qualifier': obj.qualifier,
            'rebuttal': obj.rebuttal or '',
        }

    def get_scores(self, obj):
        return {
            'logic': obj.logic_score,
            'evidence': obj.evidence_score,
            'persuasiveness': obj.persuasiveness_score,
            'clarity': obj.clarity_score,
            'overall': obj.overall_score,
        }
