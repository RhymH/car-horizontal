using CarHorizontal.Domain.Entities.Messaging;
using CarHorizontal.Domain.Entities.Reminders;
using CarHorizontal.Domain.Messaging;
using CarHorizontal.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace CarHorizontal.Api.Jobs;

/// <summary>
/// T101 — Dispatch due reminders.
/// Selects every <see cref="ReminderStatus.Scheduled"/> reminder whose
/// <c>ScheduledAt</c> is in the past, resolves the message body (template or
/// resolved fallback), hands it to the <see cref="IMessageDispatcher"/> and
/// records the <em>actual</em> outcome on both the <see cref="Reminder"/> and
/// the <see cref="MessageLog"/>. Status is derived from the delivery result —
/// a reminder is never marked Sent unless a sender reported success.
/// </summary>
public class DispatchDueRemindersJob
{
    private readonly AppDbContext _db;
    private readonly IMessageDispatcher _dispatcher;
    private readonly ILogger<DispatchDueRemindersJob> _logger;

    public DispatchDueRemindersJob(
        AppDbContext db,
        IMessageDispatcher dispatcher,
        ILogger<DispatchDueRemindersJob> logger)
    {
        _db = db;
        _dispatcher = dispatcher;
        _logger = logger;
    }

    public async Task RunAsync(CancellationToken ct = default)
    {
        var now = DateTime.UtcNow;

        var due = await _db.Reminders
            .Where(r => r.Status == ReminderStatus.Scheduled && r.ScheduledAt <= now)
            .OrderBy(r => r.ScheduledAt)
            .Take(500)
            .ToListAsync(ct);

        if (due.Count == 0)
        {
            _logger.LogDebug("No due reminders to dispatch at {Now:O}.", now);
            return;
        }

        var sent = 0;
        var failed = 0;

        foreach (var reminder in due)
        {
            try
            {
                var (recipient, subject, body) = await ResolveMessageAsync(reminder, ct);

                var result = await _dispatcher.DispatchAsync(
                    reminder.Channel, recipient, subject, body, ct);

                if (result.Success)
                {
                    reminder.Status = ReminderStatus.Sent;
                    reminder.SentAt = DateTime.UtcNow;
                    reminder.FailureReason = null;
                    sent++;
                }
                else
                {
                    reminder.Status = ReminderStatus.Failed;
                    reminder.FailureReason = result.ErrorMessage;
                    failed++;
                }

                _db.MessageLogs.Add(new MessageLog
                {
                    OrganizationId = reminder.OrganizationId,
                    CustomerId = reminder.CustomerId,
                    ReminderId = reminder.Id,
                    Channel = reminder.Channel,
                    Recipient = recipient ?? string.Empty,
                    Subject = subject,
                    Body = body,
                    Status = result.Success ? MessageStatus.Sent : MessageStatus.Failed,
                    ProviderMessageId = result.ProviderMessageId,
                    SentAt = DateTime.UtcNow,
                    ErrorMessage = result.ErrorMessage
                });
            }
            catch (Exception ex)
            {
                reminder.Status = ReminderStatus.Failed;
                reminder.FailureReason = ex.Message;
                failed++;
                _logger.LogError(ex, "Failed to dispatch reminder {ReminderId}", reminder.Id);
            }
        }

        await _db.SaveChangesAsync(ct);

        _logger.LogInformation(
            "DispatchDueRemindersJob processed {Total} reminders ({Sent} sent, {Failed} failed).",
            due.Count, sent, failed);
    }

    private async Task<(string? Recipient, string? Subject, string Body)> ResolveMessageAsync(
        Reminder reminder,
        CancellationToken ct)
    {
        var customer = await _db.Customers
            .Where(c => c.Id == reminder.CustomerId)
            .Select(c => new { c.FullName, c.Email, c.Phone })
            .FirstOrDefaultAsync(ct);

        var recipient = reminder.Channel switch
        {
            MessageChannel.Email => customer?.Email,
            MessageChannel.Sms => customer?.Phone,
            _ => null
        };

        if (!string.IsNullOrWhiteSpace(reminder.ResolvedBody))
        {
            return (recipient, reminder.ResolvedSubject, reminder.ResolvedBody);
        }

        if (reminder.TemplateId.HasValue)
        {
            var template = await _db.MessageTemplates
                .Where(t => t.Id == reminder.TemplateId.Value && t.Active)
                .Select(t => new { t.Subject, t.Body })
                .FirstOrDefaultAsync(ct);
            if (template is not null)
            {
                return (recipient, template.Subject, template.Body);
            }
        }

        var fallbackSubject = reminder.Channel == MessageChannel.Email ? "Rappel CarHorizontal" : null;
        var fallbackBody = !string.IsNullOrWhiteSpace(customer?.FullName)
            ? $"Bonjour {customer!.FullName}, un rappel d'entretien arrive à échéance."
            : "Un rappel d'entretien arrive à échéance.";

        return (recipient, fallbackSubject, fallbackBody);
    }
}
