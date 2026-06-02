using System.Collections;
using UnityEngine;

namespace HabitBuddy.World
{
    public sealed class RewardConfettiController : MonoBehaviour
    {
        [SerializeField] private Material confettiMaterial;

        public void Play()
        {
            StartCoroutine(Spawn());
        }

        private IEnumerator Spawn()
        {
            for (var i = 0; i < 18; i++)
            {
                var piece = GameObject.CreatePrimitive(PrimitiveType.Cube);
                piece.name = "Confetti";
                piece.transform.position = new Vector3(Random.Range(-1.5f, 1.5f), 3f, Random.Range(-.6f, .6f));
                piece.transform.localScale = Vector3.one * .08f;
                piece.GetComponent<Renderer>().material = confettiMaterial;
                var body = piece.AddComponent<Rigidbody>();
                body.angularVelocity = Random.insideUnitSphere * 8f;
                Destroy(piece, 2.4f);
                yield return new WaitForSeconds(.04f);
            }
        }
    }
}
