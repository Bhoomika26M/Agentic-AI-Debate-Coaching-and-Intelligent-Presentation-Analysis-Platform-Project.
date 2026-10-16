from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from app.models.user import User, Profile, UserSkill, LearningGoal, Notification, UserRole
from app.core.security import hash_password

class UserRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, user_id: str) -> Optional[User]:
        return self.db.query(User).filter(User.id == user_id).first()

    def get_by_email(self, email: str) -> Optional[User]:
        return self.db.query(User).filter(User.email == email.lower()).first()

    def list_users(self, limit: int = 100, role: Optional[str] = None) -> List[User]:
        query = self.db.query(User)
        if role:
            query = query.filter(User.role == role)
        return query.limit(limit).all()

    def create_user(
        self,
        email: str,
        password: str,
        full_name: str,
        role: str = UserRole.LEARNER,
        avatar_url: Optional[str] = None,
    ) -> User:
        user = User(
            email=email.lower(),
            hashed_password=hash_password(password),
            full_name=full_name,
            role=role,
            avatar_url=avatar_url,
        )
        self.db.add(user)
        self.db.flush()

        # Initialize profile
        profile = Profile(
            user_id=user.id,
            experience_level="Novice",
            preferred_topics=["AI & Technology", "Ethics", "Economics"],
            presentation_domains=["Oxford Debate", "Public Forum"],
            coaching_preferences="Socratic & Balanced",
            debater_xp=100,
            debater_level=1,
            badges=["Rookie Debater"],
            streak_days=1,
        )
        self.db.add(profile)

        # Initialize skills
        skills = UserSkill(
            user_id=user.id,
            clarity_score=72.0,
            reasoning_score=70.0,
            evidence_score=68.0,
            rebuttal_score=65.0,
            delivery_score=75.0,
            confidence_index=72.0,
        )
        self.db.add(skills)

        self.db.commit()
        self.db.refresh(user)
        return user

    def update_role(self, user_id: str, new_role: str) -> Optional[User]:
        user = self.get_by_id(user_id)
        if user:
            user.role = new_role
            self.db.commit()
            self.db.refresh(user)
        return user

    def get_profile(self, user_id: str) -> Optional[Profile]:
        return self.db.query(Profile).filter(Profile.user_id == user_id).first()

    def update_profile(self, user_id: str, updates: Dict[str, Any]) -> Optional[Profile]:
        profile = self.get_profile(user_id)
        if not profile:
            return None
        for key, value in updates.items():
            if value is not None and hasattr(profile, key):
                setattr(profile, key, value)
        self.db.commit()
        self.db.refresh(profile)
        return profile

    def add_xp(self, user_id: str, xp: int) -> Optional[Profile]:
        profile = self.get_profile(user_id)
        if profile:
            profile.debater_xp += xp
            # Calculate debater level: every 300 XP = 1 level
            new_level = max(1, 1 + (profile.debater_xp // 300))
            profile.debater_level = new_level
            self.db.commit()
            self.db.refresh(profile)
        return profile

    def get_skills(self, user_id: str) -> Optional[UserSkill]:
        return self.db.query(UserSkill).filter(UserSkill.user_id == user_id).first()

    def update_skills(self, user_id: str, updates: Dict[str, Any]) -> Optional[UserSkill]:
        skills = self.get_skills(user_id)
        if not skills:
            return None
        for key, value in updates.items():
            if value is not None and hasattr(skills, key):
                setattr(skills, key, value)
        self.db.commit()
        self.db.refresh(skills)
        return skills

    def list_goals(self, user_id: str) -> List[LearningGoal]:
        return self.db.query(LearningGoal).filter(LearningGoal.user_id == user_id).all()

    def create_goal(self, user_id: str, title: str, description: Optional[str], target_score: float, category: str) -> LearningGoal:
        goal = LearningGoal(
            user_id=user_id,
            title=title,
            description=description,
            target_score=target_score,
            category=category,
        )
        self.db.add(goal)
        self.db.commit()
        self.db.refresh(goal)
        return goal

    def update_goal(self, goal_id: str, updates: Dict[str, Any]) -> Optional[LearningGoal]:
        goal = self.db.query(LearningGoal).filter(LearningGoal.id == goal_id).first()
        if goal:
            for key, value in updates.items():
                if value is not None and hasattr(goal, key):
                    setattr(goal, key, value)
            self.db.commit()
            self.db.refresh(goal)
        return goal

    def delete_goal(self, goal_id: str) -> bool:
        goal = self.db.query(LearningGoal).filter(LearningGoal.id == goal_id).first()
        if goal:
            self.db.delete(goal)
            self.db.commit()
            return True
        return False
