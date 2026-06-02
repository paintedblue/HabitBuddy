using UnityEngine;

namespace HabitBuddy.Character
{
    public sealed class CharacterAnimationController : MonoBehaviour
    {
        [SerializeField] private Animator animator;
        [SerializeField] private ProceduralCharacterAnimator proceduralAnimator;
        [SerializeField] private GlbCharacterPresenter glbPresenter;

        private static readonly int Appear = Animator.StringToHash("Appear");
        private static readonly int Walk = Animator.StringToHash("Walk");
        private static readonly int Beckon = Animator.StringToHash("Beckon");
        private static readonly int CoPerform = Animator.StringToHash("CoPerform");
        private static readonly int Celebrate = Animator.StringToHash("Celebrate");

        public void PlayAppear()
        {
            if (glbPresenter != null) glbPresenter.PlayAppear();
            else if (animator != null) animator.SetTrigger(Appear);
            else proceduralAnimator?.PlayAppear();
        }

        public void PlayWalk()
        {
            if (glbPresenter != null) glbPresenter.PlayWalk();
            else if (animator != null) animator.SetTrigger(Walk);
            else proceduralAnimator?.PlayWalk();
        }

        public void PlayBeckon()
        {
            if (glbPresenter != null) glbPresenter.PlayWave();
            else if (animator != null) animator.SetTrigger(Beckon);
            else proceduralAnimator?.PlayBeckon();
        }

        public void PlayCoPerform()
        {
            if (glbPresenter != null) glbPresenter.PlayBrushTeeth();
            else if (animator != null) animator.SetTrigger(CoPerform);
            else proceduralAnimator?.PlayCoPerform();
        }

        public void PlayPraise()
        {
            if (glbPresenter != null) glbPresenter.PlayPraise();
            else PlayBeckon();
        }

        public void PlayCelebrate()
        {
            if (glbPresenter != null) glbPresenter.PlayCelebrate();
            else if (animator != null) animator.SetTrigger(Celebrate);
            else proceduralAnimator?.PlayCelebrate();
        }

        public void PlayRewardSequence()
        {
            if (glbPresenter != null) glbPresenter.PlayRewardSequence();
            else PlayCelebrate();
        }
    }
}
