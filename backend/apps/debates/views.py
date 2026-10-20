from django.utils import timezone
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import DebateTopic, DebateSession, DebateTurn
from .serializers import DebateTopicSerializer, DebateSessionSerializer, DebateTurnSerializer
from apps.ai_engine.factory import get_ai_service

class DebateTopicListCreateView(generics.ListCreateAPIView):
    queryset = DebateTopic.objects.all().order_by('-created_at')
    serializer_class = DebateTopicSerializer
    permission_classes = [permissions.AllowAny]

class DebateSessionListCreateView(generics.ListCreateAPIView):
    serializer_class = DebateSessionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return DebateSession.objects.filter(user=self.request.user).order_by('-started_at')

    def perform_create(self, serializer):
        session = serializer.save(user=self.request.user)
        # Create initial opening turn from AI
        DebateTurn.objects.create(
            session=session,
            turn_number=0,
            speaker='AI',
            transcript=f"Welcome to this {session.format} debate on '{session.topic_title}'. You are arguing {session.user_stance}. Please deliver your constructive speech to open the round."
        )

class DebateSessionDetailView(generics.RetrieveAPIView):
    serializer_class = DebateSessionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return DebateSession.objects.filter(user=self.request.user)

class SubmitTurnView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            session = DebateSession.objects.get(pk=pk, user=request.user)
        except DebateSession.DoesNotExist:
            return Response({'detail': 'Debate session not found.'}, status=status.HTTP_404_NOT_FOUND)

        argument_text = request.data.get('argument_text', '').strip()
        if not argument_text:
            return Response({'detail': 'argument_text is required'}, status=status.HTTP_400_BAD_REQUEST)

        # 1. Retrieve current turn history
        turns = session.turns.all().order_by('turn_number')
        current_turn_count = turns.count()
        history = [{'speaker': t.speaker, 'transcript': t.transcript} for t in turns]

        # 2. Invoke AI Service
        ai_service = get_ai_service()
        ai_resp = ai_service.generate_debate_turn(
            topic=session.topic_title,
            format_type=session.format,
            user_stance=session.user_stance,
            ai_stance=session.ai_stance,
            ai_persona=session.ai_persona,
            user_argument=argument_text,
            turn_history=history
        )

        # 3. Save User turn
        user_turn = DebateTurn.objects.create(
            session=session,
            turn_number=current_turn_count,
            speaker='USER',
            transcript=argument_text,
            turn_score=ai_resp.analysis.scores.overall
        )

        # 4. Save AI turn
        ai_turn = DebateTurn.objects.create(
            session=session,
            turn_number=current_turn_count + 1,
            speaker='AI',
            transcript=ai_resp.ai_rebuttal
        )

        return Response({
            'user_turn': DebateTurnSerializer(user_turn).data,
            'ai_turn': DebateTurnSerializer(ai_turn).data,
            'analysis': ai_resp.analysis.model_dump(),
            'ai_rebuttal': ai_resp.ai_rebuttal,
            'persona_notes': ai_resp.persona_notes
        }, status=status.HTTP_200_OK)

class ConcludeSessionView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            session = DebateSession.objects.get(pk=pk, user=request.user)
        except DebateSession.DoesNotExist:
            return Response({'detail': 'Debate session not found.'}, status=status.HTTP_404_NOT_FOUND)

        # Compute average user score
        user_turns = session.turns.filter(speaker='USER', turn_score__isnull=False)
        avg_score = 75
        if user_turns.exists():
            scores = [t.turn_score for t in user_turns]
            avg_score = int(sum(scores) / len(scores))

        session.status = 'COMPLETED'
        session.overall_score = avg_score
        session.completed_at = timezone.now()
        session.save()

        return Response(DebateSessionSerializer(session).data)
