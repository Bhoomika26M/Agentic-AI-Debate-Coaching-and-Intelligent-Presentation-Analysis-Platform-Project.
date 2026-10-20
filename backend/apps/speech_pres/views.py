import re
import io
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from pypdf import PdfReader
from .models import SpeechSession, PresentationSession, SlideEvaluation
from .serializers import SpeechSessionSerializer, PresentationSessionSerializer
from apps.ai_engine.factory import get_ai_service

COMMON_FILLERS = ['um', 'uh', 'like', 'you know', 'basically', 'actually', 'sort of', 'kind of']

class AnalyzeSpeechView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        transcript = request.data.get('transcript', '').strip()
        duration_seconds = float(request.data.get('duration_seconds', 45))

        if not transcript:
            return Response({'detail': 'transcript is required'}, status=status.HTTP_400_BAD_REQUEST)

        # Count filler words
        filler_breakdown = {}
        total_fillers = 0
        text_lower = transcript.lower()
        for filler in COMMON_FILLERS:
            count = len(re.findall(r'\b' + re.escape(filler) + r'\b', text_lower))
            if count > 0:
                filler_breakdown[filler] = count
                total_fillers += count

        ai_service = get_ai_service()
        critique = ai_service.evaluate_speech(transcript, duration_seconds, filler_breakdown)

        if request.user and request.user.is_authenticated:
            session = SpeechSession.objects.create(
                user=request.user,
                transcript=transcript,
                duration_seconds=duration_seconds,
                words_per_minute=critique.wpm,
                filler_word_count=total_fillers,
                filler_word_breakdown=filler_breakdown,
                pacing_score=critique.scores.get('pacing', 80),
                articulation_score=critique.scores.get('articulation', 80),
                overall_score=critique.scores.get('overall_delivery', 80),
                feedback=critique.feedback
            )
            return Response(SpeechSessionSerializer(session).data, status=status.HTTP_201_CREATED)

        return Response(critique.model_dump(), status=status.HTTP_200_OK)

class AnalyzeDeckView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        title = request.data.get('title', 'Uploaded Slide Deck')
        deck_file = request.FILES.get('deck_file')

        slides_data = []
        if deck_file:
            try:
                reader = PdfReader(deck_file)
                for idx, page in enumerate(reader.pages):
                    text = page.extract_text() or ''
                    slides_data.append({
                        'slide_number': idx + 1,
                        'text': text.strip()
                    })
            except Exception as e:
                return Response({'detail': f'Failed to parse PDF: {str(e)}'}, status=status.HTTP_400_BAD_REQUEST)
        else:
            # Demonstration mock slides if testing without PDF file
            slides_data = [
                {'slide_number': 1, 'text': 'Title Slide: Collegiate AI Governance and Moral Accountability'},
                {'slide_number': 2, 'text': 'Problem Statement: High-frequency decision algorithms generate unpredictable systemic risks across automated civil infrastructure.'},
                {'slide_number': 3, 'text': 'Audit Framework: Multi-tiered oversight ensuring constitutional alignment, explainability standards, and human discretionary veto power.'}
            ]

        ai_service = get_ai_service()
        critique = ai_service.evaluate_presentation_deck(slides_data, title=title)

        if request.user and request.user.is_authenticated:
            session = PresentationSession.objects.create(
                user=request.user,
                title=critique.title,
                total_slides=critique.total_slides,
                overall_score=critique.overall_score,
                summary=critique.summary,
                deck_file=deck_file
            )

            for s in critique.slides:
                SlideEvaluation.objects.create(
                    presentation=session,
                    slide_number=s.slide_number,
                    headline=s.headline,
                    word_count=s.word_count,
                    density_rating=s.density_rating,
                    visual_structure_score=s.visual_structure_score,
                    clarity_score=s.clarity_score,
                    critique=s.critique,
                    recommendation=s.recommendation
                )

            return Response(PresentationSessionSerializer(session).data, status=status.HTTP_201_CREATED)

        return Response(critique.model_dump(), status=status.HTTP_200_OK)

class SpeechSessionListView(generics.ListAPIView):
    serializer_class = SpeechSessionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return SpeechSession.objects.filter(user=self.request.user).order_by('-created_at')

class PresentationSessionListView(generics.ListAPIView):
    serializer_class = PresentationSessionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return PresentationSession.objects.filter(user=self.request.user).order_by('-created_at')
