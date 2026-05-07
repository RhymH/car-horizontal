using CarHorizontal.Domain.Entities.Messaging;
using CarHorizontal.Domain.Entities.Reminders;
using CarHorizontal.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace CarHorizontal.Api.Jobs;

/// <summary>
/// T101 — Dispatch due reminders.
/// Selects every <see cref="ReminderStatus.Scheduled"/> reminder whose
/// <c>ScheduledAt</c> is in the past, resolves the message body (template or
/// resolved fallback), invokes the messaging dispatcher (NoOp until Phase 9
/// wires up real SMS/Email senders) and records the outcome on both the
/// <see cref="Reminder"/> and the <see cref="MessageLog"/>.
/// </summary>
public class DispatchDueRemindersJob
{
    private readonly AppDbContext _db;
    private readonly ILogger<DispatchDueRemindersJob> _logger;

    public DispatchDueRemindersJob(AppDbContext db, ILogger<DispatchDueRemindersJob> logger)
    {
        _db = db;
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

                if (string.IsNullOrWhiteSpace(recipient))
                {
                    reminder.Status = ReminderStatus.Failed;
                    reminder.FailureReason = "Customer has no contact for the chosen channel.";
                    failed++;
                }
                else
                {
                    // NoOp dispatch — Phase 9 (T090) will plug in real senders here.
                    reminder.Status = ReminderStatus.Sent;
                    reminder.SentAt = DateTime.UtcNow;
                    reminder.FailureReason = null;
                    sent++;
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
                    Status = reminder.Status == ReminderStatus.Sent ? MessageStatus.Sent : MessageStatus.Failed,
                    ProviderMessageId = reminder.Status == ReminderStatus.Sent ? $"noop:{reminder.Id}" : null,
                    SentAt = DateTime.UtcNow,
                    ErrorMessage = reminder.FailureReason
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
