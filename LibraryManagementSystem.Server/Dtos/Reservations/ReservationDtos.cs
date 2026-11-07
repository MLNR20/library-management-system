using LibraryManagementSystem.Server.Models;

namespace LibraryManagementSystem.Server.Dtos.Reservations
{
    public record StudyTableDto(Guid Id, string Name, int Seats, bool IsActive, Guid? SectionId, string? SectionName);

    // SectionId, when given, must be a reading room.
    public record StudyTableRequest(string Name, int Seats, bool IsActive, Guid? SectionId);

    public record TableReservationDto(
        Guid Id,
        Guid TableId,
        string TableName,
        string? SectionName,
        string UserId,
        string UserName,
        DateTime StartUtc,
        DateTime EndUtc,
        string? Note,
        ReservationStatus Status,
        DateTime RequestedAtUtc,
        DateTime? DecidedAtUtc,
        string? DecidedByName,
        string? DecisionNote);

    // Times are UTC instants; the browser converts from the student's local date and time.
    public record TableReservationRequest(Guid TableId, DateTime StartUtc, DateTime EndUtc, string? Note);

    public record RejectReservationRequest(string? Reason);
}
