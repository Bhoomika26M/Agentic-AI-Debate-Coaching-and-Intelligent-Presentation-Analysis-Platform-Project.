import logging

from django.db import IntegrityError, transaction
from django.utils import timezone
from rest_framework import generics, permissions, serializers, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.ai_engine.factory import get_ai_service

from .feedback import build_debate_evaluation
from .models import DebateSession, DebateTopic, DebateTurn
from .serializers import DebateSessionSerializer, DebateTopicSerializer, DebateTurnSerializer

logger = logging.getLogger(__name__)


class DebateTopicListCreateView(generics.ListCreateAPIView):
    queryset = DebateTopic.objects.all().order_by('-created_at')
    serializer_class = DebateTopicSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]


class DebateSessionListCreateView(generics.ListCreateAPIView):
    serializer_class = DebateSessionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return (
            DebateSession.objects
            .filter(user=self.request.user)
            .select_related('topic')
            .prefetch_related('turns')
            .order_by('-started_at')
        )

    def perform_create(self, serializer):
        stance = serializer.validated_data.get('user_stance', 'AFFIRMATIVE')
        ai_stance = 'NEGATIVE' if stance == 'AFFIRMATIVE' else 'AFFIRMATIVE'
        session = serializer.save(user=self.request.user, ai_stance=ai_stance)
        DebateTurn.objects.create(
            session=session,
            turn_number=0,
            speaker='AI',
            transcript=(
                f"Debate resolution: {session.topic_title}. "
                f"You are arguing {session.get_user_stance_display()} and I will argue "
                f"{session.get_ai_stance_display()}. Difficulty: {session.get_difficulty_display()}. "
                "Present your opening argument with a clear claim, reasons, and any evidence you can verify."
            ),
        )


class DebateSessionDetailView(generics.RetrieveAPIView):
    serializer_class = DebateSessionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return (
            DebateSession.objects
            .filter(user=self.request.user)
            .select_related('topic')
            .prefetch_related('turns')
        )


class SubmitTurnRequestSerializer(serializers.Serializer):
    argument_text = serializers.CharField(max_length=10000, trim_whitespace=True)
    client_turn_id = serializers.UUIDField(required=False)

    def validate_argument_text(self, value):
        if not value:
            raise serializers.ValidationError('Enter an argument before submitting.')
        return value


def _turn_response(user_turn, ai_turn):
    return Response({
        'user_turn': DebateTurnSerializer(user_turn).data,
        'ai_turn': DebateTurnSerializer(ai_turn).data,
        'analysis': user_turn.analysis,
        'ai_rebuttal': ai_turn.transcript,
        'counterargument': user_turn.analysis.get('strongest_counterargument', ''),
        'logical_rebuttal': user_turn.analysis.get('logical_rebuttal', ''),
        'alternative_perspective': user_turn.analysis.get('alternative_perspective', ''),
        'evidence_guidance': user_turn.analysis.get('evidence_guidance', ''),
        'follow_up_question': user_turn.analysis.get('follow_up_question', ''),
        'next_response_suggestions': user_turn.analysis.get('next_response_suggestions', []),
        'response_method': user_turn.analysis.get('response_method', 'rule_based'),
    })


class SubmitTurnView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        input_serializer = SubmitTurnRequestSerializer(data=request.data)
        input_serializer.is_valid(raise_exception=True)
        argument_text = input_serializer.validated_data['argument_text']
        client_turn_id = input_serializer.validated_data.get('client_turn_id')

        try:
            session = DebateSession.objects.get(pk=pk, user=request.user)
        except DebateSession.DoesNotExist:
            return Response({'detail': 'Debate session not found.'}, status=status.HTTP_404_NOT_FOUND)
        if session.status != 'IN_PROGRESS':
            return Response({'detail': 'This debate is already finished.'}, status=status.HTTP_400_BAD_REQUEST)

        if client_turn_id:
            existing_turn = DebateTurn.objects.filter(
                session=session,
                speaker='USER',
                client_turn_id=client_turn_id,
            ).first()
            if existing_turn:
                existing_ai_turn = DebateTurn.objects.filter(
                    session=session,
                    turn_number=existing_turn.turn_number + 1,
                    speaker='AI',
                ).first()
                if existing_ai_turn:
                    return _turn_response(existing_turn, existing_ai_turn)

        turns = list(session.turns.order_by('turn_number', 'created_at'))
        history = [
            {'speaker': turn.speaker, 'transcript': turn.transcript}
            for turn in turns[-12:]
        ]
        try:
            ai_response = get_ai_service().generate_debate_turn(
                topic=session.topic_title,
                format_type=(
                    f"{session.get_format_display()}, {session.get_difficulty_display()} difficulty"
                ),
                user_stance=session.get_user_stance_display(),
                ai_stance=session.get_ai_stance_display(),
                ai_persona=session.ai_persona,
                user_argument=argument_text,
                turn_history=history,
            )
        except Exception:
            logger.exception('Debate opponent response generation failed for session %s.', session.pk)
            return Response(
                {'detail': 'The debate response could not be generated. Your turn was not saved; please retry.'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        next_turn_number = max((turn.turn_number for turn in turns), default=-1) + 1
        try:
            with transaction.atomic():
                user_turn = DebateTurn.objects.create(
                    session=session,
                    turn_number=next_turn_number,
                    speaker='USER',
                    transcript=argument_text,
                    turn_score=ai_response.analysis.scores.overall,
                    analysis=ai_response.model_dump(mode='json'),
                    client_turn_id=client_turn_id,
                )
                ai_turn = DebateTurn.objects.create(
                    session=session,
                    turn_number=next_turn_number + 1,
                    speaker='AI',
                    transcript=ai_response.ai_rebuttal,
                )
        except IntegrityError:
            if client_turn_id:
                existing_turn = DebateTurn.objects.filter(
                    session=session,
                    speaker='USER',
                    client_turn_id=client_turn_id,
                ).first()
                if existing_turn:
                    existing_ai_turn = DebateTurn.objects.filter(
                        session=session,
                        turn_number=existing_turn.turn_number + 1,
                        speaker='AI',
                    ).first()
                    if existing_ai_turn:
                        return _turn_response(existing_turn, existing_ai_turn)
            logger.exception('Could not save debate turns for session %s.', session.pk)
            return Response(
                {'detail': 'Your debate turn could not be saved. Please retry.'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        return _turn_response(user_turn, ai_turn)


class ConcludeSessionView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            session = DebateSession.objects.get(pk=pk, user=request.user)
        except DebateSession.DoesNotExist:
            return Response({'detail': 'Debate session not found.'}, status=status.HTTP_404_NOT_FOUND)

        if session.status == 'COMPLETED':
            return Response(DebateSessionSerializer(session).data)

        evaluation = build_debate_evaluation(session)
        session.status = 'COMPLETED'
        session.overall_score = evaluation['overall_score']
        session.evaluation = evaluation
        session.completed_at = timezone.now()
        session.save(update_fields=['status', 'overall_score', 'evaluation', 'completed_at'])
        return Response(DebateSessionSerializer(session).data)
