using CarHorizontal.Domain.Entities.Timeline;

namespace CarHorizontal.Domain.Timeline.Rules;

public interface IRule
{
    string Code { get; }
    bool Applies(RuleContext context);
    IEnumerable<TimelineEvent> Generate(RuleContext context);
}
