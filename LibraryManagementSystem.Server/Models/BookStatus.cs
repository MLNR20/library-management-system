namespace LibraryManagementSystem.Server.Models
{
    // Stored as a number: add new values at the end.
    public enum BookStatus
    {
        Available,
        Borrowed,
        Reserved,
        Lost,
        Damaged,

        // The borrower says it is back; a librarian has yet to approve the return.
        ReturnPending
    }
}
