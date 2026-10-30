namespace LibraryManagementSystem.Server.Services.Exports
{
    public interface IBookExporterFactory
    {
        // Throws NotSupportedException when no exporter is registered for the format.
        IBookExporter Create(ExportFormat format);
    }
}
