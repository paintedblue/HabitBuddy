using System;
using System.Collections;
using HabitBuddy.Character;
using HabitBuddy.Domain;
using HabitBuddy.Research;
using HabitBuddy.UI;
using HabitBuddy.World;
using UnityEngine;

namespace HabitBuddy.Routine
{
    public sealed class RoutineSessionController : MonoBehaviour
    {
        [SerializeField] private CharacterAnimationController character;
        [SerializeField] private RoutineUiPresenter ui;
        [SerializeField] private AudioSource cueSong;
        [SerializeField] private AudioSource routineSong;
        [SerializeField] private AudioSource rewardSound;
        [SerializeField] private PhaseLightingController lighting;
        [SerializeField] private RewardConfettiController confetti;
        [SerializeField] private RoutineSceneDirector sceneDirector;
        [SerializeField] private ParentCompletionGatePanel parentCompletionGate;
        [SerializeField] private ResearchLogStore store;
        [SerializeField] private StampBoardPanel stampBoard;
        [SerializeField] private HabitTemplate activeHabit = new();
        [SerializeField] private ChildProfile profile = new();

        public RoutineSession ActiveSession { get; private set; }
        public ChildProfile Profile => profile;
        public int SecondsLeft { get; private set; }
        public bool IsPaused { get; private set; }
        public bool AwaitingParentConfirmation { get; private set; }

        private float elapsed;
        private Coroutine selectedHabitFlow;

        private void Update()
        {
            if (ActiveSession == null || ActiveSession.Phase != RoutinePhase.Routine || IsPaused) return;
            elapsed += Time.deltaTime;
            if (elapsed < 1f) return;
            elapsed = 0f;
            SecondsLeft = Mathf.Max(0, SecondsLeft - 1);
            ui.ShowRoutine(SecondsLeft, LyricComposer.Routine(profile, activeHabit));
            if (SecondsLeft == 0) RequestParentConfirmation();
        }

        public void StartCue()
        {
            StopSelectedHabitFlow();
            ActiveSession = new RoutineSession
            {
                Id = $"routine-{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}",
                ChildId = profile.Id,
                HabitId = activeHabit.Id,
                StartedAtIso = DateTimeOffset.UtcNow.ToString("O"),
                Phase = RoutinePhase.Cue
            };
            AddEvent(RoutineEventType.SessionStarted);
            AddEvent(RoutineEventType.CueStarted);
            sceneDirector?.FocusMainRoom();
            character.PlayAppear();
            cueSong?.Play();
            lighting?.Apply(RoutinePhase.Cue);
            ui.ShowCue(LyricComposer.Cue(profile, activeHabit));
        }

        public void StartSelectedHabitIntro()
        {
            StopSelectedHabitFlow();
            selectedHabitFlow = StartCoroutine(SelectedHabitIntro());
        }

        public void BeginRoutine()
        {
            StopSelectedHabitFlow(false);
            if (ActiveSession == null) return;
            AddEvent(RoutineEventType.CueCompleted);
            AddEvent(RoutineEventType.RoutineStarted);
            ActiveSession.Phase = RoutinePhase.Routine;
            SecondsLeft = activeHabit.DurationSeconds;
            elapsed = 0f;
            IsPaused = false;
            AwaitingParentConfirmation = false;
            sceneDirector?.Focus(activeHabit);
            cueSong?.Stop();
            if (IsBrushingHabit(activeHabit)) character.PlayCoPerform();
            else character.PlayCelebrate();
            routineSong?.Play();
            lighting?.Apply(RoutinePhase.Routine);
            ui.ShowRoutine(SecondsLeft, LyricComposer.Routine(profile, activeHabit));
        }

        public void PauseRoutine()
        {
            if (ActiveSession == null || ActiveSession.Phase != RoutinePhase.Routine || AwaitingParentConfirmation) return;
            IsPaused = true;
            AddEvent(RoutineEventType.RoutinePaused);
            routineSong?.Pause();
        }

        public void ResumeRoutine()
        {
            if (ActiveSession == null || ActiveSession.Phase != RoutinePhase.Routine || AwaitingParentConfirmation) return;
            IsPaused = false;
            AddEvent(RoutineEventType.RoutineResumed);
            routineSong?.UnPause();
        }

        public void MarkRewardViewed()
        {
            if (ActiveSession == null || ActiveSession.Phase != RoutinePhase.Reward) return;
            AddEvent(RoutineEventType.RewardViewed);
        }

        public void ReturnHomeFromRoutine()
        {
            StopSelectedHabitFlow();
            if (ActiveSession != null && ActiveSession.Phase != RoutinePhase.Reward)
            {
                AddEvent(RoutineEventType.RoutineCancelled);
            }

            cueSong?.Stop();
            routineSong?.Stop();
            rewardSound?.Stop();
            IsPaused = false;
            AwaitingParentConfirmation = false;
            elapsed = 0f;
            SecondsLeft = 0;
            ActiveSession = null;
            parentCompletionGate?.Hide();
            sceneDirector?.FocusMainRoom();
            character.PlayAppear();
            lighting?.Apply(RoutinePhase.Cue);
            ui.ShowHome();
        }

