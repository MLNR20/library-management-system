using System.Text.RegularExpressions;

namespace LibraryManagementSystem.Server.Services
{
    public class NewsImageException(string message) : Exception(message);

    public interface INewsImageStore
    {
        /// <summary>Checks that the upload really is an allowed image, stores it under a new name and returns that name.</summary>
        Task<string> SaveAsync(IFormFile file, CancellationToken cancellationToken = default);

        bool Exists(string fileName);

        /// <summary>The stored file and its content type, or null when there is no such image.</summary>
        (Stream Content, string ContentType)? Open(string fileName);

        void Delete(string fileName);
    }

    // Images live on disk under {content root}/Uploads/news. Files are named with a random id, so a name never reveals or
    // collides with anything, and the format is decided by the file's first bytes, not by what the client claims it is.
    public sealed partial class NewsImageStore(IWebHostEnvironment environment) : INewsImageStore
    {
        public const long MaxBytes = 5 * 1024 * 1024;

        private static readonly Dictionary<string, string> ContentTypes = new()
        {
            ["jpg"] = "image/jpeg",
            ["png"] = "image/png",
            ["gif"] = "image/gif",
            ["webp"] = "image/webp"
        };

        // Raw bytes: a "\x89" in a UTF-8 string literal would become two bytes.
        private static ReadOnlySpan<byte> PngSignature => [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];

        private string Folder => Path.Combine(environment.ContentRootPath, "Uploads", "news");

        // 32 hex characters and an allowed extension: nothing that could climb out of the folder.
        public static bool IsValidName(string? fileName) => fileName is not null && FileNamePattern().IsMatch(fileName);

        /// <summary>The address an image is served from.</summary>
        public static string UrlFor(string fileName) => $"/api/news/images/{fileName}";

        public async Task<string> SaveAsync(IFormFile file, CancellationToken cancellationToken = default)
        {
            if (file.Length == 0)
            {
                throw new NewsImageException("The file is empty.");
            }

            if (file.Length > MaxBytes)
            {
                throw new NewsImageException($"The image must be at most {MaxBytes / (1024 * 1024)} MB.");
            }

            await using var upload = file.OpenReadStream();
            var header = new byte[12];
            var read = await upload.ReadAtLeastAsync(header, header.Length, throwOnEndOfStream: false, cancellationToken);
            var extension = DetectExtension(header.AsSpan(0, read))
                ?? throw new NewsImageException("Upload a JPG, PNG, GIF or WebP image.");

            Directory.CreateDirectory(Folder);
            var fileName = $"{Guid.NewGuid():N}.{extension}";

            upload.Position = 0;
            await using var target = File.Create(Path.Combine(Folder, fileName));
            await upload.CopyToAsync(target, cancellationToken);

            return fileName;
        }

        public bool Exists(string fileName) => IsValidName(fileName) && File.Exists(Path.Combine(Folder, fileName));

        public (Stream Content, string ContentType)? Open(string fileName)
        {
            if (!Exists(fileName))
            {
                return null;
            }

            var stream = File.OpenRead(Path.Combine(Folder, fileName));

            return (stream, ContentTypes[Path.GetExtension(fileName).TrimStart('.')]);
        }

        public void Delete(string fileName)
        {
            if (IsValidName(fileName))
            {
                File.Delete(Path.Combine(Folder, fileName));
            }
        }

        private static string? DetectExtension(ReadOnlySpan<byte> header)
        {
            if (header.Length >= 3 && header[0] == 0xFF && header[1] == 0xD8 && header[2] == 0xFF)
            {
                return "jpg";
            }

            if (header.Length >= 8 && header[..8].SequenceEqual(PngSignature))
            {
                return "png";
            }

            if (header.Length >= 6 && (header[..6].SequenceEqual("GIF87a"u8) || header[..6].SequenceEqual("GIF89a"u8)))
            {
                return "gif";
            }

            if (header.Length >= 12 && header[..4].SequenceEqual("RIFF"u8) && header.Slice(8, 4).SequenceEqual("WEBP"u8))
            {
                return "webp";
            }

            return null;
        }

        [GeneratedRegex("^[0-9a-f]{32}\\.(jpg|png|gif|webp)$")]
        private static partial Regex FileNamePattern();
    }
}
