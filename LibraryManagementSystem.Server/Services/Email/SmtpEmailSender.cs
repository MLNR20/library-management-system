using System.Net;
using System.Net.Mail;
using LibraryManagementSystem.Server.Settings;
using Microsoft.Extensions.Options;

namespace LibraryManagementSystem.Server.Services.Email
{
    public class SmtpEmailSender(IOptions<EmailSettings> options) : IEmailSender
    {
        public async Task SendAsync(EmailMessage message, CancellationToken cancellationToken = default)
        {
            var settings = options.Value;

            using var client = new SmtpClient(settings.Host, settings.Port) { EnableSsl = settings.EnableSsl };
            if (!string.IsNullOrEmpty(settings.UserName))
            {
                client.Credentials = new NetworkCredential(settings.UserName, settings.Password);
            }

            using var mail = new MailMessage(
                new MailAddress(settings.FromAddress, settings.FromName), new MailAddress(message.To))
            {
                Subject = message.Subject,
                Body = message.Body
            };

            await client.SendMailAsync(mail, cancellationToken);
        }
    }
}
