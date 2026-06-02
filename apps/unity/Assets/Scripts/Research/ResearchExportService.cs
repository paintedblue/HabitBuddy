using System.IO;
using System.Text;
using UnityEngine;

namespace HabitBuddy.Research
{
    public sealed class ResearchExportService : MonoBehaviour
    {
        [SerializeField] private ResearchLogStore store;

        public string ExportCsv()
        {
            var path = Path.Combine(Application.persistentDataPath, "habitbuddy-research-export.csv");
            var csv = new StringBuilder();
            csv.AppendLine("kind,id,session_id,habit_id,event_type,at,parent_prompt_count,engagement,left_routine,note");

            foreach (var session in store.LoadSessions())
            {
                foreach (var evt in session.Events)
                {
                    csv.AppendLine($"event,{evt.Id},{session.Id},{session.HabitId},{evt.Type},{evt.AtIso},,,,");
                }
            }

            foreach (var note in store.LoadObserverNotes())
            {
                var safeNote = note.Note.Replace("\"", "\"\"");
                csv.AppendLine($"note,{note.Id},{note.SessionId},,,{note.CreatedAtIso},{note.ParentPromptCount},{note.Engagement},{note.LeftRoutine},\"{safeNote}\"");
            }

            File.WriteAllText(path, csv.ToString());
            return path;
        }
    }
}
