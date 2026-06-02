using System;
using System.Collections.Generic;

namespace HabitBuddy.Domain
{
    public enum RoutinePhase
    {
        Cue,
        Routine,
        Reward
    }

    public enum RoutineEventType
    {
        SessionStarted,
        CueStarted,
        CueCompleted,
        RoutineStarted,
        RoutinePaused,
        RoutineResumed,
        RoutineCompleted,
        RoutineCancelled,
        RewardViewed
    }

    [Serializable]
    public sealed class ChildProfile
    {
        public string Id = "local-child";
        public string Name = "";
        public string HardHabit = "이 닦기";
        public string HabitBarrier = "귀찮아요";
        public string DreamIdentity = "우주비행사";
        public string DreamIdentityCustom = "";
        public string FavoriteFood = "";
        public string FriendName = "";
        public string CharacterId = "bear";
    }

    [Serializable]
    public sealed class HabitTemplate
    {
        public string Id = "brush";
        public string DisplayName = "이 닦기";
        public int DurationSeconds = 120;
        public string ProgressLyric = "위아래로 싹싹싹";
    }

    public static class HabitCatalog
    {
        public static HabitTemplate Brushing => new()
        {
            Id = "brush",
            DisplayName = "이 닦기",
            DurationSeconds = 120,
            ProgressLyric = "위아래로 싹싹싹"
        };

        public static HabitTemplate Handwashing => new()
        {
            Id = "wash",
            DisplayName = "손 씻기",
            DurationSeconds = 60,
            ProgressLyric = "거품거품 뽀글뽀글"
        };
    }

    [Serializable]
    public sealed class RoutineEvent
    {
        public string Id;
        public RoutineEventType Type;
        public string AtIso;
    }

    [Serializable]
    public sealed class RoutineSession
    {
        public string Id;
        public string ChildId;
        public string HabitId;
        public string StartedAtIso;
        public string CompletedAtIso;
        public RoutinePhase Phase;
        public int Stars;
        public List<RoutineEvent> Events = new();
    }

    [Serializable]
    public sealed class ObserverNote
    {
        public string Id;
        public string SessionId;
        public int ParentPromptCount;
        public string Engagement;
        public bool LeftRoutine;
        public string Note;
        public string CreatedAtIso;
    }
}
