namespace LibraryManagementSystem.Server.Services.Exports
{
    // Exporters are injected as a collection, so supporting a new format only needs a new IBookExporter registration.
    public class BookExporterFactory(IEnumerable<IBookExporter> exporters) : IBookExporterFactory
    {
        private readonly Dictionary<ExportFormat, IBookExporter> _exporters = exporters.ToDictionary(e => e.Format);

        public IBookExporter Create(ExportFormat format) =>
            _exporters.TryGetValue(format, out var exporter)
                ? exporter
                : throw new NotSupportedException($"Export format '{format}' is not supported.");
    }
}
