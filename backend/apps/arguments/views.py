from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import ArgumentAnalysis, LogicalFallacyInstance, CounterArgument
from .serializers import ArgumentAnalysisSerializer
from apps.ai_engine.factory import get_ai_service

class AnalyzeArgumentView(APIView):
    permission_classes = [permissions.AllowAny] # Allow test submissions or authenticated

    def post(self, request):
        argument_text = request.data.get('argument_text', '').strip()
        context = request.data.get('context', '').strip()

        if not argument_text:
            return Response({'detail': 'argument_text is required'}, status=status.HTTP_400_BAD_REQUEST)

        ai_service = get_ai_service()
        result = ai_service.analyze_argument(argument_text, context=context)

        # If user is authenticated, persist to database
        if request.user and request.user.is_authenticated:
            analysis = ArgumentAnalysis.objects.create(
                user=request.user,
                raw_text=argument_text,
                context=context,
                claim=result.toulmin.claim,
                grounds=result.toulmin.grounds,
                warrant=result.toulmin.warrant,
                qualifier=result.toulmin.qualifier,
                logic_score=result.scores.logic,
                evidence_score=result.scores.evidence,
                persuasiveness_score=result.scores.persuasiveness,
                clarity_score=result.scores.clarity,
                overall_score=result.scores.overall,
                feedback=result.feedback
            )

            for f in result.fallacies:
                LogicalFallacyInstance.objects.create(
                    analysis=analysis,
                    fallacy_type=f.type,
                    excerpt=f.excerpt,
                    explanation=f.explanation,
                    suggested_correction=f.correction
                )

            for c in result.counterarguments:
                CounterArgument.objects.create(
                    analysis=analysis,
                    perspective=c.perspective,
                    counter_claim=c.claim,
                    counter_evidence=c.counter_evidence or ''
                )

            return Response(ArgumentAnalysisSerializer(analysis).data, status=status.HTTP_201_CREATED)

        # If unauthenticated, return computed Pydantic schema dictionary
        return Response(result.model_dump(), status=status.HTTP_200_OK)

class ArgumentHistoryView(generics.ListAPIView):
    serializer_class = ArgumentAnalysisSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return ArgumentAnalysis.objects.filter(user=self.request.user).order_by('-created_at')

class ArgumentDetailView(generics.RetrieveAPIView):
    serializer_class = ArgumentAnalysisSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return ArgumentAnalysis.objects.filter(user=self.request.user)
