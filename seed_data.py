import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from apps.users.models import CustomUser, UserProfile, RoleChoices
from apps.debates.models import DebateTopic

def seed():
    print("Seeding initial users and debate topics...")

    users_to_create = [
        {'username': 'alex_debater', 'email': 'alex@college.edu', 'role': RoleChoices.LEARNER, 'password': 'password123'},
        {'username': 'sarah_coach', 'email': 'coach.sarah@college.edu', 'role': RoleChoices.COACH, 'password': 'password123'},
        {'username': 'prof_harrison', 'email': 'harrison@college.edu', 'role': RoleChoices.EDUCATOR, 'password': 'password123'},
        {'username': 'admin', 'email': 'admin@platform.ai', 'role': RoleChoices.ADMIN, 'password': 'adminpassword123'},
    ]

    for u in users_to_create:
        if not CustomUser.objects.filter(username=u['username']).exists():
            user = CustomUser.objects.create_user(
                username=u['username'],
                email=u['email'],
                password=u['password'],
                role=u['role'],
                is_staff=u['role'] == RoleChoices.ADMIN,
                is_superuser=u['role'] == RoleChoices.ADMIN
            )
            UserProfile.objects.get_or_create(user=user, defaults={'bio': f'{u["role"]} demo account'})
            print(f"Created user: {u['username']} ({u['role']})")
        else:
            print(f"User already exists: {u['username']}")

    topics = [
        {
            'title': 'Universal Basic Income is Essential in the Era of Exponential AI',
            'description': 'Debates the necessity of unconditional cash transfers to mitigate rapid algorithmic displacement of cognitive and manual labor.',
            'category': 'ECONOMICS & AI',
            'difficulty': 'COLLEGIATE'
        },
        {
            'title': 'Autonomous Weapons Systems Should Be Globally Prohibited by International Treaty',
            'description': 'Examines ethical, legal, and strategic implications of lethal autonomous weapons devoid of human-in-the-loop discretion.',
            'category': 'ETHICS & DEFENSE',
            'difficulty': 'CHAMPIONSHIP'
        },
        {
            'title': 'Social Media Algorithmic Curation Harms Democratic Deliberation',
            'description': 'Evaluates polarization, epistemic bubbles, and public sphere fragmentation driven by engagement-maximizing neural recommendation feeds.',
            'category': 'MEDIA & POLITICS',
            'difficulty': 'COLLEGIATE'
        },
        {
            'title': 'Carbon Border Taxes Are Justified to Combat Global Climate Externalities',
            'description': 'Analyzes the intersection of international trade, carbon leakage, and global climate equity under WTO frameworks.',
            'category': 'ENVIRONMENT & TRADE',
            'difficulty': 'INTERMEDIATE'
        }
    ]

    for t in topics:
        topic, created = DebateTopic.objects.get_or_create(title=t['title'], defaults=t)
        if created:
            print(f"Created topic: {topic.title}")
        else:
            print(f"Topic already exists: {topic.title}")

    print("Seed complete!")

if __name__ == '__main__':
    seed()
