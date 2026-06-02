using System.Collections;
using UnityEngine;

namespace HabitBuddy.Character
{
    [RequireComponent(typeof(ProceduralCharacterBuilder))]
    public sealed class ProceduralCharacterAnimator : MonoBehaviour
    {
        [SerializeField] private float walkDistance = 4.2f;
        [SerializeField] private float walkDuration = 3f;

        private ProceduralCharacterBuilder builder;
        private Coroutine current;
        private Vector3 initialPosition;

        private void Awake()
        {
            builder = GetComponent<ProceduralCharacterBuilder>();
            initialPosition = transform.position;
        }

        public void PlayAppear()
        {
            Replace(Appear());
        }

        public void PlayWalk()
        {
            Replace(Walk());
        }

        public void PlayBeckon()
        {
            Replace(Beckon());
        }

        public void PlayCoPerform()
        {
            Replace(Brush());
        }

        public void PlayCelebrate()
        {
            Replace(Celebrate());
        }

        private void Replace(IEnumerator routine)
        {
            if (current != null) StopCoroutine(current);
            current = StartCoroutine(routine);
        }

        private IEnumerator Appear()
        {
            transform.position = initialPosition + Vector3.left * 2f;
            var elapsed = 0f;
            while (elapsed < 1f)
            {
                elapsed += Time.deltaTime;
                transform.position = Vector3.Lerp(initialPosition + Vector3.left * 2f, initialPosition, elapsed);
                yield return null;
            }
        }

        private IEnumerator Walk()
        {
            var start = transform.position;
            var end = start + Vector3.right * walkDistance;
            var elapsed = 0f;
            while (elapsed < walkDuration)
            {
                elapsed += Time.deltaTime;
                var t = elapsed / walkDuration;
                transform.position = Vector3.Lerp(start, end, t);
                var swing = Mathf.Sin(elapsed * 8f) * 28f;
                Rotate(builder.LeftLeg, swing);
                Rotate(builder.RightLeg, -swing);
                Rotate(builder.LeftArm, -swing);
                Rotate(builder.RightArm, swing);
                yield return null;
            }
            ResetLimbs();
        }

        private IEnumerator Beckon()
        {
            for (var i = 0; i < 4; i++)
            {
                if (builder.RightArm != null) builder.RightArm.localRotation = Quaternion.Euler(-55, 0, 25);
                yield return new WaitForSeconds(.22f);
                if (builder.RightArm != null) builder.RightArm.localRotation = Quaternion.Euler(-15, 0, -12);
                yield return new WaitForSeconds(.22f);
            }
            ResetLimbs();
        }

        private IEnumerator Brush()
        {
            while (true)
            {
                var angle = Mathf.Sin(Time.time * 10f) * 22f;
                if (builder.RightArm != null) builder.RightArm.localRotation = Quaternion.Euler(-68 + angle, 0, 18);
                if (builder.Toothbrush != null) builder.Toothbrush.localRotation = Quaternion.Euler(0, 0, 18 + angle);
                yield return null;
            }
        }

        private IEnumerator Celebrate()
        {
            var elapsed = 0f;
            while (elapsed < 2.2f)
            {
                elapsed += Time.deltaTime;
                var bounce = Mathf.Abs(Mathf.Sin(elapsed * 7f)) * .35f;
                transform.position = new Vector3(transform.position.x, initialPosition.y + bounce, transform.position.z);
                if (builder.LeftArm != null) builder.LeftArm.localRotation = Quaternion.Euler(-120, 0, -18);
                if (builder.RightArm != null) builder.RightArm.localRotation = Quaternion.Euler(-120, 0, 18);
                yield return null;
            }
            transform.position = new Vector3(transform.position.x, initialPosition.y, transform.position.z);
            ResetLimbs();
        }

        private void ResetLimbs()
        {
            if (builder.LeftArm != null) builder.LeftArm.localRotation = Quaternion.identity;
            if (builder.RightArm != null) builder.RightArm.localRotation = Quaternion.identity;
            if (builder.LeftLeg != null) builder.LeftLeg.localRotation = Quaternion.identity;
            if (builder.RightLeg != null) builder.RightLeg.localRotation = Quaternion.identity;
        }

        private static void Rotate(Transform target, float xAngle)
        {
            if (target != null) target.localRotation = Quaternion.Euler(xAngle, 0, 0);
        }
    }
}
