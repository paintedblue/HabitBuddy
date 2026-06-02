using HabitBuddy.Research;
using HabitBuddy.Routine;
using UnityEngine;

namespace HabitBuddy.UI
{
    public sealed class RoutineButtonBindings : MonoBehaviour
    {
        [SerializeField] private RoutineSessionController routine;
        [SerializeField] private ObserverNoteController observerNotes;

        public void OnStartCueClicked() => routine.StartCue();
        public void OnBeginRoutineClicked() => routine.BeginRoutine();
        public void OnPauseClicked() => routine.PauseRoutine();
        public void OnResumeClicked() => routine.ResumeRoutine();
        public void OnRewardViewedClicked() => routine.MarkRewardViewed();

        public void OnSaveObserverNoteClicked()
        {
            observerNotes.SaveNote(0, "medium", false, "");
        }
    }
}
