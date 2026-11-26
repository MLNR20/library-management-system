using System.Threading.Channels;

namespace LibraryManagementSystem.Server.Services.Email
{
    public interface IEmailQueue
    {
        // Returns at once; the message is sent in the background.
        void Enqueue(EmailMessage message);
    }

    // Sending happens outside the request. A mail server takes seconds to answer, so sending inline would be slow and, on
    // "forgot password", would reveal by its timing which addresses have an account. Queued mail is lost if the app stops;
    // the person can simply ask again.
    public class EmailQueue(IEmailSender sender, ILogger<EmailQueue> logger) : BackgroundService, IEmailQueue
    {
        private readonly Channel<EmailMessage> channel = Channel.CreateBounded<EmailMessage>(
            new BoundedChannelOptions(500) { FullMode = BoundedChannelFullMode.Wait, SingleReader = true });

        public void Enqueue(EmailMessage message)
        {
            if (!channel.Writer.TryWrite(message))
            {
                logger.LogError("The email queue is full; \"{Subject}\" was dropped", message.Subject);
            }
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            await foreach (var message in channel.Reader.ReadAllAsync(stoppingToken))
            {
                try
                {
                    await sender.SendAsync(message, stoppingToken);
                }
                catch (Exception ex) when (ex is not OperationCanceledException)
                {
                    logger.LogError(ex, "Could not send \"{Subject}\"", message.Subject);
                }
            }
        }
    }
}
