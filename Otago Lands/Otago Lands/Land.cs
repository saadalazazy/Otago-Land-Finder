namespace Otago_Lands
{
    public class Land
    {
        public string Key { get; set; } = "";

        public DateTime SavedAt { get; set; }

        public Dictionary<string, object?> Fields { get; set; } = new Dictionary<string, object?>();
    }
}
