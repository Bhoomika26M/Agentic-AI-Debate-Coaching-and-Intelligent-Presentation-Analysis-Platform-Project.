import logging

from django.db import transaction
from rest_framework import generics, permissions, serializers, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.ai_engine.factory import get_ai_service
from apps.debates.models import DebateSession

from .models import ArgumentAnalysis, CounterArgument, LogicalFallacyInstance
from .serializers import ArgumentAnalysisSerializer

logger = logging.getLogger(__name__)


class ArgumentAnalysisRequestSerializer(serializers.Serializer):
    argument_text = serializers.CharField(max_length=10000, trim_whitespace=True)
    context = serializers.CharField(max_length=2000, required=False, allow_blank=True, default='')
    debate_session_id = serializers.UUIDField(required=False, allow_null=True)

    def validate_argument_text(self, value):
        if not value:
            raise serializers.ValidationError('Enter an argument to analyze.')
        return value


def _run_analysis(request):
    serializer = ArgumentAnalysisRequestSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    values = serializer.validated_data

    session_id = values.get('debate_session_id')
    if session_id and not request.user.is_authenticated:
        raise serializers.ValidationError({
            'debate_session_id': 'Sign in to associate an analysis with a debate session.'
        })
    session = None
    if session_id:
        session = DebateSession.objects.filter(pk=session_id, user=request.user).first()
        if session is None:
            raise serializers.ValidationError({
                'debate_session_id': 'The debate session does not exist or is not yours.'
            })

    result = get_ai_service().analyze_argument(values['argument_text'], context=values['context'])
    if not request.user.is_authenticated:
        return Response(result.model_dump(), status=status.HTTP_200_OK)

    with transaction.atomic():
        report = ArgumentAnalysis.objects.create(
            user=request.user,
            debate_session=session,
            raw_text=values['argument_text'],
            context=values['context'],
            analysis_method=result.analysis_method,
            supporting_claims=result.supporting_claims,
            evidence=result.evidence,
            reasoning_weaknesses=result.reasoning_weaknesses,
            recommendations=result.recommendations,
            improved_argument=result.improved_argument,
            claim=result.toulmin.claim,
            grounds=result.toulmin.grounds,
            warrant=result.toulmin.warrant,
            backing=result.toulmin.backing,
            qualifier=result.toulmin.qualifier,
            rebuttal=result.toulmin.rebuttal,
            logic_score=result.scores.logic,
            evidence_score=result.scores.evidence,
            relevance_score=result.scores.relevance,
            persuasiveness_score=result.scores.persuasiveness,
            clarity_score=result.scores.clarity,
            overall_score=result.scores.overall,
            feedback=result.feedback,
        )
        LogicalFallacyInstance.objects.bulk_create([
            LogicalFallacyInstance(
                analysis=report,
                fallacy_type=item.type,
                excerpt=item.excerpt,
                explanation=item.explanation,
                suggested_correction=item.correction,
                confidence=item.confidence,
            )
            for item in result.fallacies
        ])
        CounterArgument.objects.bulk_create([
            CounterArgument(
                analysis=report,
                perspective=item.perspective,
                counter_claim=item.claim,
                counter_evidence=item.counter_evidence or '',
            )
            for item in result.counterarguments
        ])
    return Response(ArgumentAnalysisSerializer(report).data, status=status.HTTP_201_CREATED)


class AnalyzeArgumentView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        try:
            return _run_analysis(request)
        except serializers.ValidationError:
            raise
        except Exception:
            logger.exception('Argument analysis failed.')
            return Response(
                {'detail': 'Argument analysis is temporarily unavailable. Please try again.'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )


class DetectFallaciesView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = ArgumentAnalysisRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        values = serializer.validated_data
        try:
            result = get_ai_service().analyze_argument(
                values['argument_text'],
                context=values['context'],
            )
        except Exception:
            logger.exception('Fallacy detection failed.')
            return Response(
                {'detail': 'Fallacy detection is temporarily unavailable. Please try again.'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        return Response({
            'analysis_method': result.analysis_method,
            'fallacies': [item.model_dump() for item in result.fallacies],
            'uncertain': not result.fallacies,
            'message': (
                'No clear supported fallacy was identified; this does not prove the argument is fallacy-free.'
                if not result.fallacies else ''
            ),
        })


class ArgumentHistoryView(generics.ListAPIView):
    serializer_class = ArgumentAnalysisSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return (
            ArgumentAnalysis.objects
            .filter(user=self.request.user)
            .select_related('debate_session')
            .prefetch_related('fallacies', 'counterarguments')
            .order_by('-created_at')
        )


class ArgumentDetailView(generics.RetrieveAPIView):
    serializer_class = ArgumentAnalysisSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return (
            ArgumentAnalysis.objects
            .filter(user=self.request.user)
            .select_related('debate_session')
            .prefetch_related('fallacies', 'counterarguments')
        )
