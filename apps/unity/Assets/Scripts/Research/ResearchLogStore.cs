using System.Collections.Generic;
using HabitBuddy.Domain;
using UnityEngine;

namespace HabitBuddy.Research
{
    public sealed class ResearchLogStore : MonoBehaviour
    {
        private const string SessionsKey = "routine_sessions";
        private const string NotesKey = "observer_notes";

        public void SaveSession(RoutineSession session)
        {
            var sessions = LoadSessions();
            sessions.Add(session);
            PlayerPrefs.SetString(SessionsKey, JsonUtility.ToJson(new RoutineSessionCollection { Items = sessions }));
        }

        public void SaveOrUpdateSession(RoutineSession session)
        {
            if (session == null) return;
            var sessions = LoadSessions();
            var index = sessions.FindIndex(item => item != null && item.Id == session.Id);
            if (index >= 0) sessions[index] = session;
            else sessions.Add(session);
            PlayerPrefs.SetString(SessionsKey, JsonUtility.ToJson(new RoutineSessionCollection { Items = sessions }));
        }

        public void SaveObserverNote(ObserverNote note)
        {
            var notes = LoadObserverNotes();
            notes.Add(note);
            PlayerPrefs.SetString(NotesKey, JsonUtility.ToJson(new ObserverNoteCollection { Items = notes }));
        }

        public List<RoutineSession> LoadSessions()
        {
            var raw = PlayerPrefs.GetString(SessionsKey, "");
            return string.IsNullOrWhiteSpace(raw)
                ? new List<RoutineSession>()
                : JsonUtility.FromJson<RoutineSessionCollection>(raw).Items;
        }

        public List<ObserverNote> LoadObserverNotes()
        {
            var raw = PlayerPrefs.GetString(NotesKey, "");
            return string.IsNullOrWhiteSpace(raw)
                ? new List<ObserverNote>()
                : JsonUtility.FromJson<ObserverNoteCollection>(raw).Items;
        }

        [System.Serializable]
        private sealed class RoutineSessionCollection
        {
            public List<RoutineSession> Items = new();
        }

        [System.Serializable]
        private sealed class ObserverNoteCollection
        {
            public List<ObserverNote> Items = new();
        }
    }
}
