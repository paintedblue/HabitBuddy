using System;
using HabitBuddy.Domain;
using HabitBuddy.Routine;
using HabitBuddy.UI;
using UnityEngine;

namespace HabitBuddy.Research
{
    public sealed class ObserverNoteController : MonoBehaviour
    {
        [SerializeField] private RoutineSessionController routine;
        [SerializeField] private ResearchLogStore store;
        [SerializeField] private StampBoardPanel stampBoard;

        public void SaveNote(int parentPromptCount, string engagement, bool leftRoutine, string note)
        {
            var session = routine.ActiveSession;
            if (session == null) return;

            routine.MarkRewardViewed();
            store.SaveOrUpdateSession(session);
            store.SaveObserverNote(new ObserverNote
            {
                Id = $"note-{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}",
                SessionId = session.Id,
                ParentPromptCount = parentPromptCount,
                Engagement = engagement,
                LeftRoutine = leftRoutine,
                Note = note,
                CreatedAtIso = DateTimeOffset.UtcNow.ToString("O")
            });
            stampBoard?.Refresh();
        }
    }
}
