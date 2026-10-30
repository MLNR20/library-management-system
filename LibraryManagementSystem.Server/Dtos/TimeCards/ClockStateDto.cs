namespace LibraryManagementSystem.Server.Dtos.TimeCards
{
    public record ClockEntryDto(Guid Id, DateTime ClockInUtc, DateTime? ClockOutUtc);

    // One day on one user's time card. Hours/minutes only cover finished entries; IsOpen marks a shift still running.
    public record TimeCardDto(
        Guid Id,
        string UserId,
        string UserName,
        DateOnly Date,
        int TotalHours,
        int TotalMinutes,
        bool IsOpen,
        IReadOnlyList<ClockEntryDto> Entries);

    // IsClockedIn is true while an entry has no clock-out. TodayHours/TodayMinutes only cover finished entries;
    // the open one (ClockedInAtUtc) is added by the caller so the total can tick live.
    public record ClockStateDto(
        bool IsClockedIn,
        DateTime? ClockedInAtUtc,
        int TodayHours,
        int TodayMinutes,
        IReadOnlyList<ClockEntryDto> TodayEntries);
}
