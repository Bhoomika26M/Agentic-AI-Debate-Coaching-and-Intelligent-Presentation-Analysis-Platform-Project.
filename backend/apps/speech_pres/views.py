import re
import logging
from pypdf.errors import PdfReadError
from rest_framework import generics, permissions, serializers, status
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView
from pypdf import PdfReader
from .models import SpeechSession, PresentationSession, SlideEvaluation
from .serializers import SpeechSessionSerializer, PresentationSessionSerializer
from apps.ai_engine.factory import get_ai_service

logger = logging.getLogger(__name__)
COMMON_FILLERS = ['um', 'uh', 'like', 'you know', 'basically', 'actually', 'sort of', 'kind of']
MAX_DECK_BYTES = 25 * 1024 * 1024
MAX_DECK_PAGES = 100
MAX_EXTRACTED_TEXT = 50000


class AnalyzeDeckRequestSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=255, required=False, allow_blank=True)
    deck_file = serializers.FileField(required=True, allow_empty_file=False)

    def validate_deck_file(self, file):
        if file.size > MAX_DECK_BYTES:
            raise serializers.ValidationError('PDF must be 25 MB or smaller.')
        header = file.read(5)
        file.seek(0)
        if header != b'%PDF-':
            raise serializers.ValidationError('Upload a valid PDF file.')
        return file

class AnalyzeSpeechView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        transcript = (request.data.get('transcript') or '').strip()
        if not transcript:
            return Response({'detail': 'transcript is required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            duration_seconds = float(request.data.get('duration_seconds', 45))
        except (TypeError, ValueError):
            return Response({'detail': 'duration_seconds must be a valid number.'}, status=status.HTTP_400_BAD_REQUEST)

        if duration_seconds <= 0 or duration_seconds > 3600:
            return Response({'detail': 'duration_seconds must be greater than 0 and no more than 3600 seconds.'}, status=status.HTTP_400_BAD_REQUEST)

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
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        request_serializer = AnalyzeDeckRequestSerializer(data=request.data)
        request_serializer.is_valid(raise_exception=True)
        deck_file = request_serializer.validated_data['deck_file']
        title = request_serializer.validated_data.get('title', '').strip() or deck_file.name[:255]
        slides_data = []
        try:
            reader = PdfReader(deck_file)
            if reader.is_encrypted:
                return Response({'detail': 'Password-protected PDFs are not supported.'}, status=status.HTTP_400_BAD_REQUEST)
            if not reader.pages or len(reader.pages) > MAX_DECK_PAGES:
                return Response(
                    {'detail': f'PDF must contain between 1 and {MAX_DECK_PAGES} pages.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            total_text = 0
            for idx, page in enumerate(reader.pages):
                text = (page.extract_text() or '').strip()
                total_text += len(text)
                if total_text > MAX_EXTRACTED_TEXT:
                    return Response(
                        {'detail': 'PDF contains too much extractable text to analyze (50,000 character limit).'},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                slides_data.append({'slide_number': idx + 1, 'text': text})
        except (PdfReadError, ValueError):
            return Response({'detail': 'The uploaded file could not be parsed as a PDF.'}, status=status.HTTP_400_BAD_REQUEST)
        except Exception:
            logger.exception('PDF parsing failed for presentation upload.')
            return Response({'detail': 'The uploaded PDF could not be read.'}, status=status.HTTP_400_BAD_REQUEST)

        if not any(slide['text'] for slide in slides_data):
            return Response(
                {'detail': 'No selectable text was found. Export the slides with selectable text and try again.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            critique = get_ai_service().evaluate_presentation_deck(slides_data, title=title)
        except Exception:
            logger.exception('Presentation analysis failed.')
            return Response(
                {'detail': 'Presentation analysis is temporarily unavailable. Please try again.'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        if request.user and request.user.is_authenticated:
            session = PresentationSession.objects.create(
                user=request.user,
                title=critique.title,
                total_slides=critique.total_slides,
                overall_score=critique.overall_score,
                summary=critique.summary,
                analysis_method=critique.analysis_method,
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


class SpeechSessionDetailView(generics.RetrieveAPIView):
    serializer_class = SpeechSessionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return SpeechSession.objects.filter(user=self.request.user)


class PresentationSessionListView(generics.ListAPIView):
    serializer_class = PresentationSessionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return PresentationSession.objects.filter(user=self.request.user).order_by('-created_at')


class PresentationSessionDetailView(generics.RetrieveAPIView):
    serializer_class = PresentationSessionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return PresentationSession.objects.filter(user=self.request.user).prefetch_related('slides')
