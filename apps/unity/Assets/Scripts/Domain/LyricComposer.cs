namespace HabitBuddy.Domain
{
    public static class LyricComposer
    {
        public static string Cue(ChildProfile profile, HabitTemplate habit)
        {
            var name = string.IsNullOrWhiteSpace(profile.Name) ? "친구" : profile.Name;
            return $"{name}야, {habit.DisplayName} 하러 가볼까?";
        }

        public static string Routine(ChildProfile profile, HabitTemplate habit)
        {
            var name = string.IsNullOrWhiteSpace(profile.Name) ? "친구" : profile.Name;
            var food = string.IsNullOrWhiteSpace(profile.FavoriteFood) ? "좋아하는 간식" : profile.FavoriteFood;
            var friend = string.IsNullOrWhiteSpace(profile.FriendName) ? "동요 친구" : profile.FriendName;
            var dream = profile.DreamIdentity == "기타" ? profile.DreamIdentityCustom : profile.DreamIdentity;
            var sparkle = string.IsNullOrWhiteSpace(dream) ? food : dream;
            var barrier = string.IsNullOrWhiteSpace(profile.HabitBarrier) ? "조금 어려워도" : profile.HabitBarrier;
            return $"{name}야, {habit.ProgressLyric}\n{barrier} 괜찮아\n{sparkle}처럼 반짝반짝\n{friend}와 같이 해봐요";
        }

        public static string Reward(ChildProfile profile)
        {
            var name = string.IsNullOrWhiteSpace(profile.Name) ? "친구" : profile.Name;
            return $"{name}야, 오늘도 해냈어요!";
        }
    }
}
