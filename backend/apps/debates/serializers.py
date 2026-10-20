from rest_framework import serializers
from .models import DebateTopic, DebateSession, DebateTurn

class DebateTopicSerializer(serializers.ModelSerializer):
    class Meta:
        model = DebateTopic
        fields = ['id', 'title', 'description', 'category', 'difficulty']

class DebateTurnSerializer(serializers.ModelSerializer):
    class Meta:
        model = DebateTurn
        fields = [
            'id', 'turn_number', 'speaker', 'transcript', 'turn_score',
            'analysis', 'created_at',
        ]

class DebateSessionSerializer(serializers.ModelSerializer):
    turns = DebateTurnSerializer(many=True, read_only=True)
    topic_title = serializers.CharField(read_only=True)

    class Meta:
        model = DebateSession
        fields = [
            'id', 'topic', 'topic_title', 'custom_topic_title', 'format',
            'user_stance', 'ai_stance', 'ai_persona', 'difficulty', 'status',
            'overall_score', 'evaluation', 'started_at', 'completed_at', 'turns'
        ]
        read_only_fields = [
            'ai_stance', 'status', 'overall_score', 'evaluation',
            'started_at', 'completed_at',
        ]

    def validate_custom_topic_title(self, value):
        topic = self.initial_data.get('topic')
        if not topic and not value.strip():
            raise serializers.ValidationError('Enter a debate topic.')
        if len(value.strip()) > 500:
            raise serializers.ValidationError('Topic must be 500 characters or fewer.')
        return value.strip()
