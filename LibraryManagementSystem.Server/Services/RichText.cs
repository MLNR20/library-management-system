using System.Text.RegularExpressions;
using Ganss.Xss;

namespace LibraryManagementSystem.Server.Services
{
    // The rich text editor sends HTML; only the formatting it can produce is kept, so a message can never carry script.
    public static partial class RichText
    {
        private static readonly string[] AllowedTags =
            ["p", "br", "strong", "em", "u", "s", "h2", "h3", "ul", "ol", "li", "blockquote", "a"];

        public static string Sanitize(string html)
        {
            var sanitizer = new HtmlSanitizer();
            sanitizer.AllowedTags.Clear();
            foreach (var tag in AllowedTags)
            {
                sanitizer.AllowedTags.Add(tag);
            }

            sanitizer.AllowedAttributes.Clear();
            sanitizer.AllowedAttributes.Add("href");
            sanitizer.AllowedSchemes.Clear();
            sanitizer.AllowedSchemes.Add("http");
            sanitizer.AllowedSchemes.Add("https");
            sanitizer.AllowedSchemes.Add("mailto");

            return sanitizer.Sanitize(html).Trim();
        }

        // What a reader would see, without the markup; empty for an editor that only holds an empty paragraph.
        public static string ToPlainText(string html) => WhitespaceRegex().Replace(TagRegex().Replace(html, " "), " ").Trim();

        [GeneratedRegex("<[^>]*>")]
        private static partial Regex TagRegex();

        [GeneratedRegex(@"\s+")]
        private static partial Regex WhitespaceRegex();
    }
}
