using UnityEngine;

namespace HabitBuddy.Audio
{
    public static class PrototypeAudioFactory
    {
        public static AudioClip CreateCueClip() => CreateClip("Cue", new[] { 523.25f, 659.25f, 783.99f, 659.25f }, .24f);
        public static AudioClip CreateRoutineClip() => CreateClip("Routine", new[] { 392f, 440f, 523.25f, 587.33f, 523.25f, 440f }, .25f);
        public static AudioClip CreateRewardClip() => CreateClip("Reward", new[] { 523.25f, 659.25f, 783.99f, 1046.5f, 783.99f }, .17f);

        private static AudioClip CreateClip(string name, float[] tones, float secondsPerTone)
        {
            const int sampleRate = 44100;
            var totalSeconds = secondsPerTone * tones.Length;
            var samples = Mathf.CeilToInt(sampleRate * totalSeconds);
            var data = new float[samples];
            for (var i = 0; i < samples; i++)
            {
                var t = i / (float)sampleRate;
                var toneIndex = Mathf.Min(tones.Length - 1, Mathf.FloorToInt(t / secondsPerTone));
                var localT = t - toneIndex * secondsPerTone;
                var envelope = Mathf.Sin(Mathf.Clamp01(localT / secondsPerTone) * Mathf.PI);
                data[i] = Mathf.Sin(2 * Mathf.PI * tones[toneIndex] * t) * .18f * envelope;
            }
            var clip = AudioClip.Create(name, samples, 1, sampleRate, false);
            clip.SetData(data, 0);
            return clip;
        }
    }
}
