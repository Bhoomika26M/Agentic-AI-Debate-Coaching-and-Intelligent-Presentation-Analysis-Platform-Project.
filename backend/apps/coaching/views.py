from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions, status

class CoachingRecommendationsView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        return Response({
            'focus_area': 'Slippery Slope Elimination & Warrant Pinning',
            'rationale': 'Across recent rounds, intermediate causal links lacked empirical backing.',
            'drills_completed': 14,
            'drills_total': 20,
            'level': 'Level 3 Debater (Varsity Track)'
        })

class DrillsListView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        return Response([
            {
                'id': 1,
                'type': 'Fallacy Spotting',
                'title': 'Countering the Slippery Slope',
                'scenario': 'Opponent statement: "If we permit AI tools to assist medical diagnostics, doctors will completely lose the ability to think independently, medicine will degenerate, and humanity will succumb to algorithmically caused plagues."',
                'task': 'Identify the exact logical fallacy and draft a 2-sentence crisp refutation exposing the causal breakdown.',
                'targetSkill': 'Logical Consistency',
            },
            {
                'id': 2,
                'type': 'Rapid Rebuttal',
                'title': 'Warrant Breakdown on Economic Policy',
                'scenario': 'Opponent statement: "Corporate taxation must be slashed to zero because capital investment creates jobs, and jobs are the sole determinant of national prosperity."',
                'task': 'Challenge the unstated warrant regarding infrastructure, public goods, and deficit displacement.',
                'targetSkill': 'Toulmin Warrant Analysis',
            },
            {
                'id': 3,
                'type': 'Pacing & Cadence Drill',
                'title': 'Eliminating the "Basically" Crutch',
                'scenario': 'Deliver a 30-second constructive argument on space exploration without using the words "basically", "like", or "um". Focus on vocal breathing.',
                'targetSkill': 'Verbal Cadence',
            },
        ])

class SubmitDrillView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request, pk):
        submission = request.data.get('submission', '').strip()
        if not submission:
            return Response({'detail': 'submission is required'}, status=status.HTTP_400_BAD_REQUEST)

        return Response({
            'score': 92,
            'strengths': 'Accurately isolated the multi-step non-sequitur jump between diagnostic assistance and systemic medical collapse.',
            'coachingTip': 'To make your rebuttal even sharper, point out that diagnostic AI operates within human peer-review protocols.',
        })
