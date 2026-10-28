using System.Text.Json;
using Microsoft.AspNetCore.Mvc;

namespace Otago_Lands.Controllers
{
    [ApiController]
    [Route("lands")]
    public class LandsController : ControllerBase
    {
        private static readonly JsonSerializerOptions JsonOptions = new JsonSerializerOptions(JsonSerializerDefaults.Web)
        {
            WriteIndented = true
        };

        private readonly string _folderPath;
        private readonly string _filePath;

        public LandsController(IWebHostEnvironment environment)
        {
            _folderPath = Path.Combine(environment.ContentRootPath, "Data");
            _filePath = Path.Combine(_folderPath, "lands.json");
        }

        [HttpPost]
        public IActionResult Save(List<Land> lands)
        {
            List<Land> savedLands = ReadFile();
            int added = 0;
            int updated = 0;

            foreach (Land land in lands)
            {
                if (string.IsNullOrEmpty(land.Key))
                {
                    return BadRequest("Every land needs a key.");
                }

                land.SavedAt = DateTime.Now;

                int index = FindLand(savedLands, land.Key);
                if (index == -1)
                {
                    savedLands.Add(land);
                    added++;
                }
                else
                {
                    savedLands[index] = land;
                    updated++;
                }
            }

            WriteFile(savedLands);
            return Ok(new { added = added, updated = updated, total = savedLands.Count });
        }

        private int FindLand(List<Land> lands, string key)
        {
            for (int i = 0; i < lands.Count; i++)
            {
                if (lands[i].Key == key)
                {
                    return i;
                }
            }
            return -1;
        }

        private List<Land> ReadFile()
        {
            if (!System.IO.File.Exists(_filePath))
            {
                return new List<Land>();
            }

            string text = System.IO.File.ReadAllText(_filePath);
            if (string.IsNullOrWhiteSpace(text))
            {
                return new List<Land>();
            }

            List<Land>? lands = JsonSerializer.Deserialize<List<Land>>(text, JsonOptions);
            if (lands == null)
            {
                return new List<Land>();
            }
            return lands;
        }

        private void WriteFile(List<Land> lands)
        {
            Directory.CreateDirectory(_folderPath);
            string text = JsonSerializer.Serialize(lands, JsonOptions);
            System.IO.File.WriteAllText(_filePath, text);
        }
    }
}
