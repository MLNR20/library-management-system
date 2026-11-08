using LibraryManagementSystem.Server.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.FileProviders;

namespace LibraryManagementSystem.Server.Tests.Services
{
    public sealed class NewsImageStoreTests : IDisposable
    {
        private readonly string root = Path.Combine(Path.GetTempPath(), "news-images-" + Guid.NewGuid().ToString("N"));
        private readonly NewsImageStore store;

        public NewsImageStoreTests()
        {
            Directory.CreateDirectory(root);
            store = new NewsImageStore(new TestEnvironment(root));
        }

        public void Dispose() => Directory.Delete(root, recursive: true);

        private static FormFile Upload(byte[] bytes) =>
            new(new MemoryStream(bytes), 0, bytes.Length, "file", "whatever.bin");

        private static byte[] WithPadding(params byte[] header) => [.. header, .. new byte[32]];

        [Theory]
        [InlineData(new byte[] { 0xFF, 0xD8, 0xFF, 0xE0 }, ".jpg", "image/jpeg")]
        [InlineData(new byte[] { 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A }, ".png", "image/png")]
        [InlineData(new byte[] { 0x47, 0x49, 0x46, 0x38, 0x39, 0x61 }, ".gif", "image/gif")]
        public async Task A_real_image_is_stored_under_a_new_name_and_can_be_opened(byte[] header, string extension, string contentType)
        {
            var name = await store.SaveAsync(Upload(WithPadding(header)));

            Assert.EndsWith(extension, name);
            Assert.True(NewsImageStore.IsValidName(name));
            Assert.True(store.Exists(name));
            var (content, openedType) = store.Open(name)!.Value;
            await using (content)
            {
                Assert.Equal(contentType, openedType);
            }
        }

        [Fact]
        public async Task A_webp_image_is_recognised()
        {
            byte[] header = [.. "RIFF"u8, 0, 0, 0, 0, .. "WEBP"u8];

            var name = await store.SaveAsync(Upload(WithPadding(header)));

            Assert.EndsWith(".webp", name);
        }

        [Fact]
        public async Task A_file_that_is_not_an_image_is_refused_whatever_its_name_says()
        {
            await Assert.ThrowsAsync<NewsImageException>(() => store.SaveAsync(Upload("<script>alert(1)</script>"u8.ToArray())));
        }

        [Fact]
        public async Task An_empty_file_is_refused()
        {
            await Assert.ThrowsAsync<NewsImageException>(() => store.SaveAsync(Upload([])));
        }

        [Fact]
        public async Task A_file_over_the_size_limit_is_refused()
        {
            var tooBig = WithPadding(0xFF, 0xD8, 0xFF).Concat(new byte[NewsImageStore.MaxBytes]).ToArray();

            await Assert.ThrowsAsync<NewsImageException>(() => store.SaveAsync(Upload(tooBig)));
        }

        [Theory]
        [InlineData("../secret.png")]
        [InlineData("..\\secret.png")]
        [InlineData("abc.png")]
        [InlineData("0123456789abcdef0123456789abcdef.exe")]
        [InlineData(null)]
        public void Names_that_could_leave_the_folder_are_not_valid(string? name)
        {
            Assert.False(NewsImageStore.IsValidName(name));
            Assert.False(store.Exists(name ?? string.Empty));
            Assert.Null(store.Open(name ?? string.Empty));
        }

        [Fact]
        public async Task A_deleted_image_is_gone()
        {
            var name = await store.SaveAsync(Upload(WithPadding(0xFF, 0xD8, 0xFF)));

            store.Delete(name);

            Assert.False(store.Exists(name));
        }

        private sealed class TestEnvironment(string contentRoot) : Microsoft.AspNetCore.Hosting.IWebHostEnvironment
        {
            public string ApplicationName { get; set; } = "Tests";
            public IFileProvider ContentRootFileProvider { get; set; } = new NullFileProvider();
            public string ContentRootPath { get; set; } = contentRoot;
            public string EnvironmentName { get; set; } = "Test";
            public string WebRootPath { get; set; } = contentRoot;
            public IFileProvider WebRootFileProvider { get; set; } = new NullFileProvider();
        }
    }
}
