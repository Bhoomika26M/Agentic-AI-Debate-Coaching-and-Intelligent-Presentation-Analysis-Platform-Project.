from rest_framework import serializers
from .models import DebateTopic, DebateSession, DebateTurn

class DebateTopicSerializer(serializers.ModelSerializer):
    class Meta:
        model = DebateTopic
        fields = ['id', 'title', 'description', 'category', 'difficulty']

class DebateTurnSerializer(serializers.ModelSerializer):
    class Meta:
        model = DebateTurn
        fields = ['id', 'turn_number', 'speaker', 'transcript', 'turn_score', 'created_at']

class DebateSessionSerializer(serializers.ModelSerializer):
    turns = DebateTurnSerializer(many=True, read_only=True)
    topic_title = serializers.CharField(read_only=True)

    class Meta:
        model = DebateSession
        fields = [
            'id', 'topic', 'topic_title', 'custom_topic_title', 'format',
            'user_stance', 'ai_stance', 'ai_persona', 'status',
            'overall_score', 'started_at', 'completed_at', 'turns'
        ]
        read_only_fields = ['status', 'overall_score', 'started_at', 'completed_at']
