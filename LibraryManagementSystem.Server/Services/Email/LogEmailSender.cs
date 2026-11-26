namespace LibraryManagementSystem.Server.Services.Email
{
    // Used while no SMTP server is configured.
    public class LogEmailSender(IHostEnvironment environment, ILogger<LogEmailSender> logger) : IEmailSender
    {
        public Task SendAsync(EmailMessage message, CancellationToken cancellationToken = default)
        {
            // The body can hold a password reset link, which is as good as the password: only a developer's own log may show it.
            if (environment.IsDevelopment())
            {
                logger.LogInformation(
                    "Email is not set up, so this message was not sent.\nTo: {To}\nSubject: {Subject}\n\n{Body}",
                    message.To, message.Subject, message.Body);
            }
            else
            {
                logger.LogWarning("Email is not set up (Email:Host is empty); \"{Subject}\" was not sent", message.Subject);
            }

            return Task.CompletedTask;
        }
    }
}