        public void ConfirmRoutineCompletedByParent()
        {
            if (ActiveSession == null || !AwaitingParentConfirmation) return;
            CompleteRoutine();
        }

        public void ResumeRoutineAfterParentDecline(int extraSeconds = 30)
        {
            if (ActiveSession == null || !AwaitingParentConfirmation) return;
            AwaitingParentConfirmation = false;
            ActiveSession.Phase = RoutinePhase.Routine;
            SecondsLeft = Mathf.Max(1, extraSeconds);
            elapsed = 0f;
            IsPaused = false;
            AddEvent(RoutineEventType.RoutineResumed);
            if (IsBrushingHabit(activeHabit)) character.PlayCoPerform();
            else character.PlayCelebrate();
            routineSong?.Play();
            lighting?.Apply(RoutinePhase.Routine);
            ui.ShowRoutine(SecondsLeft, LyricComposer.Routine(profile, activeHabit));
        }

        private void RequestParentConfirmation()
        {
            if (ActiveSession == null || AwaitingParentConfirmation) return;
            AwaitingParentConfirmation = true;
            IsPaused = true;
            routineSong?.Stop();
            ui.ShowRoutine(0, LyricComposer.Routine(profile, activeHabit));
            parentCompletionGate?.Show();
        }

        private void CompleteRoutine()
        {
            AwaitingParentConfirmation = false;
            IsPaused = false;
            ActiveSession.Phase = RoutinePhase.Reward;
            ActiveSession.CompletedAtIso = DateTimeOffset.UtcNow.ToString("O");
            ActiveSession.Stars = 2;
            AddEvent(RoutineEventType.RoutineCompleted);
            routineSong?.Stop();
            rewardSound?.Play();
            character.PlayRewardSequence();
            lighting?.Apply(RoutinePhase.Reward);
            confetti?.Play();
            ui.ShowReward(LyricComposer.Reward(profile));
            store?.SaveOrUpdateSession(ActiveSession);
            stampBoard?.Refresh();
        }

        public void SetHabit(HabitTemplate habit)
        {
            activeHabit = habit;
        }

        private IEnumerator SelectedHabitIntro()
        {
            CreateCueSession();
            sceneDirector?.FocusMainRoom();
            character.PlayAppear();
            cueSong?.Play();
            lighting?.Apply(RoutinePhase.Cue);
            ui.ShowCue(IsBrushingHabit(activeHabit)
                ? $"{ProfileName()}야, 양치하러 가볼까?"
                : LyricComposer.Cue(profile, activeHabit));

            if (!IsBrushingHabit(activeHabit))
            {
                yield return new WaitForSeconds(.55f);
                selectedHabitFlow = null;
                BeginRoutine();
                yield break;
            }

            yield return new WaitForSeconds(.55f);
            character.PlayWalk();
            ui.ShowCue($"{ProfileName()}야, 화장실로 같이 가요!");
            if (sceneDirector != null)
            {
                yield return sceneDirector.MoveCharacterOnCurrentStage(Vector3.zero, new Vector3(1.55f, 0f, 0f), 1.55f);
            }
            else
            {
                yield return new WaitForSeconds(1.55f);
            }

            sceneDirector?.Focus(activeHabit);
            ui.ShowCue($"{ProfileName()}야, 도착했어. 같이 이 닦자!");
            character.PlayBeckon();
            yield return new WaitForSeconds(.85f);
            selectedHabitFlow = null;
            BeginRoutine();
        }

        private void CreateCueSession()
        {
            ActiveSession = new RoutineSession
            {
                Id = $"routine-{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}",
                ChildId = profile.Id,
                HabitId = activeHabit.Id,
                StartedAtIso = DateTimeOffset.UtcNow.ToString("O"),
                Phase = RoutinePhase.Cue
            };
            AddEvent(RoutineEventType.SessionStarted);
            AddEvent(RoutineEventType.CueStarted);
        }

        private void StopSelectedHabitFlow(bool clear = true)
        {
            if (selectedHabitFlow == null) return;
            StopCoroutine(selectedHabitFlow);
            if (clear) selectedHabitFlow = null;
        }

        private static bool IsBrushingHabit(HabitTemplate habit)
        {
            return habit != null && habit.Id == "brush";
        }

        private string ProfileName()
        {
            return string.IsNullOrWhiteSpace(profile.Name) ? "친구" : profile.Name;
        }

        private void AddEvent(RoutineEventType type)
        {
            ActiveSession.Events.Add(new RoutineEvent
            {
                Id = $"event-{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}-{type}",
                Type = type,
                AtIso = DateTimeOffset.UtcNow.ToString("O")
            });
        }
    }
}
