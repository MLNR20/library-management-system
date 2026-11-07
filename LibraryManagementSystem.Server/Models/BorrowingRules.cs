using System.Linq.Expressions;

namespace LibraryManagementSystem.Server.Models
{
    // The single definition of "overdue". The same expression is compiled for in-memory loans (Borrowing.IsOverdue)
    // and translated to SQL for queries (BorrowingService), so the two can never drift apart.
    public static class BorrowingRules
    {
        // A loan is overdue when the moment it ended (its return time, or asOf while still open) is after its due date.
        private static readonly Expression<Func<Borrowing, DateTime, bool>> IsOverdueExpression =
            (borrowing, asOfUtc) => (borrowing.ReturnedAtUtc ?? asOfUtc) > borrowing.DueAtUtc;

        // Still out and past its due date: the loans whose penalty is still growing.
        private static readonly Expression<Func<Borrowing, DateTime, bool>> IsOpenOverdueExpression =
            (borrowing, asOfUtc) => borrowing.ReturnedAtUtc == null && borrowing.DueAtUtc < asOfUtc;

        private static readonly Func<Borrowing, DateTime, bool> IsOverdueCompiled = IsOverdueExpression.Compile();

        public static bool IsOverdue(Borrowing borrowing, DateTime asOfUtc) => IsOverdueCompiled(borrowing, asOfUtc);

        // For queries: late whether returned late or still out past the due date.
        public static Expression<Func<Borrowing, bool>> Overdue(DateTime asOfUtc) => Bind(IsOverdueExpression, asOfUtc);

        // For queries: past the due date and not yet returned.
        public static Expression<Func<Borrowing, bool>> OpenOverdue(DateTime asOfUtc) => Bind(IsOpenOverdueExpression, asOfUtc);

        // Turns (loan, asOf) => ... into loan => ... with asOf held in a closure, which EF sends as a SQL parameter.
        private static Expression<Func<Borrowing, bool>> Bind(Expression<Func<Borrowing, DateTime, bool>> source, DateTime asOfUtc)
        {
            var asOf = Expression.Property(Expression.Constant(new AsOf(asOfUtc)), nameof(AsOf.Value));
            var body = new ParameterReplacer(source.Parameters[1], asOf).Visit(source.Body);

            return Expression.Lambda<Func<Borrowing, bool>>(body, source.Parameters[0]);
        }

        private sealed record AsOf(DateTime Value);

        private sealed class ParameterReplacer(ParameterExpression target, Expression replacement) : ExpressionVisitor
        {
            protected override Expression VisitParameter(ParameterExpression node) => node == target ? replacement : node;
        }
    }
}
