using System.IO;
using UnityEngine;

namespace BarGame.Core
{
    public static class SaveSystem
    {
        const string FileName = "save.json";

        static string SavePath => Path.Combine(Application.persistentDataPath, FileName);

        public static void Save(GameState state)
        {
            var json = JsonUtility.ToJson(state, prettyPrint: true);
            File.WriteAllText(SavePath, json);
        }

        public static GameState Load()
        {
            if (!File.Exists(SavePath)) return null;
            var json = File.ReadAllText(SavePath);
            return JsonUtility.FromJson<GameState>(json);
        }

        public static void Delete()
        {
            if (File.Exists(SavePath)) File.Delete(SavePath);
        }

        public static bool Exists => File.Exists(SavePath);
    }
}
